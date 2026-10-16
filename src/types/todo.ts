export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  priority: Priority;
  category?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  subtasks?: Subtask[];
}
