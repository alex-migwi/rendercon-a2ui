import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { timingSafeEqual } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { getGenAIFunctionDeclarations, TASKFLOW_TOOLS } from './src/lib/tools.js';
import { executeDirectTool } from './src/lib/tool-execution.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function zodTypeForProperty(property: {
  type: string;
  enum?: string[];
  items?: { type: string; description?: string };
}): z.ZodType {
  if (property.enum?.length) {
    return z.enum(property.enum as [string, ...string[]]);
  }
  switch (property.type) {
    case 'string':
      return z.string();
    case 'boolean':
      return z.boolean();
    case 'number':
    case 'integer':
      return z.number();
    case 'array':
      return z.array(zodTypeForProperty(property.items || { type: 'unknown' }));
    case 'object':
      return z.object({}).passthrough();
    default:
      return z.unknown();
  }
}

function createTaskFlowMcpServer(): McpServer {
  const server = new McpServer({ name: 'taskflow', version: '1.0.0' });

  for (const tool of TASKFLOW_TOOLS) {
    const required = new Set(tool.parameters.required || []);
    const shape: Record<string, z.ZodType> = {};
    for (const [name, property] of Object.entries(tool.parameters.properties)) {
      const propertySchema = zodTypeForProperty(property);
      shape[name] = required.has(name) ? propertySchema : propertySchema.optional();
    }

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: shape,
      },
      async (args: Record<string, any>) => {
        const { result } = await executeDirectTool(tool.name, args as Record<string, any>);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) ?? 'null' }],
          ...(result && typeof result === 'object' ? { structuredContent: result } : {}),
          ...(result?.success === false || result?.error ? { isError: true } : {}),
        };
      }
    );
  }

  return server;
}

const mcpHandler = createMcpHandler(() => createTaskFlowMcpServer(), {
  legacy: 'stateless',
  onerror: (error) => console.error('MCP request error:', error),
});

function hasValidMcpAccess(req: import('express').Request): boolean {
  const configuredToken = process.env.MCP_AUTH_TOKEN;
  if (configuredToken) {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match) return false;

    const provided = Buffer.from(match[1]);
    const expected = Buffer.from(configuredToken);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  const address = req.socket.remoteAddress || '';
  const isLoopback =
    address === '::1' ||
    address === '127.0.0.1' ||
    address.startsWith('::ffff:127.');
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(req.hostname.toLowerCase());
  return isLoopback && isLocalHost;
}

app.all('/mcp', async (req, res) => {
  if (!hasValidMcpAccess(req)) {
    if (process.env.MCP_AUTH_TOKEN) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(401).json({ error: 'A valid MCP bearer token is required' });
    } else {
      res.status(403).json({
        error: 'MCP is restricted to localhost unless MCP_AUTH_TOKEN is configured',
      });
    }
    return;
  }

  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (
        value === undefined ||
        ['host', 'connection', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())
      ) {
        continue;
      }
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }

    const hasBody = req.body !== undefined && !['GET', 'HEAD'].includes(req.method);
    const request = new Request(new URL(req.originalUrl, `http://${req.get('host') || 'localhost'}`), {
      method: req.method,
      headers,
      ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
    });
    const response = await mcpHandler.fetch(request, { parsedBody: req.body });
    res.status(response.status);
    response.headers.forEach((value, name) => res.setHeader(name, value));

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('MCP endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process MCP request' });
    } else {
      res.end();
    }
  }
});

// Initialize Google Gemini Client with secure backend key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function callWithTimeout<T>(fn: () => Promise<T>, timeoutMs = 8000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    ),
  ]);
}

// Helper for transient 503 / rate-limit resilience
async function callWithRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1000): Promise<T> {
  try {
    return await callWithTimeout(fn, 8000);
  } catch (err: any) {
    if (
      retries > 0 &&
      (err?.message?.includes('503') ||
        err?.message?.includes('429') ||
        err?.message?.includes('demand') ||
        err?.message?.includes('timed out') ||
        err?.message?.includes('UNAVAILABLE'))
    ) {
      await new Promise((r) => setTimeout(r, delayMs));
      return callWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

/**
 * Offline intent resolver fallback used when API quota is exhausted or offline.
 */
function resolveOfflineIntent(message: string): { toolCall: { name: string; args: any }; text: string } {
  const msgLower = message.toLowerCase();

  if (msgLower.includes('subtask')) {
    const isCompleted = msgLower.includes('complete') || msgLower.includes('check') || msgLower.includes('done');
    const subtaskMatch = message.match(/subtask\s+([a-zA-Z0-9_\-]+)/i);
    const todoMatch = message.match(/task\s+([a-zA-Z0-9_\-]+)/i);
    return {
      toolCall: {
        name: 'update_subtask',
        args: {
          todoId: todoMatch ? todoMatch[1] : undefined,
          subtaskId: subtaskMatch ? subtaskMatch[1] : message,
          completed: isCompleted,
        },
      },
      text: 'Updated subtask status.',
    };
  }
  if (msgLower.includes('detail') || msgLower.includes('inspect')) {
    return {
      toolCall: { name: 'open_task_detail', args: { title: message } },
      text: 'Opening task details view on your canvas.',
    };
  }
  if (msgLower.includes('completion') || msgLower.includes('summary') || msgLower.includes('rate') || msgLower.includes('metric')) {
    return {
      toolCall: { name: 'show_canvas_surface', args: { surface: 'summary' } },
      text: 'Switched canvas to the Completion & Analytics summary surface.',
    };
  }
  if (msgLower.includes('focus') || msgLower.includes('urgent') || msgLower.includes('high priority')) {
    return {
      toolCall: { name: 'show_canvas_surface', args: { surface: 'focus' } },
      text: 'Switched canvas to Deep Work Focus mode for your highest priority tasks.',
    };
  }
  if (msgLower.includes('create') || msgLower.includes('draft') || msgLower.includes('new task') || msgLower.includes('add task')) {
    const extractedTitle = message.replace(/^(create|draft|add|new task)\s*(task)?[:\-]?\s*/i, '').trim() || 'New Objective';
    return {
      toolCall: { name: 'draft_task_form', args: { title: extractedTitle, priority: 'medium', category: 'Work' } },
      text: `Mounted Create Task form on canvas with draft title: "${extractedTitle}".`,
    };
  }
  if (msgLower.includes('clear completed')) {
    return {
      toolCall: { name: 'clear_completed', args: {} },
      text: 'Cleared all completed tasks from your workspace.',
    };
  }
  if (msgLower.includes('complete') || msgLower.includes('check off')) {
    const todoMatch = message.match(/task\s+([a-zA-Z0-9_\-]+)/i);
    return {
      toolCall: {
        name: 'complete_todo',
        args: { id: todoMatch ? todoMatch[1] : undefined },
      },
      text: 'Updated task completion status.',
    };
  }
  if (msgLower.includes('inspector') || msgLower.includes('telemetry') || msgLower.includes('logs')) {
    return {
      toolCall: { name: 'show_canvas_surface', args: { surface: 'inspector' } },
      text: 'Opening WebMCP protocol inspector on the main canvas.',
    };
  }

  return {
    toolCall: { name: 'show_canvas_surface', args: { surface: 'kanban' } },
    text: 'Here is your active Kanban workspace board.',
  };
}

/**
 * AI Chat & Agent Tool-Calling Endpoint.
 * Executes Gemini with standard function calling powered by canonical tools.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], currentTodos = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const todoContext = currentTodos.length > 0
      ? `CURRENT ACTIVE TASKS IN USER WORKSPACE:\n${JSON.stringify(currentTodos, null, 2)}`
      : 'CURRENT ACTIVE TASKS IN USER WORKSPACE: (No tasks created yet)';

    const systemInstruction = `You are TaskFlow Copilot, an AI assistant built on the Web Model Context Protocol (WebMCP, a W3C Community Group draft) and the Agent-to-User Interface (A2UI) v0.9 protocol.

${todoContext}

WORKFLOW & PRINCIPLES:
1. When user asks to create or draft a task:
   - Call "draft_task_form" with title, description, priority, category, dueDate, and subtasks. This mounts a Create Task form on the user's canvas for human-in-the-loop review.
2. When user asks to open or inspect a specific task:
   - Call "open_task_detail" with id or title. This mounts the comprehensive Task Detail screen on the main canvas.
3. When user asks to update a subtask or checklist item:
   - Call "update_subtask" with todoId, subtaskId, and completed or title.
4. When user asks to view or navigate to a view (e.g. summary, focus, inspector, kanban):
   - Call "show_canvas_surface" with surface="summary" | "focus" | "inspector" | "kanban" | "detail".
5. When user asks to query or mutate tasks:
   - Call the corresponding tool: "get_todos", "create_todo", "complete_todo", "update_todo", "delete_todo", or "clear_completed".
6. When user asks for a custom view, report, dashboard, or matrix (anything not covered above):
   - Call "render_a2ui_surface" and compose the declarative A2UI component tree yourself. The tool description documents the full component vocabulary and data binding format.
7. When you receive an [A2UI surface interaction] message, the user clicked a Button in a surface you previously rendered:
   - Respond by calling the tool named in the action, passing the action's context object as the arguments.
8. Keep replies concise, friendly, and actionable.
`;

    const contents: any[] = [];
    for (const h of history) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content || '' }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const tools = [{ functionDeclarations: getGenAIFunctionDeclarations() }];

    let response: any;
    try {
      response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: { systemInstruction, tools },
        })
      );
    } catch (primaryErr: any) {
      const isTransientOrQuota =
        primaryErr?.message?.includes('429') ||
        primaryErr?.message?.includes('503') ||
        primaryErr?.message?.includes('UNAVAILABLE') ||
        primaryErr?.message?.includes('demand') ||
        primaryErr?.message?.includes('quota') ||
        primaryErr?.message?.includes('RESOURCE_EXHAUSTED');

      if (isTransientOrQuota) {
        console.warn('Primary model unavailable or quota reached, falling back to gemini-3.1-flash-lite...');
        try {
          response = await callWithRetry(() =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents,
              config: { systemInstruction, tools },
            })
          );
        } catch {
          console.warn('Fallback model exhausted. Using offline WebMCP intent resolver.');
          const offline = resolveOfflineIntent(message);
          res.json({
            text: offline.text,
            toolCall: {
              name: offline.toolCall.name,
              args: offline.toolCall.args,
              result: { success: true },
            },
          });
          return;
        }
      } else {
        throw primaryErr;
      }
    }

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolName = call.name || '';
      const toolArgs = call.args || {};

      res.json({
        text: response.text || `Executed tool "${toolName}" on your workspace.`,
        toolCall: {
          name: toolName,
          args: toolArgs,
        },
      });
      return;
    }

    res.json({
      text: response.text || 'How can I assist you with your tasks today?',
      toolCall: null,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: 'Failed to process chat message with AI engine',
      details: error?.message,
    });
  }
});

/**
 * Local LLM Proxy Endpoint (Bypasses HTTPS browser Mixed-Content / CORS constraints
 * when connecting to Ollama or LM Studio running on localhost).
 */
app.post('/api/proxy/llm', async (req, res) => {
  try {
    const { endpoint, payload, headers: customHeaders = {} } = req.body;
    if (!endpoint || !payload) {
      res.status(400).json({ error: 'Endpoint and payload are required' });
      return;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Local LLM Proxy error:', error.message);
    res.status(502).json({ error: 'Failed to connect to local LLM server', details: error.message });
  }
});

/**
 * Server Bootstrap: Vite Middleware in Dev, Static bundle in Production.
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TaskFlow WebMCP server running on port ${PORT}`);
  });
}

startServer();
