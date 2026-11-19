import { McpLogEntry } from '../types/mcp';

type TelemetryListener = (logs: McpLogEntry[]) => void;

/**
 * Production Telemetry & Observability Bus for WebMCP & A2UI operations.
 * Single responsibility: Captures, buffers, and distributes protocol event logs
 * to developer tools, UI inspectors, and external monitors.
 */
class TelemetryBus {
  private logs: McpLogEntry[] = [];
  private listeners: Set<TelemetryListener> = new Set();
  private readonly MAX_LOGS = 150;

  constructor() {
    this.log({
      phase: 'WEBMCP_EXEC',
      method: 'runtime/init',
      details: 'WebMCP & A2UI runtime initialized: tools exposed on document.modelContext via the @mcp-b polyfill',
      data: {
        standards: ['Web Model Context Protocol (WebMCP, W3C CG draft)', 'A2UI (Agent-to-User Interface) v0.9'],
        target: 'window.document.modelContext',
      },
    });
  }

  public log(entry: Omit<McpLogEntry, 'id' | 'timestamp'>) {
    const item: McpLogEntry = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...entry,
    };

    this.logs = [item, ...this.logs.slice(0, this.MAX_LOGS - 1)];
    for (const listener of this.listeners) {
      listener([...this.logs]);
    }
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => this.listeners.delete(listener);
  }

  public clear() {
    this.logs = [];
    for (const listener of this.listeners) {
      listener([]);
    }
  }
}

export const telemetry = new TelemetryBus();
