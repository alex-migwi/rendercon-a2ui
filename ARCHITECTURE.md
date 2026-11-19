# TaskFlow WebMCP & A2UI — Architecture Guide

TaskFlow is an intelligent task management system built on the **Web Model Context Protocol (WebMCP)** — a W3C Web Machine Learning Community Group draft — and the **Agent-to-User Interface (A2UI)** protocol, an open specification from [a2ui.org](https://a2ui.org/).

---

## 1. High-Level Data Flow

```
                      ┌────────────────────────────────────────┐
                      │              User Input                │
                      │  (Conversational Prompt or UI Click)   │
                      └──────────────────┬─────────────────────┘
                                         │
                   ┌─────────────────────▼─────────────────────┐
                   │             Copilot Sidebar               │
                   │        sendProviderMessage() adapter      │
                   │   [ Gemini 3.1 Flash | LM Studio | Ollama ] │
                   └─────────────────────┬─────────────────────┘
                                         │ Tool Call (name, args)
                   ┌─────────────────────▼─────────────────────┐
                   │       executeDirectTool(name, args)       │
                   │  (Direct Execution Engine against Store)  │
                   └──────────┬──────────────────────┬─────────┘
                              │                      │
       Direct State Mutation  │                      │ Synthesize Surface
                              ▼                      ▼
┌────────────────────────────────────────┐  ┌───────────────────────────────────┐
│           Todo Reactive Store          │  │         A2UI v0.9 Engine          │
│  - add / update / delete               │  │  - validateComponentTree()        │
│  - updateSubtask / toggleSubtask       │  │  - MessageProcessor (official)    │
│  - Synchronous localStorage sync       │  │  - create/update/deleteSurface    │
└──────────────────┬─────────────────────┘  └─────────────────┬─────────────────┘
                   │                                          │
                   └─────────────────────┬────────────────────┘
                                         │ Reactive Notification
                   ┌─────────────────────▼─────────────────────┐
                   │            Main Canvas Surfaces           │
                   │  • Kanban Board        • Focus Mode       │
                   │  • Task Detail Screen  • Summary/Metrics  │
                   │  • Task Creator Form   • WebMCP Inspector │
                   └───────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### A. WebMCP Integration (experimental) (`src/hooks/useTaskFlowWebMCP.ts`)
The browser registers canonical tools onto `document.modelContext` via the `@mcp-b/react-webmcp` polyfill. WebMCP is a W3C Web Machine Learning **Community Group draft**, not a ratified standard, so this surface is experimental. It allows:
1. In-browser AI agents to directly discover and call tools without backend proxying.
2. External desktop assistants (e.g. Claude Desktop, Cursor) to communicate via `@mcp-b/webmcp-local-relay`.
3. The built-in Copilot sidebar to dispatch actions uniformly.

### B. Single Source of Truth Tool Contract (`src/lib/tools.ts`)
All 11 tools (`draft_task_form`, `open_task_detail`, `update_subtask`, `get_todos`, `create_todo`, `complete_todo`, `update_todo`, `delete_todo`, `clear_completed`, `show_canvas_surface`, `render_a2ui_surface`) are defined once in JSON Schema and projected into:
- Google GenAI function declarations for Gemini (`getGenAIFunctionDeclarations`).
- WebMCP descriptors for the browser model context (`WEBMCP_TOOLS`).
- MCP tool registrations on the server's Streamable HTTP endpoint (`/mcp`).

The server endpoint is localhost-only unless `MCP_AUTH_TOKEN` is configured, in which case clients must send it as a bearer token. MCP calls execute against an in-memory server-side task store (reset on restart); they do not share the browser's LocalStorage task store or control its canvas.

### C. The A2UI v0.9 Engine (`src/lib/a2ui-engine.ts`)
A2UI is used as a **generative UI protocol**: for custom views the agent composes an arbitrary declarative component tree, which is rendered natively through the official `@a2ui` engine — not a hand-authored React component.
- `render_a2ui_surface` builds `createSurface` / `updateComponents` (and optional `updateDataModel`) messages in the A2UI **v0.9** wire format and feeds them to the official `MessageProcessor` against the **basic catalog** (`https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`).
- Before the processor sees the tree, `validateComponentTree()` enforces catalog membership, per-component Zod prop schemas, and resolvable `child`/`children` references — because the SDK's `processMessages` does not reject unknown components or dangling refs. Invalid trees are rejected with per-node errors so the agent can self-correct, and a rejected render never disturbs the surface currently on screen.
- Button clicks dispatch A2UI **actions** back out through a global handler, closing the loop by telling the copilot which tool to call next.
- The built-in views (`kanban`, `summary`, `focus`, `detail`, `create`, `inspector`) remain first-party React surfaces selected via `show_canvas_surface`; they are not agent-composed A2UI trees. Structured drafts like `draft_task_form` carry typed prefill payloads for human-in-the-loop review.

### D. Unified Provider Adapter (`src/lib/llm-provider.ts`)
ChatPanel interfaces with all LLM backends through a single `sendProviderMessage()` adapter:
- **Gemini 3.1 Flash**: Backend endpoint `/api/chat` with retry and quota fallback.
- **LM Studio**: Local OpenAI-compatible endpoint (`/v1/chat/completions`) via `/api/proxy/llm`.
- **Ollama**: Local Ollama native endpoint (`/api/chat`) via `/api/proxy/llm`.
- **Consistency**: All three providers share identical 6-turn history truncation, active workspace context injection, and error handling.

### E. Authoritative Reactive Store (`src/lib/store.ts`)
- Pure TypeScript pub/sub store with synchronous `localStorage` persistence.
- Any change (from the UI or from a WebMCP tool call) notifies all subscribed views simultaneously, eliminating stale state across the Kanban, Focus Queue, Metrics, and Task Detail screens.
