import { todoStore } from './store';
import { telemetry } from './telemetry';
import { FormPrefillData, CanvasView } from '../types/canvas';

export type A2UISurfaceType =
  | 'kanban'
  | 'summary'
  | 'focus'
  | 'create_form'
  | 'inspector'
  | 'task_detail';

/**
 * A2UI Surface Contract:
 * Represents the agent-selected, validated interactive canvas surface,
 * complete with prefill form data, data model, and verification status.
 */
export interface A2UISurfacePayload {
  surfaceId: string;
  surfaceType: A2UISurfaceType;
  title: string;
  description: string;
  source: 'agent' | 'user';
  validated: boolean;
  validationErrors?: string[];
  canvasView: CanvasView;
  formPrefill?: FormPrefillData;
  dataModel?: Record<string, any>;
  timestamp: string;
}

/**
 * Validates that an incoming UI payload satisfies A2UI schema standards:
 * - surfaceId and valid surfaceType
 * - 1:1 mapped canvasView
 */
export function validateA2UIPayload(payload: Partial<A2UISurfacePayload>): {
  isValid: boolean;
  errors: string[];
  validatedPayload: A2UISurfacePayload;
} {
  const errors: string[] = [];

  if (!payload.surfaceType) {
    errors.push('Missing required surfaceType');
  }

  const validTypes: A2UISurfaceType[] = [
    'kanban',
    'summary',
    'focus',
    'create_form',
    'inspector',
    'task_detail',
  ];
  const surfaceType = validTypes.includes(payload.surfaceType as A2UISurfaceType)
    ? (payload.surfaceType as A2UISurfaceType)
    : 'kanban';

  let canvasView: CanvasView = 'kanban';
  if (surfaceType === 'create_form') canvasView = 'create';
  else if (surfaceType === 'summary') canvasView = 'summary';
  else if (surfaceType === 'focus') canvasView = 'focus';
  else if (surfaceType === 'inspector') canvasView = 'inspector';
  else if (surfaceType === 'task_detail') canvasView = 'detail';
  else canvasView = 'kanban';

  const validatedPayload: A2UISurfacePayload = {
    surfaceId: payload.surfaceId || `surface-${Date.now()}`,
    surfaceType,
    title: payload.title || `A2UI ${surfaceType.toUpperCase()} Surface`,
    description: payload.description || 'Rendered via validated Agent-to-User Interface flow',
    source: payload.source || 'agent',
    validated: errors.length === 0,
    validationErrors: errors.length > 0 ? errors : undefined,
    canvasView,
    formPrefill: payload.formPrefill,
    dataModel: payload.dataModel,
    timestamp: new Date().toISOString(),
  };

  return {
    isValid: errors.length === 0,
    errors,
    validatedPayload,
  };
}

/**
 * High-level A2UI surface synthesizer for agent tool responses:
 * Converts agent tool executions into validated A2UI surface contracts.
 */
export function synthesizeAgentA2UISurface(
  toolName: string,
  toolArgs: any = {},
  toolResult: any = {},
  chatPrompt: string = ''
): A2UISurfacePayload {
  let surfaceType: A2UISurfaceType = 'kanban';
  let title = 'Tasks Workspace';
  let description = 'Workspace surface rendered by agent';
  let formPrefill: FormPrefillData | undefined = undefined;

  switch (toolName) {
    case 'draft_task_form':
      surfaceType = 'create_form';
      title = `Task Draft: ${toolArgs?.title || 'New Task'}`;
      description = 'Declarative Create Task Form mounted on canvas for human-in-the-loop review';
      formPrefill = {
        title: toolArgs?.title || '',
        description: toolArgs?.description || '',
        priority: toolArgs?.priority || 'medium',
        category: toolArgs?.category || 'Work',
        dueDate: toolArgs?.dueDate || 'Today, 5:00 PM',
        subtasks: Array.isArray(toolArgs?.subtasks) ? toolArgs.subtasks : [],
      };
      break;

    case 'show_canvas_surface': {
      const target = toolArgs?.surface || 'kanban';
      if (target === 'summary') {
        surfaceType = 'summary';
        title = 'Task Completion & Analytics Summary';
        description = 'Analytics surface showing velocity, category breakdowns, and completion rate';
      } else if (target === 'focus') {
        surfaceType = 'focus';
        title = 'Focus Mode (Deep Work)';
        description = 'Isolated high-priority focus queue';
      } else if (target === 'inspector') {
        surfaceType = 'inspector';
        title = 'WebMCP Protocol Telemetry Inspector';
        description = 'Live JSON-RPC audit logs and agent telemetry';
      } else if (target === 'detail') {
        surfaceType = 'task_detail';
        title = 'Task Details';
        description = 'Comprehensive task metadata and checklist breakdown';
      } else {
        surfaceType = 'kanban';
        title = 'Interactive Kanban Task Board';
        description = 'Categorized board view of all active and completed tasks';
      }
      break;
    }

    case 'create_todo':
      surfaceType = 'kanban';
      title = 'Task Created';
      description = `Created "${toolArgs?.title}" in active workspace`;
      break;

    case 'open_task_detail':
      surfaceType = 'task_detail';
      title = toolResult?.todo ? `Task: ${toolResult.todo.title}` : 'Task Details';
      description = toolResult?.todo?.description || 'Viewing comprehensive task metadata and subtask checklist';
      break;

    case 'update_subtask':
      surfaceType = 'task_detail';
      title = 'Subtask Updated';
      description = `Updated subtask status in task "${toolResult?.todo?.title || toolArgs?.todoId}"`;
      break;

    default:
      surfaceType = 'kanban';
      title = 'Task Workspace';
      description = 'Active Kanban workspace surface';
      break;
  }

  // Validate the resulting payload through the official schema validator
  const { validatedPayload } = validateA2UIPayload({
    surfaceId: `surface-${Date.now()}`,
    surfaceType,
    title,
    description,
    source: 'agent',
    formPrefill,
    dataModel: {
      toolName,
      toolArgs,
      toolResult,
      chatPrompt,
      activeTodoCount: todoStore.getFiltered({ status: 'active' }).length,
      completedTodoCount: todoStore.getFiltered({ status: 'completed' }).length,
    },
  });

  // Log to WebMCP / A2UI Telemetry
  telemetry.log({
    phase: 'A2UI_SYNTHESIS',
    method: `A2UI/ValidateSurface[${surfaceType}]`,
    details: `Agent output validated through A2UI flow -> ${validatedPayload.title}`,
    data: {
      surfaceType,
      validated: validatedPayload.validated,
      canvasView: validatedPayload.canvasView,
      formPrefill: validatedPayload.formPrefill,
    },
  });

  return validatedPayload;
}
