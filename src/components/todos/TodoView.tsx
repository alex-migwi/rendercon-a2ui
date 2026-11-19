import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { Todo, Priority, TaskStatus } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { KanbanColumn } from './KanbanColumn';
import { TodoListItem } from './TodoListItem';

interface TodoViewProps {
  onPromptChat?: (prompt: string) => void;
  onOpenDetail?: (todoId: string) => void;
  onOpenCreate?: () => void;
}

export const TodoView: React.FC<TodoViewProps> = ({
  onPromptChat,
  onOpenDetail,
  onOpenCreate,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'urgent' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = todoStore.subscribe((updatedTodos) => {
      setTodos(updatedTodos);
    });
    return unsubscribe;
  }, []);

  const handleToggleTodo = (id: string) => {
    todoStore.toggleComplete(id);
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    todoStore.update(id, {
      status,
      completed: status === 'completed',
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      todoStore.delete(id);
    }
  };

  const handleToggleSubtask = (todoId: string, subtaskId: string) => {
    todoStore.toggleSubtask(todoId, subtaskId);
  };

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const priorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case 'low':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Filter Todos
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active' && todo.completed) return false;
    if (filter === 'completed' && !todo.completed) return false;
    if (filter === 'urgent' && todo.priority !== 'urgent' && todo.priority !== 'high') return false;
    if (filter === 'today' && (!todo.dueDate || !todo.dueDate.toLowerCase().includes('today'))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = todo.title.toLowerCase().includes(q);
      const matchDesc = todo.description?.toLowerCase().includes(q);
      const matchCat = todo.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCat;
    }
    return true;
  });

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Workspace Tasks
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                WebMCP Synced
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Changes made via Chat A2UI, direct UI, or desktop MCP clients synchronize in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreate && (
              <button
                onClick={onOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            )}

            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress & Quick Stats */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Progress</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {completionPercent}%
                </span>
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">Total: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span>
              </div>
              <div>
                <span className="text-slate-400">Active: </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{activeCount}</span>
              </div>
              <div>
                <span className="text-slate-400">Done: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
              </div>
            </div>
          </div>

          {onPromptChat && (
            <button
              onClick={() => onPromptChat('List all my urgent and high-priority tasks with a summary')}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Agent to prioritize</span>
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Tasks', count: totalCount },
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'urgent', label: 'Urgent/High' },
              { id: 'today', label: 'Today' },
              { id: 'completed', label: 'Completed', count: completedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition cursor-pointer ${
                  filter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filter === tab.id
                        ? 'bg-slate-800 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Board / List View Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {/* Column 1: To Do */}
            <KanbanColumn
              title="To Do"
              count={filteredTodos.filter((t) => !t.completed && t.status !== 'in_progress').length}
              color="border-slate-400 dark:border-slate-600"
              todos={filteredTodos.filter((t) => !t.completed && t.status !== 'in_progress')}
              onToggle={handleToggleTodo}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              priorityBadge={priorityBadge}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              onOpenDetail={onOpenDetail}
            />

            {/* Column 2: In Progress */}
            <KanbanColumn
              title="In Progress"
              count={filteredTodos.filter((t) => !t.completed && t.status === 'in_progress').length}
              color="border-indigo-500 dark:border-indigo-400"
              todos={filteredTodos.filter((t) => !t.completed && t.status === 'in_progress')}
              onToggle={handleToggleTodo}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              priorityBadge={priorityBadge}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              onOpenDetail={onOpenDetail}
            />

            {/* Column 3: Completed */}
            <KanbanColumn
              title="Completed"
              count={filteredTodos.filter((t) => t.completed || t.status === 'completed').length}
              color="border-emerald-400 dark:border-emerald-700"
              todos={filteredTodos.filter((t) => t.completed || t.status === 'completed')}
              onToggle={handleToggleTodo}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              priorityBadge={priorityBadge}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              onOpenDetail={onOpenDetail}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {filteredTodos.map((todo) => (
              <TodoListItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                priorityBadge={priorityBadge}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
