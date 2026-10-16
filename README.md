# TaskFlow WebMCP & A2UI

TaskFlow is an interactive, production-ready task management application built to showcase the **W3C Model Context Protocol (WebMCP)** and the **Agent-to-User Interface (A2UI)** standard.

## Features
- **Dynamic A2UI Canvas**: Kanban Board, Deep Work Focus Mode, Completion & Velocity Analytics, Task Detail Inspector, Task Creator Form, and WebMCP Protocol Inspector.
- **W3C WebMCP Integration**: Standard `document.modelContext` integration allowing in-browser agents and external desktop clients (e.g. Claude Desktop via relay) to inspect and mutate tasks.
- **Multi-Provider Copilot**: Seamlessly switch between Google Gemini, LM Studio (local OpenAI format), and Ollama (local native format) with a unified provider adapter.
- **Instant Reactive Sync**: LocalStorage-backed reactive store synchronizes state in real time across all views and tools.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow diagrams, tool contracts, and technical design decisions.
