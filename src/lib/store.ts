import { Todo, Priority, TaskStatus, Subtask } from '../types/todo';

const STORAGE_KEY = 'webmcp_a2ui_todos_v1';

const INITIAL_TODOS: Todo[] = [
  {
    id: 'todo-1',
    title: 'Prepare WebMCP demo and architecture slides',
    description: 'Explain Model Context Protocol bridge over HTTP and WebWorker relay',
    completed: false,
    status: 'in_progress',
    priority: 'high',
    category: 'Work',
    dueDate: 'Today, 4:00 PM',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    subtasks: [
      { id: 'sub-1', title: 'Draft tool calling schema', completed: true },
      { id: 'sub-2', title: 'Prepare ASCII sequence diagram', completed: true },
      { id: 'sub-3', title: 'Record 60-second walkthrough', completed: false },
    ],
  },
  {
    id: 'todo-2',
    title: 'Review A2UI declarative rendering spec',
    description: 'Ensure Column, List, and interactive Checkbox widgets synchronize state',
    completed: true,
    status: 'completed',
    priority: 'urgent',
    category: 'Dev',
    dueDate: 'Yesterday',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    subtasks: [
      { id: 'sub-4', title: 'Define A2UINode types', completed: true },
      { id: 'sub-5', title: 'Verify React 19 concurrent hydration', completed: true },
    ],
  },
  {
    id: 'todo-3',
    title: 'Test local LLM tool calling in LM Studio & Ollama',
    description: 'Verify localhost:1234/v1 OpenAI format and localhost:11434 endpoints',
    completed: false,
    status: 'pending',
    priority: 'medium',
    category: 'Dev',
    dueDate: 'Tomorrow',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    subtasks: [
      { id: 'sub-6', title: 'Download qwen2.5-coder or llama3.1', completed: true },
      { id: 'sub-7', title: 'Run curl test with MCP tool declarations', completed: false },
    ],
  },
  {
    id: 'todo-4',
    title: 'Configure Claude Desktop MCP relay',
    description: 'Connect desktop client via @mcp-b/webmcp-local-relay bridge',
    completed: false,
    status: 'pending',
    priority: 'medium',
    category: 'Dev',
    dueDate: 'Friday',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'todo-5',
    title: 'Buy whole bean coffee and oat milk',
    description: 'Ethiopian light roast preferred',
    completed: false,
    status: 'pending',
    priority: 'low',
    category: 'Personal',
    dueDate: 'Saturday',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

type Listener = (todos: Todo[]) => void;

class TodoStore {
  private todos: Todo[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') {
      this.todos = INITIAL_TODOS;
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.todos = JSON.parse(stored);
      } else {
        this.todos = INITIAL_TODOS;
        this.save();
      }
    } catch {
      this.todos = INITIAL_TODOS;
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos));
      } catch (e) {
        console.error('Error saving todos to localStorage:', e);
      }
    }
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener([...this.todos]);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.todos]);
    return () => this.listeners.delete(listener);
  }

  public getAll(): Todo[] {
    return [...this.todos];
  }

  public getFiltered(options?: {
    status?: string;
    priority?: string;
    category?: string;
    query?: string;
  }): Todo[] {
    let result = [...this.todos];

    if (options?.status) {
      const s = options.status.toLowerCase();
      if (s === 'active') {
        result = result.filter((t) => !t.completed);
      } else if (s === 'completed') {
        result = result.filter((t) => t.completed);
      } else if (s === 'pending') {
        result = result.filter((t) => t.status === 'pending');
      } else if (s === 'in_progress') {
        result = result.filter((t) => t.status === 'in_progress');
      }
    }

    if (options?.priority) {
      result = result.filter((t) => t.priority.toLowerCase() === options.priority?.toLowerCase());
    }

    if (options?.category) {
      result = result.filter(
        (t) => t.category?.toLowerCase() === options.category?.toLowerCase()
      );
    }

    if (options?.query) {
      const q = options.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public add(data: {
    title: string;
    description?: string;
    priority?: Priority;
    category?: string;
    dueDate?: string;
    subtasks?: string[];
  }): Todo {
    const newTodo: Todo = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      description: data.description?.trim(),
      completed: false,
      status: 'pending',
      priority: data.priority || 'medium',
      category: data.category || 'General',
      dueDate: data.dueDate || 'Today',
      createdAt: new Date().toISOString(),
      subtasks: data.subtasks?.map((st, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: st.trim(),
        completed: false,
      })),
    };

    this.todos = [newTodo, ...this.todos];
    this.save();
    return newTodo;
  }

  public update(id: string, updates: Partial<Todo>): Todo | null {
    const idx = this.todos.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const existing = this.todos[idx];
    const updated: Todo = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Keep status and completed in sync
    if (updates.completed !== undefined && updates.status === undefined) {
      updated.status = updates.completed ? 'completed' : 'pending';
    } else if (updates.status !== undefined && updates.completed === undefined) {
      updated.completed = updates.status === 'completed';
    }

    this.todos[idx] = updated;
    this.save();
    return updated;
  }

  public toggleComplete(id: string, completed?: boolean): Todo | null {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return null;

    const nextCompleted = completed !== undefined ? completed : !todo.completed;
    return this.update(id, {
      completed: nextCompleted,
      status: nextCompleted ? 'completed' : 'pending',
    });
  }

  public getById(id: string): Todo | null {
    return this.todos.find((t) => t.id === id) || null;
  }

  public toggleSubtask(todoId: string, subtaskId: string): Todo | null {
    const todo = this.todos.find((t) => t.id === todoId);
    if (!todo || !todo.subtasks) return null;

    const updatedSubtasks = todo.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);

    return this.update(todoId, {
      subtasks: updatedSubtasks,
      completed: allCompleted ? true : todo.completed,
      status: allCompleted ? 'completed' : todo.status,
    });
  }

  public updateSubtask(
    todoId: string,
    subtaskId: string,
    updates: { title?: string; completed?: boolean }
  ): Todo | null {
    const todo = this.todos.find((t) => t.id === todoId);
    if (!todo || !todo.subtasks) return null;

    const updatedSubtasks = todo.subtasks.map((st) => {
      if (st.id === subtaskId) {
        return {
          ...st,
          title: updates.title !== undefined ? updates.title.trim() : st.title,
          completed: updates.completed !== undefined ? updates.completed : st.completed,
        };
      }
      return st;
    });

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);

    return this.update(todoId, {
      subtasks: updatedSubtasks,
      completed: allCompleted ? true : todo.completed,
      status: allCompleted ? 'completed' : todo.status,
    });
  }

  public addSubtask(todoId: string, title: string): Todo | null {
    const todo = this.todos.find((t) => t.id === todoId);
    if (!todo) return null;
    const newSub: { id: string; title: string; completed: boolean } = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: title.trim(),
      completed: false,
    };
    const subtasks = [...(todo.subtasks || []), newSub];
    return this.update(todoId, { subtasks });
  }

  public deleteSubtask(todoId: string, subtaskId: string): Todo | null {
    const todo = this.todos.find((t) => t.id === todoId);
    if (!todo || !todo.subtasks) return null;
    const subtasks = todo.subtasks.filter((s) => s.id !== subtaskId);
    return this.update(todoId, { subtasks });
  }

  public delete(id: string): boolean {
    const lenBefore = this.todos.length;
    this.todos = this.todos.filter((t) => t.id !== id);
    if (this.todos.length !== lenBefore) {
      this.save();
      return true;
    }
    return false;
  }

  public clearCompleted(): number {
    const completedCount = this.todos.filter((t) => t.completed).length;
    this.todos = this.todos.filter((t) => !t.completed);
    this.save();
    return completedCount;
  }
}

export const todoStore = new TodoStore();
