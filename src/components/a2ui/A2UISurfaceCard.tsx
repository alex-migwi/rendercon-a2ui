import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { A2UISurfacePayload } from '../../lib/a2ui-flow';

interface A2UISurfaceCardProps {
  surface: A2UISurfacePayload;
  onDismiss?: () => void;
}

/**
 * Production-ready A2UI Surface Component built to display verified agent intent.
 * Renders the verified metadata, validation status, and agent intent on the active canvas.
 */
export const A2UISurfaceCard: React.FC<A2UISurfaceCardProps> = ({
  surface,
  onDismiss,
}) => {
  return (
    <div className="mb-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-purple-950/30 p-3.5 shadow-xs transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Validation Status & Surface Meta */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {surface.title}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>A2UI Protocol Validated</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {surface.description}
            </p>
          </div>
        </div>

        {/* Right: Validation Info & Action */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {surface.formPrefill && (
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              Auto-filled via WebMCP
            </span>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
