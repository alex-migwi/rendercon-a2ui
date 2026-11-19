import React from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Tag,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Todo, Priority, TaskStatus } from '../../types/todo';

export interface TodoListItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  priorityBadge: (priority: Priority) => string;
  onOpenDetail?: (id: string) => void;
}

export const TodoListItem: React.FC<TodoListItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onStatusChange,
  priorityBadge,
  onOpenDetail,
}) => {
  return (
    <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition flex items-start justify-between gap-3 group">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          onClick={() => onToggle(todo.id)}
          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
        >
          {todo.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              onClick={() => onOpenDetail?.(todo.id)}
              className={`text-sm font-medium cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                todo.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
              title="Click to view task details"
            >
              {todo.title}
            </h4>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${priorityBadge(
                todo.priority
              )}`}
            >
              {todo.priority}
            </span>
          </div>

          {todo.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {todo.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            {todo.category && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {todo.category}
              </span>
            )}
            {todo.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {todo.dueDate}
              </span>
            )}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <span className="text-slate-500">
                {todo.subtasks.filter((s) => s.completed).length}/{todo.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenDetail && (
          <button
            onClick={() => onOpenDetail(todo.id)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Open task details"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}

        <select
          value={todo.status}
          onChange={(e) => onStatusChange(todo.id, e.target.value as TaskStatus)}
          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <button
          onClick={() => onDelete(todo.id, todo.title)}
          className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
          title="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
