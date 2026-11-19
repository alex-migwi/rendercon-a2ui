# TaskFlow WebMCP & A2UI

TaskFlow is an interactive task management application built to showcase the **Web Model Context Protocol (WebMCP)** — a W3C Web Machine Learning Community Group draft — and the **Agent-to-User Interface (A2UI)** protocol (an open specification from [a2ui.org](https://a2ui.org/)).

## Features
- **Workspace Canvas with built-in + agent-composed surfaces**: first-party React views (Kanban Board, Deep Work Focus Mode, Completion & Velocity Analytics, Task Detail, Task Creator Form, WebMCP Protocol Inspector) plus custom **A2UI v0.9** surfaces the agent composes as declarative component trees.
- **WebMCP integration (experimental)**: tools are registered into `document.modelContext` via the `@mcp-b` polyfill, letting in-browser agents and external desktop clients (e.g. Claude Desktop via relay) inspect and mutate tasks. WebMCP is a Community Group draft, not yet a ratified W3C Standard.
- **MCP Streamable HTTP endpoint**: the same canonical tools are available to MCP clients at `/mcp`. Without `MCP_AUTH_TOKEN`, access is localhost-only; when configured, all clients must provide its bearer token and remote access is enabled.
- **Multi-Provider Copilot**: Seamlessly switch between Google Gemini, LM Studio (local OpenAI format), and Ollama (local native format) with a unified provider adapter.
- **Instant Reactive Sync**: LocalStorage-backed reactive store synchronizes state in real time across all views and tools.

The `/mcp` endpoint executes tools in the server process. Its in-memory task store resets when the server restarts and is separate from the browser's LocalStorage-backed store. Canvas navigation/rendering tools return their action results without controlling an already-open browser UI.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow diagrams, tool contracts, and technical design decisions.
