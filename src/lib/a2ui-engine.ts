import { MessageProcessor } from '@a2ui/web_core/v0_9';
import type { SurfaceModel, ActionPayload } from '@a2ui/web_core/v0_9';
import { basicCatalog, ReactComponentImplementation } from '@a2ui/react/v0_9';
import { telemetry } from './telemetry';

export type A2UISurface = SurfaceModel<ReactComponentImplementation>;

export interface A2UIActionEvent {
  name: string;
  context: Record<string, unknown>;
  surfaceId: string;
  sourceComponentId: string;
}

export interface A2UISurfaceMeta {
  surfaceId: string;
  title: string;
  messages: unknown[];
  renderedAt: string;
}

export type A2UIRenderResult =
  | { ok: true; surfaceId: string; componentCount: number; messages: unknown[] }
  | { ok: false; errors: string[] };

type SurfaceListener = () => void;
type ActionListener = (action: A2UIActionEvent) => void;

/**
 * A2UI v0.9 engine: owns the official MessageProcessor and the active surface.
 * Agent tool calls arrive as declarative component trees, are validated by the
 * processor against the basic catalog, and render through A2uiSurface.
 * Component actions (e.g. Button clicks) are dispatched back out to the agent.
 */
let processor: MessageProcessor | null = null;
let activeSurfaceId: string | null = null;
let activeMeta: A2UISurfaceMeta | null = null;
const surfaceListeners = new Set<SurfaceListener>();
const actionListeners = new Set<ActionListener>();

function getProcessor(): MessageProcessor {
  if (!processor) {
    // Global action handler receives every action dispatched from any surface.
    processor = new MessageProcessor([basicCatalog], (action: ActionPayload) => {
      const event: A2UIActionEvent = {
        name: action.name,
        context: action.context || {},
        surfaceId: action.surfaceId,
        sourceComponentId: action.sourceComponentId,
      };
      telemetry.log({
        phase: 'A2UI_ACTION',
        method: `A2UI/Action[${event.name}]`,
        details: `Action "${event.name}" dispatched from component ${event.sourceComponentId}`,
        data: { action: event },
      });
      for (const listener of actionListeners) listener(event);
    });
  }
  return processor;
}

function notifySurfaces() {
  for (const listener of surfaceListeners) listener();
}

/**
 * Validates an agent-emitted component tree against the live basic catalog
 * before touching the processor. The SDK's processMessages does NOT throw on
 * unknown component names or dangling child references, so we enforce here:
 * - every node must be an object with a string `id` and a `component` name
 *   that exists in the basic catalog;
 * - the remaining props are validated against that component's Zod schema
 *   (schemas cover props only; `id`/`component` are checked separately);
 * - child ids referenced via `child` / `children` must exist in the tree.
 */
function validateComponentTree(components: unknown[]): string[] {
  const errors: string[] = [];
  const catalogComponents = basicCatalog.components as unknown as Map<string, { schema?: { safeParse: (v: unknown) => { success: boolean; error?: any } } }>;
  const ids = new Set<string>();

  components.forEach((raw, i) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      errors.push(`Node ${i}: expected an object, got ${Array.isArray(raw) ? 'array' : typeof raw}.`);
      return;
    }
    const node = raw as Record<string, unknown>;
    const id = node.id;
    if (typeof id !== 'string' || !id) {
      errors.push(`Node ${i}: missing a valid string 'id'.`);
      return;
    }
    if (ids.has(id)) {
      errors.push(`Node "${id}": duplicate id — every component node must have a unique 'id'.`);
      return;
    }
    ids.add(id);

    const component = node.component;
    if (typeof component !== 'string' || !component) {
      errors.push(`Component "${id}": missing a valid string 'component'.`);
      return;
    }
    const api = catalogComponents.get(component);
    if (!api) {
      errors.push(`Component "${id}": "${component}" is not in the A2UI v0.9 basic catalog. Valid components: ${[...catalogComponents.keys()].join(', ')}.`);
      return;
    }
    if (api.schema) {
      const { id: _id, component: _component, ...props } = node;
      const result = api.schema.safeParse(props);
      if (!result.success) {
        for (const issue of result.error?.issues ?? []) {
          const path = issue.path?.length ? `.${issue.path.join('.')}` : '';
          errors.push(`Component "${id}" (${component}) at ${id}${path}: ${issue.message}.`);
        }
      }
    }
  });

  // Child references must resolve to nodes in the same tree.
  for (const raw of components) {
    if (typeof raw !== 'object' || raw === null) continue;
    const node = raw as Record<string, unknown>;
    if (typeof node.id !== 'string') continue;
    const refs: Array<string | string[]> = [];
    if (typeof node.child === 'string') refs.push(node.child);
    if (Array.isArray(node.children)) refs.push(node.children as string[]);
    for (const ref of refs) {
      const list = Array.isArray(ref) ? ref : [ref];
      for (const childId of list) {
        if (typeof childId === 'string' && !ids.has(childId)) {
          errors.push(`Component "${node.id}" references child "${childId}" which does not exist in the tree.`);
        }
      }
    }
  }

  return errors;
}

/**
 * Validates and renders a declarative A2UI component tree emitted by the agent.
 * The tree is first checked against the live basic catalog (component names and
 * per-component Zod schemas), then handed to the official MessageProcessor.
 * Invalid trees are rejected with readable errors so the agent can correct
 * them; a rejected render never disturbs the surface currently on screen.
 */
export function renderA2UISurface(args: {
  title?: string;
  components?: unknown;
  data?: unknown;
}): A2UIRenderResult {
  const p = getProcessor();
  const components = Array.isArray(args.components) ? args.components : null;
  if (!components || components.length === 0) {
    return { ok: false, errors: ['"components" must be a non-empty array of component nodes'] };
  }

  const surfaceId = `agent-surface-${Date.now()}`;

  // Reject invalid trees before the processor sees them, so the currently
  // active surface is guaranteed to be untouched on failure.
  const validationErrors = validateComponentTree(components);
  if (validationErrors.length > 0) {
    telemetry.log({
      phase: 'A2UI_SYNTHESIS',
      method: 'A2UI/ValidateSurface[rejected]',
      details: `Agent surface rejected by basic-catalog validation: ${validationErrors[0]}`,
      data: { errors: validationErrors, surfaceId },
    });
    return { ok: false, errors: validationErrors };
  }

  const messages: unknown[] = [
    { version: 'v0.9', createSurface: { surfaceId, catalogId: basicCatalog.id } },
    { version: 'v0.9', updateComponents: { surfaceId, components } },
  ];
  if (args.data && typeof args.data === 'object') {
    messages.push({ version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: args.data } });
  }

  const previousSurfaceId = activeSurfaceId;

  try {
    p.processMessages(messages as never);
  } catch (err: any) {
    // Roll back only the half-built surface we just created; the previously
    // active surface (if any) stays on screen untouched.
    try {
      p.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId } }] as never);
    } catch {
      /* surface was never created; nothing to roll back */
    }
    const errors = [err?.message || 'A2UI schema validation failed'];
    telemetry.log({
      phase: 'A2UI_SYNTHESIS',
      method: 'A2UI/ValidateSurface[rejected]',
      details: `Agent surface rejected by the message processor: ${errors[0]}`,
      data: { errors, surfaceId },
    });
    return { ok: false, errors };
  }

  // Commit: clean up the previously rendered agent surface only after the new
  // one has fully rendered.
  if (previousSurfaceId && previousSurfaceId !== surfaceId) {
    try {
      p.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId: previousSurfaceId } }] as never);
    } catch {
      /* previous surface already gone */
    }
  }

  activeSurfaceId = surfaceId;
  activeMeta = {
    surfaceId,
    title: args.title || 'Agent Surface',
    messages,
    renderedAt: new Date().toISOString(),
  };
  notifySurfaces();

  telemetry.log({
    phase: 'A2UI_SYNTHESIS',
    method: 'A2UI/MessageProcessor.processMessages',
    details: `Rendered agent surface "${activeMeta.title}" (${components.length} component nodes, validated against the basic catalog schemas)`,
    data: {
      surfaceId,
      componentCount: components.length,
      hasDataModel: messages.length === 3,
    },
  });

  return { ok: true, surfaceId, componentCount: components.length, messages };
}

export function getActiveSurface(): A2UISurface | undefined {
  if (!activeSurfaceId) return undefined;
  return getProcessor().getSurface(activeSurfaceId) as A2UISurface | undefined;
}

export function getActiveSurfaceMeta(): A2UISurfaceMeta | null {
  return activeMeta;
}

export function onA2UISurfaceChange(listener: SurfaceListener): () => void {
  surfaceListeners.add(listener);
  return () => surfaceListeners.delete(listener);
}

export function onA2UIAction(listener: ActionListener): () => void {
  actionListeners.add(listener);
  return () => actionListeners.delete(listener);
}
