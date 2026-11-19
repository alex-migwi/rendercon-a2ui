import React from 'react';
import {
  LayoutGrid,
  PieChart,
  PlusCircle,
  Target,
  Cpu,
  Sparkles,
  FileText,
  Zap,
} from 'lucide-react';
import { CanvasView, CanvasState } from '../../types/canvas';
import { TodoView } from '../todos/TodoView';
import { SummaryView } from './SummaryView';
import { CreateTodoView } from './CreateTodoView';
import { FocusView } from './FocusView';
import { TaskDetailView } from './TaskDetailView';
import { WebMcpInspector } from '../inspector/WebMcpInspector';
import { A2UICanvasView } from '../a2ui/A2UICanvasView';

interface MainCanvasProps {
  canvasState: CanvasState;
  onNavigateCanvas: (view: CanvasView, selectedTaskId?: string) => void;
  onPromptChat?: (prompt: string) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  canvasState,
  onNavigateCanvas,
  onPromptChat,
}) => {
  const currentView = canvasState.view;

  const viewTabs: Array<{ id: CanvasView; label: string; icon: React.ElementType }> = [
    { id: 'kanban', label: 'Kanban Board', icon: LayoutGrid },
    { id: 'summary', label: 'Completion & Summary', icon: PieChart },
    { id: 'create', label: 'New Task', icon: PlusCircle },
    { id: 'focus', label: 'Focus Mode', icon: Target },
    { id: 'inspector', label: 'WebMCP Inspector', icon: Cpu },
    ...(currentView === 'detail'
      ? [{ id: 'detail' as CanvasView, label: 'Task Details', icon: FileText }]
      : []),
    ...(currentView === 'a2ui'
      ? [{ id: 'a2ui' as CanvasView, label: 'Agent Surface', icon: Zap }]
      : []),
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 overflow-hidden relative">
      {/* Dynamic Canvas Top Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-4 flex items-center justify-between shrink-0 z-10">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigateCanvas(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Agent Canvas Signal Badge */}
        <div className="flex items-center gap-2">
          {canvasState.source === 'agent' && (
            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Canvas rendered by Copilot</span>
            </div>
          )}
        </div>
      </div>

      {/* Surface Rendering Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-4">
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {currentView === 'kanban' && (
            <TodoView
              onPromptChat={onPromptChat}
              onOpenDetail={(todoId) => onNavigateCanvas('detail', todoId)}
              onOpenCreate={() => onNavigateCanvas('create')}
            />
          )}

          {currentView === 'summary' && (
            <SummaryView
              onNavigateCanvas={onNavigateCanvas}
              onPromptChat={onPromptChat}
            />
          )}

          {currentView === 'create' && (
            <CreateTodoView
              onNavigateCanvas={onNavigateCanvas}
              onPromptChat={onPromptChat}
              prefillData={canvasState.formPrefill}
            />
          )}

          {currentView === 'focus' && (
            <FocusView
              onNavigateCanvas={onNavigateCanvas}
              onPromptChat={onPromptChat}
            />
          )}

          {currentView === 'detail' && (
            <TaskDetailView
              taskId={canvasState.selectedTaskId}
              onNavigateCanvas={onNavigateCanvas}
              onPromptChat={onPromptChat}
            />
          )}

          {currentView === 'inspector' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <WebMcpInspector />
            </div>
          )}

          {currentView === 'a2ui' && <A2UICanvasView onPromptChat={onPromptChat} />}
        </div>
      </div>
    </div>
  );
};
