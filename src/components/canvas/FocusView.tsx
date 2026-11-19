import React, { useState, useEffect } from 'react';
import {
  Target,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  ListTodo,
} from 'lucide-react';
import { Todo, Priority } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { CanvasView } from '../../types/canvas';

interface FocusViewProps {
  onNavigateCanvas: (view: CanvasView, selectedTaskId?: string) => void;
  onPromptChat?: (prompt: string) => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
  onNavigateCanvas,
  onPromptChat,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    const unsub = todoStore.subscribe((all) => {
      setTodos(all);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const activeTodos = todos.filter((t) => !t.completed);
  // Sort by priority: urgent first, then high, then medium, then low
  const priorityOrder: Record<Priority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sorted = [...activeTodos].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const currentFocus = sorted[0];
  const nextUp = sorted.slice(1, 5);

  const handleToggle = (id: string) => {
    todoStore.toggleComplete(id);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent p-6 rounded-3xl border border-rose-200 dark:border-rose-950/60">
        <div>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Deep Work & Focus Mode</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Highest Priority Task
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero distractions. One task at a time.
          </p>
        </div>

        <button
          onClick={() => onNavigateCanvas('kanban')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <ListTodo className="w-4 h-4" />
          <span>Back to All Tasks</span>
        </button>
      </div>

      {currentFocus ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Focus Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  currentFocus.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300'
                }`}
              >
                ★ Current Objective • {currentFocus.priority}
              </span>

              {currentFocus.dueDate && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentFocus.dueDate}</span>
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  onClick={() => onNavigateCanvas('detail', currentFocus.id)}
                  className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  title="Click to open full task details"
                >
                  {currentFocus.title}
                </h3>
                {currentFocus.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {currentFocus.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onNavigateCanvas('detail', currentFocus.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <span>Task Details</span>
              </button>
            </div>

            {/* Checklist Subtasks */}
            {currentFocus.subtasks && currentFocus.subtasks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Checklist</span>
                  <span className="font-mono text-slate-400">
                    {currentFocus.subtasks.filter((s) => s.completed).length} / {currentFocus.subtasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {currentFocus.subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => todoStore.toggleSubtask(currentFocus.id, st.id)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      {st.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          st.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleToggle(currentFocus.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Finished</span>
              </button>

              {onPromptChat && (
                <button
                  onClick={() =>
                    onPromptChat(
                      `Help me complete the focus task "${currentFocus.title}". What is the best first step?`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Copilot for tips</span>
                </button>
              )}
            </div>
          </div>

          {/* Pomodoro Timer & Next Up Queue */}
          <div className="space-y-6">
            {/* Focus Timer */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Focus Session Timer
              </span>

              <div className="text-5xl font-mono font-extrabold text-slate-900 dark:text-white">
                {formatTimer(timerSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                >
                  {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(25 * 60);
                  }}
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Reset 25 min"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Next Up Queue */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Next in Queue</span>
                <span className="text-[10px] text-slate-400">{nextUp.length} waiting</span>
              </h4>

              {nextUp.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No other tasks in queue!</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {nextUp.map((task) => (
                    <div key={task.id} className="py-2.5 flex items-start gap-2.5">
                      <button
                        onClick={() => handleToggle(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 transition"
                      >
                        <Circle className="w-3.5 h-3.5" />
                      </button>
                      <div
                        onClick={() => onNavigateCanvas('detail', task.id)}
                        className="min-w-0 flex-1 cursor-pointer hover:text-indigo-600 transition"
                      >
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {task.title}
                        </p>
                        <span className="text-[10px] capitalize text-slate-400">
                          {task.priority} • {task.category || 'General'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            All tasks are completed!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have no pending tasks. Enjoy your free time or add a new task to your workspace.
          </p>
          <button
            onClick={() => onNavigateCanvas('create')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Create New Task
          </button>
        </div>
      )}
    </div>
  );
};
