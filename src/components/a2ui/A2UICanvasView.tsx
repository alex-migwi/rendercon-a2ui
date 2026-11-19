import React, { useState, useEffect } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { Zap, Code2, Eye } from 'lucide-react';
import {
  getActiveSurface,
  getActiveSurfaceMeta,
  onA2UISurfaceChange,
} from '../../lib/a2ui-engine';

interface A2UICanvasViewProps {
  onPromptChat?: (prompt: string) => void;
}

/**
 * Renders the active agent-composed A2UI surface through the official
 * @a2ui/react v0.9 engine. The component tree was emitted by the agent as
 * declarative JSON and validated by the MessageProcessor against the basic
 * catalog; interactions inside the surface dispatch actions back to the agent.
 */
export const A2UICanvasView: React.FC<A2UICanvasViewProps> = ({ onPromptChat }) => {
  const [showJson, setShowJson] = useState(false);
  const [surface, setSurface] = useState(() => getActiveSurface());
  const meta = getActiveSurfaceMeta();

  useEffect(() => {
    return onA2UISurfaceChange(() => {
      setSurface(getActiveSurface());
      setShowJson(false);
    });
  }, []);

  if (!surface || !meta) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center space-y-3 p-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No agent surface rendered yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ask the Copilot to compose a custom view — e.g. &quot;build an Eisenhower matrix of my
            tasks&quot; or &quot;show me a sprint report&quot;. The agent emits a declarative A2UI
            component tree that renders here.
          </p>
          {onPromptChat && (
            <button
              onClick={() => onPromptChat('Build an Eisenhower priority matrix of my tasks as a custom A2UI surface')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
            >
              Try: Eisenhower matrix
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Surface header: what the agent composed + AST toggle */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {meta.title}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              A2UI v0.9 &middot; {meta.surfaceId} &middot; validated vs basic catalog &middot; rendered by official @a2ui engine
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowJson(!showJson)}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
            showJson
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle the declarative JSON the agent emitted"
        >
          {showJson ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
          <span>{showJson ? 'Rendered UI' : 'AST JSON'}</span>
        </button>
      </div>

      {/* Surface body: rendered tree or raw protocol messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {showJson ? (
          <div className="max-w-4xl mx-auto bg-slate-950 text-slate-100 rounded-2xl p-5 border border-slate-800 font-mono text-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                A2UI v0.9 Protocol Messages
              </span>
              <span className="text-emerald-400 text-[11px]">Schema-Validated</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(meta.messages, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <A2uiSurface surface={surface} />
          </div>
        )}
      </div>
    </div>
  );
};
