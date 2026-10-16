import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getGenAIFunctionDeclarations } from './src/lib/tools.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google Gemini Client with secure backend key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for transient 503 / rate-limit resilience
async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && (err?.message?.includes('503') || err?.message?.includes('429') || err?.message?.includes('demand'))) {
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

    const systemInstruction = `You are TaskFlow Copilot, an AI assistant built on the W3C Web Model Context Protocol (WebMCP) and Agent-to-User Interface (A2UI) standard.

${todoContext}

WORKFLOW & PRINCIPLES:
1. When user asks to create or draft a task:
   - Call "draft_task_form" with title, description, priority, category, dueDate, and subtasks. This mounts a validated A2UI Task Form on the user's canvas for human-in-the-loop review.
2. When user asks to open or inspect a specific task:
   - Call "open_task_detail" with id or title. This mounts the comprehensive Task Detail screen on the main canvas.
3. When user asks to update a subtask or checklist item:
   - Call "update_subtask" with todoId, subtaskId, and completed or title.
4. When user asks to view or navigate to a view (e.g. summary, focus, inspector, kanban):
   - Call "show_canvas_surface" with surface="summary" | "focus" | "inspector" | "kanban" | "detail".
5. When user asks to query or mutate tasks:
   - Call the corresponding tool: "get_todos", "create_todo", "complete_todo", "update_todo", "delete_todo", or "clear_completed".
6. Keep replies concise, friendly, and actionable.
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
