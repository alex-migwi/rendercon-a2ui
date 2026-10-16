import React, { useState } from 'react';
import { Copy, Check, Terminal, BookOpen, Layers, Laptop } from 'lucide-react';

interface DesktopClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopClientModal: React.FC<DesktopClientModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'arch' | 'desktop'>('console');

  if (!isOpen) return null;

  const consoleSnippet1 = `const tools = await document.modelContext.getTools();
console.table(tools.map(t => ({ name: t.name, description: t.description })));`;

  const consoleSnippet2 = `await document.modelContext.executeTool('draft_task_form', {
  title: 'Audit WebMCP Security Policies',
  priority: 'urgent',
  category: 'Dev',
  dueDate: 'Tomorrow',
  subtasks: ['Review origin permissions', 'Validate A2UI schemas', 'Test tool execution isolation']
});`;

  const desktopBridgeSnippet = `{
  "mcpServers": {
    "taskflow-webmcp": {
      "command": "npx",
      "args": ["-y", "@mcp-b/webmcp-local-relay"]
    }
  }
}`;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>WebMCP & A2UI Production Reference</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-semibold">
                  Official W3C
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How WebMCP and Agent-to-User Interface (A2UI) are implemented in production.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('console')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'console'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Console Test</span>
          </button>
          <button
            onClick={() => setActiveTab('arch')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'arch'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Production Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'desktop'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop Bridge</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {activeTab === 'console' && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                Because this application runs standard W3C WebMCP (via <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">@mcp-b/global</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">@mcp-b/react-webmcp</code>), the browser window itself exposes live tools to browser agents.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Step 1: List all active tools in your browser console:
                  </span>
                  <button
                    onClick={() => handleCopy('c1', consoleSnippet1)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'c1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'c1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {consoleSnippet1}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Step 2: Trigger direct tool execution with A2UI synthesis:
                  </span>
                  <button
                    onClick={() => handleCopy('c2', consoleSnippet2)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'c2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'c2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-indigo-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {consoleSnippet2}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'arch' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">
                How Production WebMCP + A2UI Actually Works
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                <li>
                  <strong>Canonical Tool Contract:</strong> Tools are declared once in a unified schema shared between Gemini function calling and WebMCP descriptors.
                </li>
                <li>
                  <strong>Direct Execution Engine:</strong> Tools mutate the workspace store directly with zero middleman switch layers.
                </li>
                <li>
                  <strong>W3C Standard Registration:</strong> Uses the <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">useWebMCP()</code> hook to register tools directly into <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">document.modelContext</code>.
                </li>
                <li>
                  <strong>A2UI Validation Pipeline:</strong> Validates agent surface payloads against the official component catalog before mounting on the canvas.
                </li>
                <li>
                  <strong>Telemetry Bus:</strong> Captures end-to-end execution events for observability and real-time state synchronization.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">
                Bridging to Desktop Agents (Claude Desktop, Cursor, Ollama)
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Desktop MCP agents communicate using standard stdio or SSE. The official <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">@mcp-b/webmcp-local-relay</code> bridge package automatically bridges local desktop stdio to in-browser WebMCP contexts:
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Desktop Config (<code className="font-mono text-[11px]">claude_desktop_config.json</code>):
                  </span>
                  <button
                    onClick={() => handleCopy('bridge', desktopBridgeSnippet)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'bridge' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'bridge' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-amber-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {desktopBridgeSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <span className="text-[11px] text-slate-500 font-mono">
            spec: W3C Model Context Protocol 1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
