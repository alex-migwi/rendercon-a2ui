import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { McpLogEntry } from '../../types/mcp';
import { telemetry } from '../../lib/telemetry';
import { WEBMCP_TOOLS } from '../../lib/tools';

interface WebMcpInspectorProps {
  onClose?: () => void;
}

export const WebMcpInspector: React.FC<WebMcpInspectorProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<McpLogEntry[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'diagram' | 'tools'>('stream');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = telemetry.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedPhase === 'all') return true;
    return log.phase === selectedPhase;
  });

  const phaseBadge = (phase: McpLogEntry['phase']) => {
    switch (phase) {
      case 'USER_REQUEST':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200';
      case 'AGENT_CALL':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200';
      case 'WEBMCP_EXEC':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
      case 'STORE_SYNC':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200';
      case 'A2UI_SYNTHESIS':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
      case 'A2UI_ACTION':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Inspector Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              WebMCP Protocol Inspector
            </h3>
            <p className="text-[10px] text-slate-400">
              Live JSON-RPC & Relay Telemetry • {logs.length} events logged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'stream'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Stream
            </button>
            <button
              onClick={() => setActiveTab('diagram')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'diagram'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mental Model
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'tools'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tool Schema
            </button>
          </div>

          <button
            onClick={() => telemetry.clear()}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Official Packages Active Bar */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-[11px] shrink-0">
        <div className="flex items-center gap-2 text-emerald-400 shrink-0 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Packages:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            @mcp-b/global@5.1.0
          </span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
            @mcp-b/react-webmcp@5.1.0
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/80">
            @a2ui/react@0.12.0
          </span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
            @a2ui/web_core@0.12.0
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            @mcp-b/webmcp-local-relay
          </span>
        </div>
      </div>

      {/* Tab: Mental Model Sequence Diagram */}
      {activeTab === 'diagram' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto">
            <pre>{`                    ┌──────────────────────┐
                    │      USER            │
                    │                      │
                    │ "List my todos"      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React 19 Chat     │
                    └──────────┬───────────┘
                               │ user message
                               ▼
                    ┌──────────────────────┐
                    │   Agent / LLM        │
                    │                      │
                    │ available tools:     │
                    │ get_todos            │
                    │ create_todo          │
                    │ complete_todo        │
                    └──────────┬───────────┘
                               │ tool call
                               ▼
                    ┌──────────────────────┐
                    │    Bridge / Relay    │
                    └──────────┬───────────┘
                               │ WebMCP
                               ▼
                    ┌──────────────────────┐
                    │    React App         │
                    │                      │
                    │ get_todos()          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Todo Store/API    │
                    └──────────┬───────────┘
                               │ todos[]
                               ▼
                    ┌──────────────────────┐
                    │    WebMCP Result     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      LLM             │
                    │                      │
                    │ "I'll render a list" │
                    └──────────┬───────────┘
                               │ A2UI
                               ▼
                    ┌──────────────────────┐
                    │    A2UI messages     │
                    │                      │
                    │ Column               │
                    │ ├── Text             │
                    │ └── List             │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ A2UI React Renderer  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     USER             │
                    │                      │
                    │ Your todos            │
                    │                      │
                    │ □ Buy milk            │
                    │ □ Ship code           │
                    │ ☑ Pay rent            │
                    └──────────────────────┘`}</pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-850 border border-slate-700/80 space-y-2 text-xs">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bidirectional A2UI Feedback Loop Active</span>
            </h4>
            <p className="text-slate-300">
              User interactions on A2UI components update the shared store directly, keeping the kanban board, canvas, and assistant context synchronized.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Tool Schemas */}
      {activeTab === 'tools' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Registered WebMCP tools exposed to Gemini, LM Studio, Ollama, and Desktop MCP clients:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WEBMCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="p-3 rounded-xl bg-slate-850 border border-slate-700/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-400 font-semibold">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{tool.name}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    Tool
                  </span>
                </div>

                <p className="text-xs text-slate-300">{tool.description}</p>

                <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  <pre className="bg-slate-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(tool.inputSchema.properties, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Live Stream */}
      {activeTab === 'stream' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'USER_REQUEST', label: 'User Request' },
              { id: 'AGENT_CALL', label: 'Agent Call' },
              { id: 'WEBMCP_EXEC', label: 'WebMCP Exec' },
              { id: 'STORE_SYNC', label: 'Store Sync' },
              { id: 'A2UI_SYNTHESIS', label: 'A2UI Synthesis' },
              { id: 'A2UI_ACTION', label: 'A2UI Action' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPhase(p.id)}
                className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition ${
                  selectedPhase === p.id
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Event Stream List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-xs">
                No events recorded yet. Send a message in the chat to see real-time WebMCP logs!
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasData = log.data !== undefined;

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => hasData && setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>

                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${phaseBadge(
                            log.phase
                          )}`}
                        >
                          {log.phase}
                        </span>

                        <span className="text-indigo-400 font-semibold">{log.method}</span>

                        {log.durationMs !== undefined && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1 rounded">
                            {log.durationMs}ms
                          </span>
                        )}
                      </div>

                      {hasData && (
                        <div className="text-slate-500 hover:text-slate-300">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-slate-300 mt-1 font-sans text-xs leading-snug">
                      {log.details}
                    </p>

                    {isExpanded && hasData && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>PAYLOAD / JSON-RPC</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(log.id, JSON.stringify(log.data, null, 2));
                            }}
                            className="flex items-center gap-1 hover:text-white"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === log.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-2 bg-slate-900 rounded text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
