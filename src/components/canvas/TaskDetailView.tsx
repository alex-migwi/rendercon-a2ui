import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Calendar,
  Tag,
  Trash2,
  Plus,
  Clock,
  Sparkles,
  Save,
  Edit2,
  Check,
  X,
  ListTodo,
  Layers,
} from 'lucide-react';
import { Todo, Priority, TaskStatus } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { CanvasView } from '../../types/canvas';

interface TaskDetailViewProps {
  taskId?: string;
  onNavigateCanvas: (view: CanvasView, selectedTaskId?: string) => void;
  onPromptChat?: (prompt: string) => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  taskId,
  onNavigateCanvas,
  onPromptChat,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(taskId);

  // Edit fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Subtask editing states
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    const unsub = todoStore.subscribe((all) => {
      setTodos(all);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (taskId) {
      setCurrentTaskId(taskId);
    }
  }, [taskId]);

  const activeTodo =
    todos.find((t) => t.id === currentTaskId) ||
    (todos.length > 0 ? todos[0] : null);

  useEffect(() => {
    if (activeTodo) {
      setTitle(activeTodo.title);
      setDescription(activeTodo.description || '');
      setPriority(activeTodo.priority);
      setStatus(activeTodo.status);
      setCategory(activeTodo.category || '');
      setDueDate(activeTodo.dueDate || '');
      setHasUnsavedChanges(false);
      if (!currentTaskId) {
        setCurrentTaskId(activeTodo.id);
      }
    }
  }, [activeTodo?.id, activeTodo?.updatedAt]);

  if (!activeTodo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
          <ListTodo className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Task Selected
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
          Select a task from the board or create a new task to view its detailed checklist and attributes.
        </p>
        <button
          onClick={() => onNavigateCanvas('kanban')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tasks</span>
        </button>
      </div>
    );
  }

  const handleSaveMainDetails = () => {
    if (!title.trim()) return;
    todoStore.update(activeTodo.id, {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      category: category.trim() || 'General',
      dueDate: dueDate.trim() || 'Today',
    });
    setHasUnsavedChanges(false);
  };

  const handleToggleTaskComplete = () => {
    todoStore.toggleComplete(activeTodo.id);
  };

  const handleDeleteTask = () => {
    if (confirm(`Are you sure you want to delete "${activeTodo.title}"?`)) {
      todoStore.delete(activeTodo.id);
      onNavigateCanvas('kanban');
    }
  };

  // Subtask Handlers
  const handleToggleSubtask = (subtaskId: string) => {
    todoStore.toggleSubtask(activeTodo.id, subtaskId);
  };

  const handleStartEditSubtask = (subtaskId: string, currentTitle: string) => {
    setEditingSubtaskId(subtaskId);
    setEditingSubtaskTitle(currentTitle);
  };

  const handleSaveSubtaskTitle = (subtaskId: string) => {
    if (editingSubtaskTitle.trim()) {
      todoStore.updateSubtask(activeTodo.id, subtaskId, {
        title: editingSubtaskTitle.trim(),
      });
    }
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    todoStore.deleteSubtask(activeTodo.id, subtaskId);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    todoStore.addSubtask(activeTodo.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const completedSubtasks = activeTodo.subtasks
    ? activeTodo.subtasks.filter((s) => s.completed).length
    : 0;
  const totalSubtasks = activeTodo.subtasks ? activeTodo.subtasks.length : 0;
  const progressPct =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateCanvas('kanban')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Back to Tasks"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Task Details
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {activeTodo.id}
              </span>
            </div>

            {/* Task Quick Switcher */}
            <select
              value={activeTodo.id}
              onChange={(e) => {
                setCurrentTaskId(e.target.value);
                onNavigateCanvas('detail', e.target.value);
              }}
              className="mt-1 text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 border-none outline-hidden cursor-pointer hover:underline p-0"
            >
              {todos.map((t) => (
                <option key={t.id} value={t.id} className="dark:bg-slate-900">
                  Switch: {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleToggleTaskComplete}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              activeTodo.completed
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {activeTodo.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
            <span>{activeTodo.completed ? 'Completed' : 'Mark Complete'}</span>
          </button>

          {hasUnsavedChanges && (
            <button
              onClick={handleSaveMainDetails}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}

          <button
            onClick={handleDeleteTask}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Task Editor Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            onBlur={handleSaveMainDetails}
            className="w-full text-lg sm:text-xl font-bold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Metadata Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                const nextPriority = e.target.value as Priority;
                setPriority(nextPriority);
                todoStore.update(activeTodo.id, { priority: nextPriority });
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 capitalize"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const nextStatus = e.target.value as TaskStatus;
                setStatus(nextStatus);
                todoStore.update(activeTodo.id, {
                  status: nextStatus,
                  completed: nextStatus === 'completed',
                });
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 capitalize"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Category
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                onBlur={handleSaveMainDetails}
                className="w-full text-xs font-medium pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                onBlur={handleSaveMainDetails}
                className="w-full text-xs font-medium pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Description & Notes
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasUnsavedChanges(true);
            }}
            onBlur={handleSaveMainDetails}
            rows={3}
            placeholder="Add detailed acceptance criteria or execution steps..."
            className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          />
        </div>
      </div>

      {/* Subtasks / Checklist Management Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Checklist & Subtasks
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {completedSubtasks} / {totalSubtasks} complete
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Subtask Items List */}
        <div className="space-y-2 pt-2">
          {(!activeTodo.subtasks || activeTodo.subtasks.length === 0) ? (
            <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
              No subtasks defined yet. Add the first subtask below.
            </div>
          ) : (
            activeTodo.subtasks.map((st) => {
              const isEditing = editingSubtaskId === st.id;

              return (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-750 group hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleSubtask(st.id)}
                      className="text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                    >
                      {st.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSubtaskTitle(st.id);
                            if (e.key === 'Escape') setEditingSubtaskId(null);
                          }}
                          autoFocus
                          className="flex-1 text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleSaveSubtaskTitle(st.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded cursor-pointer"
                          title="Save Subtask"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSubtaskId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleStartEditSubtask(st.id, st.title)}
                        className={`text-xs flex-1 cursor-pointer truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                          st.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200 font-medium'
                        }`}
                        title="Click to edit subtask title"
                      >
                        {st.title}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleStartEditSubtask(st.id, st.title)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Edit subtask"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add Subtask Input */}
        <div className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
            placeholder="Add a step to this task..."
            className="flex-1 text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim()}
            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>
        </div>
      </div>

      {/* Copilot Assistant Quick Actions */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Copilot Actions for this Task
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Request automated assistance or checklist expansion from the assistant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() =>
              onPromptChat?.(
                `Can you generate 3 detailed subtask steps for "${activeTodo.title}"?`
              )
            }
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Expand Checklist
          </button>
          <button
            onClick={() =>
              onPromptChat?.(
                `Summarize next steps and timeline for "${activeTodo.title}"`
              )
            }
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Analyze Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
