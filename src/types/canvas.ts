import { Priority } from './todo';
import { A2UISurfacePayload } from '../lib/a2ui-flow';

export type CanvasView =
  | 'kanban'
  | 'summary'
  | 'create'
  | 'focus'
  | 'inspector'
  | 'detail';

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
  a2uiSurface?: A2UISurfacePayload;
}
