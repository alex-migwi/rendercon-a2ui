import { Type } from '@google/genai';

export interface ToolProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string; description?: string };
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
      'WebMCP tool to mount and autofill the built-in Create Task Form view on the canvas with structured details extracted from user instructions, enabling human-in-the-loop validation and editing before saving.',
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
      'Canvas navigation tool to switch the active workspace canvas to a built-in first-party view: "kanban" (all tasks), "summary" (completion analytics and metrics), "focus" (urgent/high priority deep work), or "inspector" (live WebMCP protocol telemetry). These are hand-authored React surfaces, not agent-composed A2UI trees; use render_a2ui_surface for custom A2UI views.',
    parameters: {
      type: 'object',
      properties: {
        surface: {
          type: 'string',
          enum: ['kanban', 'summary', 'focus', 'inspector', 'detail'],
          description: 'The target built-in canvas view to render on the main canvas',
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
  {
    name: 'render_a2ui_surface',
    description:
      'Compose and render a declarative A2UI v0.9 component tree on the main canvas. ' +
      'The tree is validated against the official A2UI basic catalog (component names, props, and child references) before rendering; invalid trees are rejected with per-node errors you can correct. ' +
      'Use this when the user asks for a custom view, report, dashboard, matrix, or summary that is not one of the built-in views. ' +
      'The tree is a FLAT array of nodes, each: { "id": string, "component": string, ...props }. Children are referenced by id, not nested. ' +
      'The first node is the root and must be a Column. ' +
      'Components: ' +
      'Column { children: string[] (child ids) }, ' +
      'Row { children: string[] }, ' +
      'Card { child: string (single child id) }, ' +
      'Text { text: string OR { "path": "/dataKey" } — supports Markdown }, ' +
      'Button { child: string (Text node id for the label), action: { "event": { "name": string, "context": object } }, variant: "default"|"primary" }, ' +
      'CheckBox { label: string, value: boolean }, ' +
      'TextField { label: string, value: string }, ' +
      'Divider {}, List { items: string[] }, Tabs { tabs: string[], activeTab: string }. ' +
      'The "data" argument holds JSON values that Text props bind to via { "path": "/key" } (JSON Pointer from the surface root, e.g. data { "header": "# Report" } binds with path "/header"). ' +
      'Buttons dispatch their action event back to you when clicked — use the most relevant tool name (e.g. complete_todo, show_canvas_surface) as the action name and include needed ids in context. ' +
      'Example: components [{"id":"root","component":"Column","children":["card","btn"]},{"id":"card","component":"Card","child":"title"},{"id":"title","component":"Text","text":{"path":"/title"}},{"id":"btn","component":"Button","child":"btnLabel","action":{"event":{"name":"show_canvas_surface","context":{"surface":"kanban"}}}},{"id":"btnLabel","component":"Text","text":"Back to board"}], data {"title":"# My Report"}',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short human-readable title of this surface, shown in the canvas header' },
        components: {
          type: 'array',
          items: { type: 'object' },
          description: 'Flat array of declarative A2UI component nodes; children referenced by id',
        },
        data: {
          type: 'object',
          description: 'JSON data model bound into components via { "path": "/key" } props',
        },
      },
      required: ['title', 'components'],
    },
  },
];

/**
 * Transforms the canonical definitions into Google GenAI FunctionDeclaration objects
 * dynamically, preventing duplicate schema declarations on the backend.
 */
export function getGenAIFunctionDeclarations(): any[] {
  const mapType = (t: string): any => {
    if (t === 'boolean') return Type.BOOLEAN;
    if (t === 'object') return Type.OBJECT;
    if (t === 'number' || t === 'integer') return Type.NUMBER;
    return Type.STRING;
  };

  return TASKFLOW_TOOLS.map((tool) => {
    const properties: Record<string, any> = {};

    for (const [key, prop] of Object.entries(tool.parameters.properties)) {
      if (prop.type === 'array') {
        properties[key] = {
          type: Type.ARRAY,
          description: prop.description,
          items: { type: mapType(prop.items?.type || 'string') },
        };
      } else {
        properties[key] = {
          type: mapType(prop.type),
          description: prop.description,
          ...(prop.enum ? { enum: prop.enum } : {}),
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
 * WebMCP Tool Descriptors for document.modelContext (WebMCP draft API via @mcp-b).
 */
export const WEBMCP_TOOLS = TASKFLOW_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.parameters as any,
}));
