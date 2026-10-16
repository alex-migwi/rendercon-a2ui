# TaskFlow WebMCP & A2UI — Architecture Guide

TaskFlow is an intelligent task management system built on the **W3C Web Model Context Protocol (WebMCP)** and the **Agent-to-User Interface (A2UI)** paradigm.

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
                   │   [ Gemini 3.8 Flash | LM Studio | Ollama ] │
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
│           Todo Reactive Store          │  │       A2UI Surface Contract       │
│  - add / update / delete               │  │  - validateA2UIPayload()          │
│  - updateSubtask / toggleSubtask       │  │  - Maps surface to CanvasView     │
│  - Synchronous localStorage sync       │  │  - Emits typed form prefill data  │
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

### A. W3C WebMCP Standard (`src/hooks/useTaskFlowWebMCP.ts`)
The browser registers canonical tools directly onto `window.document.modelContext` via `@mcp-b/react-webmcp`. This allows:
1. In-browser AI agents to directly discover and call tools without backend proxying.
2. External desktop assistants (e.g. Claude Desktop, Cursor) to communicate via `@mcp-b/webmcp-local-relay`.
3. The built-in Copilot sidebar to dispatch actions uniformly.

### B. Single Source of Truth Tool Contract (`src/lib/tools.ts`)
All 10 tools (`draft_task_form`, `open_task_detail`, `update_subtask`, `get_todos`, `create_todo`, `complete_todo`, `update_todo`, `delete_todo`, `clear_completed`, `show_canvas_surface`) are defined once in JSON Schema and projected into:
- Google GenAI function declarations for Gemini (`getGenAIFunctionDeclarations`).
- WebMCP standard schemas for browser context (`WEBMCP_TOOLS`).

### C. The Honest A2UI Contract (`src/lib/a2ui-flow.ts`)
In this architecture, A2UI serves as an **agent-selected surface and prefill contract**:
- Rather than rendering arbitrary unvalidated component ASTs, the agent selects from verified workspace surfaces (`kanban`, `summary`, `focus`, `create_form`, `task_detail`, `inspector`).
- Complex drafts (like `draft_task_form`) carry structured `formPrefill` payloads for human-in-the-loop inspection before committing.
- Every surface payload is verified via `validateA2UIPayload` and logged to the telemetry bus.

### D. Unified Provider Adapter (`src/lib/llm-provider.ts`)
ChatPanel interfaces with all LLM backends through a single `sendProviderMessage()` adapter:
- **Gemini 3.8 Flash**: Backend endpoint `/api/chat` with retry and quota fallback.
- **LM Studio**: Local OpenAI-compatible endpoint (`/v1/chat/completions`) via `/api/proxy/llm`.
- **Ollama**: Local Ollama native endpoint (`/api/chat`) via `/api/proxy/llm`.
- **Consistency**: All three providers share identical 6-turn history truncation, active workspace context injection, and error handling.

### E. Authoritative Reactive Store (`src/lib/store.ts`)
- Pure TypeScript pub/sub store with synchronous `localStorage` persistence.
- Any change (from the UI or from a WebMCP tool call) notifies all subscribed views simultaneously, eliminating stale state across the Kanban, Focus Queue, Metrics, and Task Detail screens.
