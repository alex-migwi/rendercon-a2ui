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
 * WebMCP Integration Hook.
 * Registers all canonical tools into the browser's `document.modelContext` (WebMCP draft API, provided via the @mcp-b polyfill).
 * When invoked by an in-browser agent or extension, tools execute directly against the store
 * (or the A2UI engine for declarative surfaces) with zero middleman layers.
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
      const { result } = await executeDirectTool('draft_task_form', args);
      if (onDraftTaskForm && result.prefill) {
        onDraftTaskForm(result.prefill);
      }
      return result;
    },
  });

  // 2. show_canvas_surface (Canvas navigation)
  const showDef = getTool('show_canvas_surface');
  useWebMCP({
    name: showDef.name,
    description: showDef.description,
    inputSchema: showDef.parameters as any,
    execute: async (args: any) => {
      const { result, canvasView } = await executeDirectTool('show_canvas_surface', args);
      if (onNavigateCanvas) {
        onNavigateCanvas(canvasView);
      }
      return result;
    },
  });

  // 3. render_a2ui_surface (Agent-composed declarative A2UI tree)
  const renderDef = getTool('render_a2ui_surface');
  useWebMCP({
    name: renderDef.name,
    description: renderDef.description,
    inputSchema: renderDef.parameters as any,
    execute: async (args: any) => {
      const { result, canvasView } = await executeDirectTool('render_a2ui_surface', args);
      if (result.success && onNavigateCanvas) {
        onNavigateCanvas(canvasView);
      }
      return result;
    },
  });

  // 4. get_todos (Query active or completed tasks)
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

  // 5. create_todo (Save new task)
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

  // 6. complete_todo (Toggle completion status)
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

  // 7. update_todo (Mutate task properties)
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

  // 8. delete_todo (Remove task)
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

  // 9. clear_completed (Bulk cleanup)
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

  // 10. update_subtask (Update or toggle subtask status)
  const updateSubtaskDef = getTool('update_subtask');
  useWebMCP({
    name: updateSubtaskDef.name,
    description: updateSubtaskDef.description,
    inputSchema: updateSubtaskDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('update_subtask', args);
      return result;
    },
  });

  // 11. open_task_detail (Open task detail screen on canvas)
  const openDetailDef = getTool('open_task_detail');
  useWebMCP({
    name: openDetailDef.name,
    description: openDetailDef.description,
    inputSchema: openDetailDef.parameters as any,
    execute: async (args: any) => {
      const { result } = await executeDirectTool('open_task_detail', args);
      if (onOpenTaskDetail) {
        onOpenTaskDetail(result.selectedTaskId);
      } else if (onNavigateCanvas) {
        onNavigateCanvas('detail');
      }
      return result;
    },
  });
}
