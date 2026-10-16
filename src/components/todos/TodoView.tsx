import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Calendar,
  Tag,
  Trash2,
  List,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Todo, Priority, TaskStatus } from '../../types/todo';
import { todoStore } from '../../lib/store';
import { telemetry } from '../../lib/telemetry';

interface TodoViewProps {
  onPromptChat?: (prompt: string) => void;
  onOpenDetail?: (todoId: string) => void;
}

export const TodoView: React.FC<TodoViewProps> = ({ onPromptChat, onOpenDetail }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'urgent' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Quick Add Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState('Work');
  const [newDueDate, setNewDueDate] = useState('Today');
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Expanded task IDs for subtasks
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = todoStore.subscribe((updatedTodos) => {
      setTodos(updatedTodos);
    });
    return unsubscribe;
  }, []);

  const handleToggleTodo = (id: string) => {
    const updated = todoStore.toggleComplete(id);
    if (updated) {
      telemetry.log({
        phase: 'STORE_SYNC',
        method: 'store/toggleComplete',
        details: `Toggled task "${updated.title}" -> ${updated.completed ? 'completed' : 'active'}`,
        data: { id, completed: updated.completed },
      });
    }
  };

  const handleToggleSubtask = (todoId: string, subtaskId: string) => {
    todoStore.toggleSubtask(todoId, subtaskId);
  };

  const handleDelete = (id: string, title: string) => {
    todoStore.delete(id);
    telemetry.log({
      phase: 'STORE_SYNC',
      method: 'store/delete',
      details: `Removed task "${title}"`,
      data: { id },
    });
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    todoStore.update(id, { status });
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    todoStore.add({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      category: newCategory,
      dueDate: newDueDate,
      subtasks: newSubtasks,
    });

    setNewTitle('');
    setNewDesc('');
    setNewSubtasks([]);
    setSubtaskInput('');
    setIsAdding(false);
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setNewSubtasks([...newSubtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Todos
  const filteredTodos = todos.filter((todo) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        todo.title.toLowerCase().includes(q) ||
        (todo.description && todo.description.toLowerCase().includes(q)) ||
        (todo.category && todo.category.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    if (filter === 'urgent') return todo.priority === 'urgent' || todo.priority === 'high';
    if (filter === 'today') return todo.dueDate?.toLowerCase().includes('today');

    return true;
  });

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const priorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case 'low':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-950/60">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>

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
          {/* Tabs */}
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

          {/* Search */}
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

      {/* Quick Add Form Drawer */}
      {isAdding && (
        <form
          onSubmit={handleCreateTodo}
          className="p-4 bg-white dark:bg-slate-900 border-b border-indigo-100 dark:border-indigo-950/80 shadow-inner"
        >
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add New Task</h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="text"
              placeholder="Additional notes or description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md w-28"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Due Date</label>
                <input
                  type="text"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md w-32"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Add Subtask</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Sub-item..."
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {newSubtasks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {newSubtasks.map((st, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                  >
                    <span>{st}</span>
                    <button
                      type="button"
                      onClick={() => setNewSubtasks(newSubtasks.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                Create Task
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Content Area: Kanban or List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No tasks match your criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Try adjusting your filter, adding a new task, or ask the AI Chat copilot: &quot;Create 3 tasks for launching a product&quot;.
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* Column 1: Pending */}
            <KanbanColumn
              title="To Do / Pending"
              count={filteredTodos.filter((t) => t.status === 'pending' && !t.completed).length}
              color="border-slate-300 dark:border-slate-700"
              todos={filteredTodos.filter((t) => t.status === 'pending' && !t.completed)}
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
              count={filteredTodos.filter((t) => t.status === 'in_progress' && !t.completed).length}
              color="border-blue-400 dark:border-blue-700"
              todos={filteredTodos.filter((t) => t.status === 'in_progress' && !t.completed)}
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
          /* List View */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
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
                    onChange={(e) => handleStatusChange(todo.id, e.target.value as TaskStatus)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  <button
                    onClick={() => handleDelete(todo.id, todo.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface KanbanColumnProps {
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

const KanbanColumn: React.FC<KanbanColumnProps> = ({
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
