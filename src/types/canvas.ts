import { Priority } from './todo';

export type CanvasView =
  | 'kanban'
  | 'summary'
  | 'create'
  | 'focus'
  | 'inspector'
  | 'detail'
  | 'a2ui';

export interface FormPrefillData {
  title?: string;
  description?: string;
  priority?: Priority;
  category?: string;
  dueDate?: string;
  subtasks?: string[];
}

export interface CanvasState {
  view: CanvasView;
  selectedTaskId?: string;
  source?: 'user' | 'agent';
  formPrefill?: FormPrefillData;
}
