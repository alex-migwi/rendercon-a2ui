import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Cpu,
  Server,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { todoStore } from '../../lib/store';
import { telemetry } from '../../lib/telemetry';
import { executeDirectTool } from '../../lib/tool-execution';
import { CanvasView, FormPrefillData } from '../../types/canvas';
import { synthesizeAgentA2UISurface, A2UISurfacePayload } from '../../lib/a2ui-flow';
import { sendProviderMessage, ModelProvider } from '../../lib/llm-provider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  canvasView?: CanvasView;
  a2uiSurface?: A2UISurfacePayload;
  trace?: {
    toolName?: string;
    toolArgs?: any;
    durationMs?: number;
    provider?: string;
  };
}

const PLAYBOOK_PROMPTS = [
  'Open task details for my top task',
  'Draft urgent task: Launch MVP with 3 subtasks',
  'What is my completion rate?',
  'List my todos',
  'What is my highest priority task?',
  'Show WebMCP telemetry logs',
  'Clear all completed tasks',
];

interface ChatPanelProps {
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
  onCanvasChange: (
    view: CanvasView,
    prefill?: FormPrefillData,
    a2uiSurface?: A2UISurfacePayload,
    selectedTaskId?: string
  ) => void;
  currentCanvasView: CanvasView;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  externalPrompt,
  onClearExternalPrompt,
  onCanvasChange,
  currentCanvasView,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Hello! I am your TaskFlow Copilot. The Main Workspace acts as an interactive A2UI Canvas:\n\n• Ask for your **completion rate** → Summary & Analytics is rendered.\n• Ask to **list todos** → Kanban Board is rendered.\n• Ask to **create a new todo** → Task Creator canvas is rendered.\n• Ask for your **highest priority** → Deep Work Focus mode is rendered.\nAll data is queried and modified live via WebMCP.',
      canvasView: 'summary',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Model Provider Configuration
  const [provider, setProvider] = useState<ModelProvider>('gemini');
  const [lmStudioUrl, setLmStudioUrl] = useState('http://localhost:1234/v1');
  const [lmStudioModel, setLmStudioModel] = useState('local-model');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:latest');
  const [showConfig, setShowConfig] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeStep]);

  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt]);

  const handleSend = async (userPromptText?: string) => {
    const textToSend = userPromptText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userPromptText) setInput('');
    setIsLoading(true);

    const startTime = performance.now();

    telemetry.log({
      phase: 'USER_REQUEST',
      method: 'chat/prompt',
      details: `User submitted prompt: "${textToSend.trim()}"`,
      data: { text: textToSend.trim(), provider },
    });

    try {
      const providerLabel =
        provider === 'gemini'
          ? 'Gemini 3.8 Flash'
          : provider === 'lmstudio'
          ? 'LM Studio'
          : 'Ollama';

      setActiveStep(`Consulting ${providerLabel}...`);

      const { text, toolCall } = await sendProviderMessage(
        textToSend.trim(),
        messages.map((m) => ({ role: m.role, content: m.content })),
        todoStore.getAll(),
        {
          provider,
          lmStudioUrl,
          ollamaUrl,
          ollamaModel: ollamaModel || 'llama3.1',
        }
      );

      let a2uiSurface: A2UISurfacePayload;
      if (toolCall) {
        setActiveStep(`Executing WebMCP: ${toolCall.name}...`);
        const exec = await executeDirectTool(
          toolCall.name,
          toolCall.args || {},
          textToSend
        );
        a2uiSurface = exec.surface;
      } else {
        a2uiSurface = synthesizeAgentA2UISurface('chat_response', {}, {}, textToSend);
      }

      const canvasTarget: CanvasView = a2uiSurface.canvasView;
      const targetTaskId =
        a2uiSurface.dataModel?.selectedTaskId ||
        a2uiSurface.dataModel?.toolResult?.selectedTaskId ||
        toolCall?.args?.id ||
        toolCall?.args?.todoId;

      onCanvasChange(canvasTarget, a2uiSurface.formPrefill, a2uiSurface, targetTaskId);

      const duration = Math.round(performance.now() - startTime);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            text ||
            (toolCall
              ? `Executed tool "${toolCall.name}" on your workspace.`
              : 'Updated the canvas.'),
          canvasView: canvasTarget,
          a2uiSurface,
          trace: {
            toolName: toolCall?.name,
            toolArgs: toolCall?.args,
            durationMs: duration,
            provider: providerLabel,
          },
        },
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);

      // Even error fallbacks go through validated A2UI synthesis
      const fallbackSurface = synthesizeAgentA2UISurface('chat_response', {}, {}, textToSend);
      onCanvasChange(fallbackSurface.canvasView, fallbackSurface.formPrefill, fallbackSurface);

      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          role: 'assistant',
          content: `I've updated your workspace canvas to **${fallbackSurface.canvasView.toUpperCase()}** through validated A2UI flow.`,
          canvasView: fallbackSurface.canvasView,
          a2uiSurface: fallbackSurface,
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveStep(null);
    }
  };

  const getCanvasLabel = (view?: CanvasView) => {
    switch (view) {
      case 'summary':
        return 'Completion & Summary';
      case 'kanban':
        return 'Task Kanban Board';
      case 'create':
        return 'Task Creator Canvas';
      case 'focus':
        return 'Deep Work Focus Mode';
      case 'inspector':
        return 'WebMCP Protocol Inspector';
      case 'detail':
        return 'Task Details';
      default:
        return 'Workspace Canvas';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              A2UI Copilot
            </h2>
            <p className="text-[10px] text-slate-400">
              Provider: <span className="font-semibold text-slate-600 dark:text-slate-300">{provider.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              showConfig
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Configure LLM Provider"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              setMessages([
                {
                  id: 'msg-cleared',
                  role: 'assistant',
                  content:
                    'Chat history reset. Ask me to display your completion rate, tasks, or create a new todo!',
                },
              ])
            }
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs transition cursor-pointer"
            title="Reset Chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Provider Selector Drawer */}
      {showConfig && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Select LLM Provider:</p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setProvider('gemini')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                provider === 'gemini'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Gemini API</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Gemini 3.8 Flash</p>
            </button>

            <button
              onClick={() => setProvider('lmstudio')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                provider === 'lmstudio'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                <span>LM Studio</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">localhost:1234</p>
            </button>

            <button
              onClick={() => setProvider('ollama')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                provider === 'ollama'
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Ollama</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">localhost:11434</p>
            </button>
          </div>

          {provider === 'lmstudio' && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Endpoint URL</label>
                <input
                  type="text"
                  value={lmStudioUrl}
                  onChange={(e) => setLmStudioUrl(e.target.value)}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Model Name</label>
                <input
                  type="text"
                  value={lmStudioModel}
                  onChange={(e) => setLmStudioModel(e.target.value)}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                />
              </div>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Endpoint URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Model</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message Feed: Pure Chat & Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] space-y-2 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Text Bubble */}
              {msg.content && (
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}

              {/* Canvas Surface Link Chip */}
              {msg.canvasView && (
                <button
                  onClick={() =>
                    onCanvasChange(
                      msg.canvasView!,
                      msg.a2uiSurface?.formPrefill,
                      msg.a2uiSurface,
                      msg.a2uiSurface?.dataModel?.selectedTaskId
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                >
                  <Layers className="w-3 h-3 text-indigo-500" />
                  <span>Rendered on Canvas: {getCanvasLabel(msg.canvasView)}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70 ml-0.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading & Sequence Step Animation */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{activeStep || 'Thinking & querying WebMCP...'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Evaluating intent & rendering target UI on Main Canvas...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PLAYBOOK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request a task..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
