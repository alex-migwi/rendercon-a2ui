import { todoStore } from './store';
import { telemetry } from './telemetry';
import { synthesizeAgentA2UISurface, A2UISurfacePayload } from './a2ui-flow';
import { Todo } from '../types/todo';
import { FormPrefillData } from '../types/canvas';

export type ToolResult =
  | { success: true; action: 'MOUNT_FORM_ON_CANVAS'; prefill: FormPrefillData }
  | { success: true; surface: string; focusCategory?: string }
  | { count: number; todos: Todo[] }
  | { success: boolean; todo?: Todo | null }
  | { success: boolean; clearedCount?: number }
  | { success: boolean; todoId?: string; subtaskId?: string; todo?: Todo | null }
  | { success: boolean; todo?: Todo | null; selectedTaskId?: string }
  | { error: string };

export interface ToolExecutionResponse {
  result: ToolResult;
  surface: A2UISurfacePayload;
}

/**
 * Direct Execution Engine for WebMCP Tools.
 * Production pattern: Executes tool directly against the store, records telemetry,
 * and synthesizes a validated A2UI surface for the client canvas.
 * Zero middleman switch layers or pseudo-relays.
 */
export async function executeDirectTool(
  toolName: string,
  args: Record<string, any> = {},
  userPrompt: string = ''
): Promise<ToolExecutionResponse> {
  const startTime = performance.now();

  telemetry.log({
    phase: 'AGENT_CALL',
    method: `tools/call -> ${toolName}`,
    details: `Agent dispatched tool: ${toolName}`,
    data: { arguments: args, prompt: userPrompt },
  });

  let result: any = null;

  switch (toolName) {
    case 'draft_task_form': {
      result = {
        success: true,
        action: 'MOUNT_FORM_ON_CANVAS',
        prefill: {
          title: args.title || 'New Task',
          description: args.description || '',
          priority: args.priority || 'medium',
          category: args.category || 'Work',
          dueDate: args.dueDate || 'Today, 5:00 PM',
          subtasks: Array.isArray(args.subtasks) ? args.subtasks : [],
        },
      };
      break;
    }

    case 'show_canvas_surface': {
      result = {
        success: true,
        surface: args.surface || 'kanban',
        focusCategory: args.focusCategory,
      };
      break;
    }

    case 'get_todos': {
      const todos = todoStore.getFiltered(args);
      result = { count: todos.length, todos };
      break;
    }

    case 'create_todo': {
      const created = todoStore.add({
        title: args.title,
        description: args.description,
        priority: args.priority || 'medium',
        category: args.category || 'General',
        dueDate: args.dueDate || 'Today',
        subtasks: args.subtasks,
      });
      result = { success: true, todo: created };
      break;
    }

    case 'complete_todo': {
      const updated = todoStore.toggleComplete(args.id);
      result = { success: !!updated, todo: updated };
      break;
    }

    case 'update_todo': {
      const updated = todoStore.update(args.id, args);
      result = { success: !!updated, todo: updated };
      break;
    }

    case 'delete_todo': {
      const deleted = todoStore.delete(args.id);
      result = { success: deleted };
      break;
    }

    case 'clear_completed': {
      const count = todoStore.clearCompleted();
      result = { success: true, clearedCount: count };
      break;
    }

    case 'update_subtask': {
      const updated = todoStore.updateSubtask(args.todoId, args.subtaskId, {
        title: args.title,
        completed: args.completed,
      });
      result = {
        success: !!updated,
        todoId: args.todoId,
        subtaskId: args.subtaskId,
        todo: updated,
      };
      break;
    }

    case 'open_task_detail': {
      let targetTodo: Todo | null = null;
      if (args.id) {
        targetTodo = todoStore.getById(args.id);
      }
      if (!targetTodo && args.title) {
        const matches = todoStore.getFiltered({ query: args.title });
        if (matches.length > 0) targetTodo = matches[0];
      }
      if (!targetTodo && todoStore.getAll().length > 0) {
        targetTodo = todoStore.getAll()[0];
      }
      result = {
        success: !!targetTodo,
        todo: targetTodo,
        selectedTaskId: targetTodo?.id,
      };
      break;
    }

    default:
      result = { error: `Unrecognized tool: ${toolName}` };
  }

  const durationMs = Math.round(performance.now() - startTime);

  telemetry.log({
    phase: 'WEBMCP_EXEC',
    method: `webmcp/direct_exec[${toolName}]`,
    details: `Executed tool "${toolName}" in ${durationMs}ms`,
    data: { result },
    durationMs,
  });

  // Synthesize and validate the A2UI surface for this tool operation
  const surface = synthesizeAgentA2UISurface(toolName, args, result, userPrompt);

  return { result, surface };
}
