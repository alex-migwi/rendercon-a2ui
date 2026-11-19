import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Bot,
  Cpu,
  Laptop,
  Sun,
  Moon,
} from 'lucide-react';
import { MainCanvas } from './components/canvas/MainCanvas';
import { ChatPanel } from './components/chat/ChatPanel';
import { DesktopClientModal } from './components/desktop/DesktopClientModal';
import { CanvasView, CanvasState, FormPrefillData } from './types/canvas';
import { useTaskFlowWebMCP } from './hooks/useTaskFlowWebMCP';
import { onA2UIAction } from './lib/a2ui-engine';

export default function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    view: 'kanban',
    source: 'user',
  });

  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'chat'>('canvas');

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNavigateCanvas = (
    view: CanvasView,
    source: 'user' | 'agent' = 'user',
    formPrefill?: FormPrefillData,
    selectedTaskId?: string
  ) => {
    setCanvasState({ view, source, formPrefill, selectedTaskId });
  };

  // Register tools into document.modelContext (WebMCP draft API) via the @mcp-b/react-webmcp hook
  useTaskFlowWebMCP({
    onDraftTaskForm: (prefill) => {
      handleNavigateCanvas('create', 'agent', prefill);
    },
    onNavigateCanvas: (surface) => {
      handleNavigateCanvas(surface as CanvasView, 'agent');
    },
    onOpenTaskDetail: (todoId) => {
      handleNavigateCanvas('detail', 'agent', undefined, todoId);
    },
  });

  const handlePromptFromCanvas = (prompt: string) => {
    setChatPrompt(prompt);
    setMobileTab('chat');
  };

  // A2UI protocol loop: actions dispatched from agent-rendered surfaces
  // (e.g. Button clicks) flow back to the agent through the chat panel.
  useEffect(() => {
    return onA2UIAction((action) => {
      const context =
        action.context && Object.keys(action.context).length > 0
          ? ` with context ${JSON.stringify(action.context)}`
          : '';
      handlePromptFromCanvas(
        `[A2UI surface interaction] The user triggered the "${action.name}" action${context}. Handle this interaction by calling the appropriate tool.`
      );
    });
  }, []);

  return (
    <div
      className={`h-[100dvh] min-h-0 overflow-hidden flex flex-col font-sans ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                  TaskFlow
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
                  WebMCP & A2UI Canvas
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Canvas Switchers (Desktop) */}
            <div className="hidden lg:flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-medium">
              <button
                onClick={() => handleNavigateCanvas('kanban')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  canvasState.view === 'kanban'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => handleNavigateCanvas('summary')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  canvasState.view === 'summary'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Completion Summary
              </button>
              <button
                onClick={() => handleNavigateCanvas('focus')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  canvasState.view === 'focus'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Focus
              </button>
            </div>

            {/* Desktop Setup Button */}
            <button
              onClick={() => setShowDesktopModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-indigo-500" />
              <span>Connect Desktop (Claude)</span>
            </button>

            {/* WebMCP Inspector Toggle */}
            <button
              onClick={() =>
                handleNavigateCanvas(
                  canvasState.view === 'inspector' ? 'kanban' : 'inspector',
                  'user'
                )
              }
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                canvasState.view === 'inspector'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">WebMCP Inspector</span>
              <span className="sm:hidden">MCP</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="sm:hidden flex shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setMobileTab('canvas')}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
              mobileTab === 'canvas'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Main Canvas ({canvasState.view})
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Sidebar Copilot</span>
          </button>
        </div>

        {/* Main Split Layout: Left Canvas Surface + Right Chat Sidebar */}
        <main className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Left Pane: Main Dynamic A2UI Canvas */}
          <div
            className={`flex-1 min-h-0 flex flex-col min-w-0 ${
              mobileTab === 'canvas' ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <MainCanvas
              canvasState={canvasState}
              onNavigateCanvas={(v, taskId) =>
                handleNavigateCanvas(v, 'user', undefined, taskId)
              }
              onPromptChat={handlePromptFromCanvas}
            />
          </div>

          {/* Right Pane: Sidebar Chat (Pure Messages & Conversational Input) */}
          <div
            className={`w-full sm:w-[380px] lg:w-[420px] min-h-0 flex flex-col shrink-0 ${
              mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <ChatPanel
              externalPrompt={chatPrompt}
              onClearExternalPrompt={() => setChatPrompt(undefined)}
              onCanvasChange={(v, prefill, taskId) =>
                handleNavigateCanvas(v, 'agent', prefill, taskId)
              }
              currentCanvasView={canvasState.view}
            />
          </div>
        </main>

        {/* Desktop Clients Modal */}
        <DesktopClientModal
          isOpen={showDesktopModal}
          onClose={() => setShowDesktopModal(false)}
        />
      </div>
  );
}
