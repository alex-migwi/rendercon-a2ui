import { todoStore } from './store';
import { telemetry } from './telemetry';
import { renderA2UISurface } from './a2ui-engine';
import { Todo } from '../types/todo';
import { CanvasView, FormPrefillData } from '../types/canvas';

export interface ToolExecutionResponse {
  result: any;
  /** Canvas view this tool execution renders on the main surface. */
  canvasView: CanvasView;
  formPrefill?: FormPrefillData;
  selectedTaskId?: string;
}

/**
 * Direct Execution Engine for WebMCP Tools.
 * Executes tools directly against the store (or the A2UI engine), records
 * telemetry, and reports which canvas view the result renders on.
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
  let canvasView: CanvasView = 'kanban';
  let formPrefill: FormPrefillData | undefined;
  let selectedTaskId: string | undefined;

  switch (toolName) {
    case 'draft_task_form': {
      formPrefill = {
        title: args.title || 'New Task',
        description: args.description || '',
        priority: args.priority || 'medium',
        category: args.category || 'Work',
        dueDate: args.dueDate || 'Today, 5:00 PM',
        subtasks: Array.isArray(args.subtasks) ? args.subtasks : [],
      };
      canvasView = 'create';
      result = { success: true, action: 'MOUNT_FORM_ON_CANVAS', prefill: formPrefill };
      break;
    }

    case 'show_canvas_surface': {
      const surface = args.surface || 'kanban';
      canvasView =
        surface === 'summary' || surface === 'focus' || surface === 'inspector' || surface === 'detail'
          ? surface
          : 'kanban';
      result = { success: true, surface, focusCategory: args.focusCategory };
      break;
    }

    case 'render_a2ui_surface': {
      const render = renderA2UISurface({
        title: args.title,
        components: args.components,
        data: args.data,
      });
      if ('surfaceId' in render) {
        canvasView = 'a2ui';
        result = { success: true, surfaceId: render.surfaceId, componentCount: render.componentCount };
      } else {
        result = { success: false, errors: render.errors };
      }
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
      let todoId = args.todoId;
      let subtaskId = args.subtaskId;

      // Resilience: if todoId wasn't provided or didn't match, search across all todos
      if (!todoId) {
        const allTodos = todoStore.getAll();
        for (const t of allTodos) {
          if (
            t.subtasks?.some(
              (s) =>
                s.id === subtaskId ||
                s.title.toLowerCase() === String(subtaskId || '').toLowerCase()
            )
          ) {
            todoId = t.id;
            break;
          }
        }
      }

      // Resilience: if subtaskId was given as a title rather than ID
      if (todoId) {
        const target = todoStore.getById(todoId);
        if (target?.subtasks) {
          const matchedSub = target.subtasks.find(
            (s) =>
              s.id === subtaskId ||
              s.title.toLowerCase() === String(subtaskId || '').toLowerCase()
          );
          if (matchedSub) {
            subtaskId = matchedSub.id;
          }
        }
      }

      const updated =
        todoId && subtaskId
          ? todoStore.updateSubtask(todoId, subtaskId, {
              title: args.title,
              completed: args.completed,
            })
          : null;

      canvasView = 'detail';
      selectedTaskId = todoId;
      result = {
        success: !!updated,
        todoId: todoId || args.todoId,
        subtaskId: subtaskId || args.subtaskId,
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
      canvasView = 'detail';
      selectedTaskId = targetTodo?.id;
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

  return { result, canvasView, formPrefill, selectedTaskId };
}
