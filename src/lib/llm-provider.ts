import { WEBMCP_TOOLS } from './tools';

export type ModelProvider = 'gemini' | 'lmstudio' | 'ollama';

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ProviderResponse {
  text: string;
  toolCall?: ProviderToolCall;
}

export interface ProviderConfig {
  provider: ModelProvider;
  lmStudioUrl: string;
  ollamaUrl: string;
  ollamaModel: string;
}

const SYSTEM_INSTRUCTION_BASE = `You are TaskFlow Copilot, an AI assistant built on the W3C Web Model Context Protocol (WebMCP) and Agent-to-User Interface (A2UI) standard.
Your primary capabilities:
- When user asks to create or draft a task: call draft_task_form with title, description, priority, category, dueDate, and subtasks.
- When user asks to open or inspect a task: call open_task_detail with id or title.
- When user asks to update a subtask or checklist: call update_subtask with todoId, subtaskId, and completed or title.
- When user asks to navigate: call show_canvas_surface with surface ("kanban", "summary", "focus", "inspector", "detail").
- When user asks to mutate tasks: call get_todos, create_todo, complete_todo, update_todo, delete_todo, or clear_completed.
Keep answers concise and helpful.`;

/**
 * Unified Provider Client that executes chat completions across Gemini, LM Studio, and Ollama.
 * Standardizes history window, context passing, and error handling.
 */
export async function sendProviderMessage(
  prompt: string,
  history: ProviderMessage[],
  currentTodos: any[],
  config: ProviderConfig
): Promise<ProviderResponse> {
  const recentHistory = history.slice(-6);

  const todoContext =
    currentTodos.length > 0
      ? `CURRENT ACTIVE TASKS IN USER WORKSPACE:\n${JSON.stringify(currentTodos, null, 2)}`
      : 'CURRENT ACTIVE TASKS IN USER WORKSPACE: (No tasks created yet)';

  const fullSystemPrompt = `${SYSTEM_INSTRUCTION_BASE}\n\n${todoContext}`;

  switch (config.provider) {
    case 'gemini': {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: recentHistory,
          currentTodos,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      return {
        text: data.text || '',
        toolCall: data.toolCall ? { name: data.toolCall.name, args: data.toolCall.args || {} } : undefined,
      };
    }

    case 'lmstudio': {
      const toolsOpenAI = WEBMCP_TOOLS.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));

      const targetUrl = `${config.lmStudioUrl.replace(/\/+$/, '')}/chat/completions`;
      const payload = {
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ],
        tools: toolsOpenAI,
        tool_choice: 'auto',
        temperature: 0.2,
      };

      const res = await fetch('/api/proxy/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: targetUrl, payload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || `LM Studio error (${res.status})`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const toolCallRaw = choice?.message?.tool_calls?.[0];

      let toolCall: ProviderToolCall | undefined = undefined;
      if (toolCallRaw?.function?.name) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(toolCallRaw.function.arguments || '{}');
        } catch {
          parsedArgs = {};
        }
        toolCall = { name: toolCallRaw.function.name, args: parsedArgs };
      }

      return {
        text: choice?.message?.content || (toolCall ? `Executed tool ${toolCall.name} on canvas.` : ''),
        toolCall,
      };
    }

    case 'ollama': {
      const targetUrl = `${config.ollamaUrl.replace(/\/+$/, '')}/api/chat`;
      const payload = {
        model: config.ollamaModel,
        stream: false,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ],
        tools: WEBMCP_TOOLS.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          },
        })),
      };

      const res = await fetch('/api/proxy/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: targetUrl, payload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || `Ollama error (${res.status})`);
      }

      const data = await res.json();
      const toolCallRaw = data.message?.tool_calls?.[0];

      let toolCall: ProviderToolCall | undefined = undefined;
      if (toolCallRaw?.function?.name) {
        toolCall = {
          name: toolCallRaw.function.name,
          args: toolCallRaw.function.arguments || {},
        };
      }

      return {
        text: data.message?.content || (toolCall ? `Executed tool ${toolCall.name} on canvas.` : ''),
        toolCall,
      };
    }
  }
}
