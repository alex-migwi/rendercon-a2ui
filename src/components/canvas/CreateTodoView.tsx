import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowLeft,
  Flame,
  Check,
  Wand2,
} from 'lucide-react';
import { Priority } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { telemetry } from '../../lib/telemetry';
import { CanvasView, FormPrefillData } from '../../types/canvas';

interface CreateTodoViewProps {
  onNavigateCanvas: (view: CanvasView) => void;
  onPromptChat?: (prompt: string) => void;
  initialTitle?: string;
  prefillData?: FormPrefillData;
}

export const CreateTodoView: React.FC<CreateTodoViewProps> = ({
  onNavigateCanvas,
  onPromptChat,
  initialTitle = '',
  prefillData,
}) => {
  const [title, setTitle] = useState(prefillData?.title || initialTitle);
  const [description, setDescription] = useState(prefillData?.description || '');
  const [priority, setPriority] = useState<Priority>(prefillData?.priority || 'medium');
  const [category, setCategory] = useState(prefillData?.category || 'Work');
  const [dueDate, setDueDate] = useState(prefillData?.dueDate || 'Today, 5:00 PM');
  const [subtasks, setSubtasks] = useState<string[]>(prefillData?.subtasks || []);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasPrefillNotification, setHasPrefillNotification] = useState(!!prefillData);

  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.description !== undefined) setDescription(prefillData.description);
      if (prefillData.priority) setPriority(prefillData.priority);
      if (prefillData.category) setCategory(prefillData.category);
      if (prefillData.dueDate) setDueDate(prefillData.dueDate);
      if (prefillData.subtasks) setSubtasks(prefillData.subtasks);
      setHasPrefillNotification(true);
    }
  }, [prefillData]);

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo = todoStore.add({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      dueDate,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });

    telemetry.log({
      phase: 'WEBMCP_EXEC',
      method: 'canvas/create_todo',
      details: `Created new task "${newTodo.title}" via Main Canvas form`,
      data: { todo: newTodo },
    });

    setIsSaved(true);
    setTimeout(() => {
      onNavigateCanvas('kanban');
    }, 800);
  };

  const commonCategories = ['Work', 'Dev', 'Personal', 'Design', 'Marketing'];
  const commonDueDates = ['Today, 5:00 PM', 'Tomorrow', 'This Friday', 'Next Monday'];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Canvas Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateCanvas('kanban')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kanban</span>
        </button>

        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
          A2UI Canvas Mode: Task Creator
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Create a New Task
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fill in the details or ask the sidebar Copilot to generate it conversationally.
          </p>
        </div>

        {hasPrefillNotification && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs">
            <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300">
              <Wand2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                <strong>Declarative WebMCP Tool (`draft_task_form`) Active:</strong> Auto-filled from your conversational instructions. Review, edit, and click Save when ready!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasPrefillNotification(false)}
              className="text-slate-400 hover:text-slate-600 text-[11px] shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What task needs to be completed?"
              autoFocus
              className="w-full text-base sm:text-lg font-medium px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Description & Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key deliverables, acceptance criteria, or relevant links..."
              className="w-full text-xs sm:text-sm px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Priority Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Priority Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'urgent',
                  label: 'Urgent',
                  desc: 'Critical deadline',
                  color: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
                  icon: Flame,
                },
                {
                  id: 'high',
                  label: 'High',
                  desc: 'Important next step',
                  color: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                  icon: AlertCircle,
                },
                {
                  id: 'medium',
                  label: 'Medium',
                  desc: 'Regular priority',
                  color: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
                  icon: CheckCircle2,
                },
                {
                  id: 'low',
                  label: 'Low',
                  desc: 'Someday / whenever',
                  color: 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                  icon: CheckCircle2,
                },
              ].map((p) => {
                const isSelected = priority === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as Priority)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? `${p.color} ring-2 ring-indigo-500 font-bold`
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{p.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {commonCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      category === c
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Target Due Date
              </label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {commonDueDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDueDate(d)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      dueDate === d
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subtasks Checklist Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Checklist Subtasks ({subtasks.length})
              </label>

              {title && onPromptChat && (
                <button
                  type="button"
                  onClick={() =>
                    onPromptChat(
                      `Break down the task "${title}" into 3 actionable subtasks using WebMCP`
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-break down with AI Copilot</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                placeholder="Add a step to this task..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 text-xs sm:text-sm px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl transition cursor-pointer"
              >
                Add Step
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="mt-3 space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                {subtasks.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-200 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">{i + 1}.</span>
                      <span>{st}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(i)}
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigateCanvas('kanban')}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!title.trim() || isSaved}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved to WebMCP!</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Task on Canvas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
