import { Type } from '@google/genai';

export interface ToolProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface CanonicalToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolProperty>;
    required?: string[];
  };
}

/**
 * Single source of truth for all tools in the application.
 * Shared between WebMCP (browser document.modelContext) and Google GenAI (backend).
 */
export const TASKFLOW_TOOLS: CanonicalToolDefinition[] = [
  {
    name: 'draft_task_form',
    description:
      'Declarative WebMCP & A2UI tool to mount and autofill the Create Task Form surface on the canvas with structured details extracted from user instructions, enabling human-in-the-loop validation and editing before saving.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Proposed task title' },
        description: { type: 'string', description: 'Proposed description, notes, or details' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level (low, medium, high, urgent)',
        },
        category: { type: 'string', description: 'Category/tag (e.g. Work, Dev, Personal)' },
        dueDate: { type: 'string', description: 'Due date or timeframe (e.g. Today, Tomorrow 5pm)' },
        subtasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Checklist subtask steps extracted from user instructions',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'show_canvas_surface',
    description:
      'A2UI Navigation tool to switch the active workspace canvas to a validated A2UI surface: "kanban" (all tasks), "summary" (completion analytics and metrics), "focus" (urgent/high priority deep work), or "inspector" (live WebMCP protocol telemetry).',
    parameters: {
      type: 'object',
      properties: {
        surface: {
          type: 'string',
          enum: ['kanban', 'summary', 'focus', 'inspector', 'detail'],
          description: 'The target A2UI surface to render on the main canvas',
        },
        focusCategory: {
          type: 'string',
          description: 'Optional category filter for the surface (e.g. Work, Dev)',
        },
      },
      required: ['surface'],
    },
  },
  {
    name: 'get_todos',
    description: 'Fetch and filter todo items from the active task store.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'active', 'completed', 'pending', 'in_progress'],
          description: 'Filter todos by completion status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filter by priority level',
        },
        category: { type: 'string', description: 'Filter by category tag' },
        query: { type: 'string', description: 'Keyword search query' },
      },
    },
  },
  {
    name: 'create_todo',
    description: 'Directly create and save a new task into the task store.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the task' },
        description: { type: 'string', description: 'Detailed notes or instructions' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level (low, medium, high, urgent)',
        },
        category: { type: 'string', description: 'Category/tag' },
        dueDate: { type: 'string', description: 'Due date or timeframe' },
        subtasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subtask checklist items',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_todo',
    description: 'Toggle or set the completion status of a todo task by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The unique ID of the todo' },
        completed: { type: 'boolean', description: 'Target completed boolean state' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_todo',
    description: 'Update fields of an existing todo task.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The unique ID of the todo to update' },
        title: { type: 'string', description: 'Updated title' },
        description: { type: 'string', description: 'Updated description' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Updated priority',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed'],
          description: 'Updated status',
        },
        category: { type: 'string', description: 'Updated category' },
        dueDate: { type: 'string', description: 'Updated due date' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_todo',
    description: 'Permanently delete a todo task by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The ID of the todo to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'clear_completed',
    description: 'Delete all completed tasks from the active workspace.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_subtask',
    description: 'Update a specific checklist subtask on a todo (e.g. toggle completion or edit title).',
    parameters: {
      type: 'object',
      properties: {
        todoId: { type: 'string', description: 'ID of the parent todo' },
        subtaskId: { type: 'string', description: 'ID of the subtask to update' },
        completed: { type: 'boolean', description: 'Target completed boolean state' },
        title: { type: 'string', description: 'New title or label for the subtask' },
      },
      required: ['todoId', 'subtaskId'],
    },
  },
  {
    name: 'open_task_detail',
    description: 'Open the task detail view on the main canvas for a specific todo by ID or title.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The unique ID of the todo to open (e.g. todo-1)' },
        title: { type: 'string', description: 'Optional title of the task to search and open if ID is not known' },
      },
    },
  },
];

/**
 * Transforms the canonical definitions into Google GenAI FunctionDeclaration objects
 * dynamically, preventing duplicate schema declarations on the backend.
 */
export function getGenAIFunctionDeclarations(): any[] {
  return TASKFLOW_TOOLS.map((tool) => {
    const properties: Record<string, any> = {};

    for (const [key, prop] of Object.entries(tool.parameters.properties)) {
      if (prop.type === 'string') {
        properties[key] = {
          type: Type.STRING,
          description: prop.description,
          ...(prop.enum ? { enum: prop.enum } : {}),
        };
      } else if (prop.type === 'boolean') {
        properties[key] = {
          type: Type.BOOLEAN,
          description: prop.description,
        };
      } else if (prop.type === 'array') {
        properties[key] = {
          type: Type.ARRAY,
          description: prop.description,
          items: { type: Type.STRING },
        };
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties,
        ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
      },
    };
  });
}

/**
 * Standard W3C WebMCP Tool Descriptors for document.modelContext.
 */
export const WEBMCP_TOOLS = TASKFLOW_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.parameters as any,
}));
