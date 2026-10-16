import { useWebMCP } from '@mcp-b/react-webmcp';
import { TASKFLOW_TOOLS } from '../lib/tools';
import { executeDirectTool } from '../lib/tool-execution';
import { FormPrefillData } from '../types/canvas';

interface UseTaskFlowWebMCPProps {
  onDraftTaskForm?: (prefill: FormPrefillData) => void;
  onNavigateCanvas?: (surface: string) => void;
  onOpenTaskDetail?: (todoId?: string) => void;
}

/**
 * Production WebMCP Integration Hook.
 * Registers all canonical tools directly into W3C standard `window.document.modelContext`.
 * When invoked by an in-browser agent or extension, tools execute directly against the store
 * with zero middleman switch layers.
 */
export function useTaskFlowWebMCP({
  onDraftTaskForm,
  onNavigateCanvas,
  onOpenTaskDetail,
}: UseTaskFlowWebMCPProps = {}) {
  const getTool = (name: string) => TASKFLOW_TOOLS.find((t) => t.name === name)!;

  // 1. draft_task_form (Autofills Task creation form on the canvas)
  const draftDef = getTool('draft_task_form');
  useWebMCP({
    name: draftDef.name,
    description: draftDef.description,
    inputSchema: draftDef.parameters as any,
    execute: async (args: any) => {
      const { result, surface } = await executeDirectTool('draft_task_form', args);
      if (onDraftTaskForm && 'prefill' in result && result.prefill) {
        onDraftTaskForm(result.prefill);
      }
      return { success: true, surface, result };
    },
  });

  // 2. show_canvas_surface (A2UI Navigation tool)
  const showDef = getTool('show_canvas_surface');
  useWebMCP({
    name: showDef.name,
    description: showDef.description,
    inputSchema: showDef.parameters as any,
    execute: async (args: any) => {
      const { result, surface } = await executeDirectTool('show_canvas_surface', args);
      if (onNavigateCanvas && args.surface) {
        onNavigateCanvas(args.surface);
      }
      return { success: true, surface, result };
    },
  });

  // 3. get_todos (Query active or completed tasks)
  const getDef = getTool('get_todos');
  useWebMCP({
    name: getDef.name,
    description: getDef.description,
    inputSchema: getDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('get_todos', args);
      return result;
    },
  });

  // 4. create_todo (Save new task)
  const createDef = getTool('create_todo');
  useWebMCP({
    name: createDef.name,
    description: createDef.description,
    inputSchema: createDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('create_todo', args);
      return result;
    },
  });

  // 5. complete_todo (Toggle completion status)
  const completeDef = getTool('complete_todo');
  useWebMCP({
    name: completeDef.name,
    description: completeDef.description,
    inputSchema: completeDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('complete_todo', args);
      return result;
    },
  });

  // 6. update_todo (Mutate task properties)
  const updateDef = getTool('update_todo');
  useWebMCP({
    name: updateDef.name,
    description: updateDef.description,
    inputSchema: updateDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('update_todo', args);
      return result;
    },
  });

  // 7. delete_todo (Remove task)
  const deleteDef = getTool('delete_todo');
  useWebMCP({
    name: deleteDef.name,
    description: deleteDef.description,
    inputSchema: deleteDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('delete_todo', args);
      return result;
    },
  });

  // 8. clear_completed (Bulk cleanup)
  const clearDef = getTool('clear_completed');
  useWebMCP({
    name: clearDef.name,
    description: clearDef.description,
    inputSchema: clearDef.parameters as any,
    execute: async () => {
      const { result } = await executeDirectTool('clear_completed', {});
      return result;
    },
  });

  // 9. update_subtask (Update or toggle subtask status)
  const updateSubtaskDef = getTool('update_subtask');
  useWebMCP({
    name: updateSubtaskDef.name,
    description: updateSubtaskDef.description,
    inputSchema: updateSubtaskDef.parameters as any,
    execute: async (args: any) => {
      const { result, surface } = await executeDirectTool('update_subtask', args);
      return { success: true, surface, result };
    },
  });

  // 10. open_task_detail (Open task detail screen on canvas)
  const openDetailDef = getTool('open_task_detail');
  useWebMCP({
    name: openDetailDef.name,
    description: openDetailDef.description,
    inputSchema: openDetailDef.parameters as any,
    execute: async (args: any) => {
      const { result, surface } = await executeDirectTool('open_task_detail', args);
      const taskId = 'selectedTaskId' in result ? result.selectedTaskId : undefined;
      if (onOpenTaskDetail) {
        onOpenTaskDetail(taskId);
      } else if (onNavigateCanvas) {
        onNavigateCanvas('detail');
      }
      return { success: true, surface, result };
    },
  });
}
