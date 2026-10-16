import React, { useState, useEffect } from 'react';
import {
  PieChart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Tag,
  ArrowRight,
  ListTodo,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Todo } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { CanvasView } from '../../types/canvas';

interface SummaryViewProps {
  onNavigateCanvas: (view: CanvasView) => void;
  onPromptChat?: (prompt: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  onNavigateCanvas,
  onPromptChat,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const unsub = todoStore.subscribe((allTodos) => {
      setTodos(allTodos);
    });
    return unsub;
  }, []);

  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const urgentCount = todos.filter((t) => !t.completed && t.priority === 'urgent').length;
  const highCount = todos.filter((t) => !t.completed && t.priority === 'high').length;
  const mediumCount = todos.filter((t) => !t.completed && t.priority === 'medium').length;
  const lowCount = todos.filter((t) => !t.completed && t.priority === 'low').length;

  // Categories
  const categoryCounts: Record<string, number> = {};
  for (const t of todos) {
    const cat = t.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Recent completed
  const recentlyCompleted = todos.filter((t) => t.completed).slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <PieChart className="w-4 h-4" />
            <span>TaskFlow Intelligence</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Completion Rate & Analytics Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live metrics calculated directly from your WebMCP task store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateCanvas('kanban')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>View Kanban</span>
          </button>

          <button
            onClick={() => onNavigateCanvas('create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
          >
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate Gauge */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {completionRate}%
              </span>
              <span className="text-xs text-slate-400">of all tasks</span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {completed} finished of {total} total tasks
          </p>
        </div>

        {/* Active Workload */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Tasks
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="my-4">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {active}
            </span>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Currently pending or in progress
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Urgent/High priority: </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {urgentCount + highCount}
            </span>
          </div>
        </div>

        {/* Completed Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="my-4">
            <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {completed}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Successfully shipped
            </p>
          </div>

          {completed > 0 ? (
            <button
              onClick={() => todoStore.clearCompleted()}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline text-left cursor-pointer"
            >
              Clear completed items
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">No completed tasks yet</span>
          )}
        </div>

        {/* Urgent Actions Alert */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High / Urgent Focus
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="my-4">
            <span className="text-4xl font-extrabold text-rose-600 dark:text-rose-400">
              {urgentCount + highCount}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Need immediate attention
            </p>
          </div>

          <button
            onClick={() => onNavigateCanvas('focus')}
            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
          >
            <span>Open Focus Queue</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Active Priority Distribution</span>
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Urgent', count: urgentCount, color: 'bg-rose-500', text: 'text-rose-500' },
              { label: 'High', count: highCount, color: 'bg-amber-500', text: 'text-amber-500' },
              { label: 'Medium', count: mediumCount, color: 'bg-blue-500', text: 'text-blue-500' },
              { label: 'Low', count: lowCount, color: 'bg-slate-400', text: 'text-slate-400' },
            ].map((prio) => {
              const pct = active > 0 ? Math.round((prio.count / active) * 100) : 0;
              return (
                <div key={prio.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {prio.label}
                    </span>
                    <span className="font-mono text-slate-500">
                      {prio.count} tasks · {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${prio.color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            <span>Category Distribution</span>
          </h3>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <div
                key={cat}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {cat}
                </span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            Categorized automatically or tagged by AI assistant during creation.
          </div>
        </div>
      </div>

      {/* Copilot Action Playbook Banner */}
      {onPromptChat && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Want deeper insights? Ask the Copilot in the sidebar to reorganize your schedule or break down large tasks.
            </span>
          </div>

          <button
            onClick={() => onPromptChat('What should I focus on completing first based on my completion rate?')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition cursor-pointer"
          >
            Ask for Recommendations
          </button>
        </div>
      )}
    </div>
  );
};
