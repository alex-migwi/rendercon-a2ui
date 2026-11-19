import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Todo, Priority, TaskStatus } from '../../types/todo';

export interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onToggleSubtask: (todoId: string, subtaskId: string) => void;
  priorityBadge: (priority: Priority) => string;
  expandedTasks: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  onOpenDetail?: (id: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  count,
  color,
  todos,
  onToggle,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  priorityBadge,
  expandedTasks,
  toggleExpand,
  onOpenDetail,
}) => {
  return (
    <div className="flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 min-h-[400px]">
      <div className={`flex items-center justify-between pb-3 border-b-2 ${color} mb-3`}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {title}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {count}
          </span>
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
            No tasks
          </div>
        ) : (
          todos.map((todo) => {
            const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
            const isExpanded = expandedTasks[todo.id];

            return (
              <div
                key={todo.id}
                className="bg-white dark:bg-slate-855 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-750 shadow-xs hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => onToggle(todo.id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <h4
                        onClick={() => onOpenDetail?.(todo.id)}
                        className={`text-xs sm:text-sm font-semibold leading-snug break-words cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                          todo.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                        title="Click to view task details"
                      >
                        {todo.title}
                      </h4>

                      {todo.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {todo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${priorityBadge(
                        todo.priority
                      )}`}
                    >
                      {todo.priority}
                    </span>
                    {onOpenDetail && (
                      <button
                        onClick={() => onOpenDetail(todo.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition rounded-md hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer"
                        title="View Task Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtask accordion */}
                {hasSubtasks && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleExpand(todo.id)}
                      className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>Subtasks</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {todo.subtasks!.filter((s) => s.completed).length} / {todo.subtasks!.length}
                        </span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                        {todo.subtasks!.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <button
                              onClick={() => onToggleSubtask(todo.id, st.id)}
                              className="text-slate-400 hover:text-indigo-600 transition"
                            >
                              {st.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span
                              className={
                                st.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : ''
                              }
                            >
                              {st.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    {todo.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {todo.category}
                      </span>
                    )}
                    {todo.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {todo.dueDate}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <select
                      value={todo.status}
                      onChange={(e) => onStatusChange(todo.id, e.target.value as TaskStatus)}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="pending">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Done</option>
                    </select>

                    <button
                      onClick={() => onDelete(todo.id, todo.title)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
