import React, { useState, useMemo } from 'react';
import { GitCompare, Plus, Minus, Copy, Check, FileCode, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ConfigDiffViewerProps {
  original_state?: string;
  proposed_state?: string;
  originalState?: string;
  proposedState?: string;
  title?: string;
  className?: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNum?: number;
  newLineNum?: number;
  text: string;
}

const DEFAULT_ORIGINAL_CONFIG = `# CockroachDB & AWS Infrastructure Config
cluster_id: "auth-cluster-us-east-1"
max_connections: 100
idle_session_timeout: "0s"
active_worker_nodes: 3
pg_cancel_idle_sessions: false
mcp_governance_status: "AWAITING_APPROVAL"`;

const DEFAULT_PROPOSED_CONFIG = `# CockroachDB & AWS Infrastructure Config
cluster_id: "auth-cluster-us-east-1"
max_connections: 500
idle_session_timeout: "15s"
active_worker_nodes: 8
pg_cancel_idle_sessions: true
mcp_governance_status: "WRITE_CONSENT_GRANTED"`;

/**
 * Computes line-by-line unified diff between original and proposed config strings.
 */
export function computeUnifiedDiff(originalText: string, proposedText: string): DiffLine[] {
  const origLines = originalText.split('\n');
  const propLines = proposedText.split('\n');
  const diffs: DiffLine[] = [];

  let o = 0;
  let p = 0;
  let oldLineCounter = 1;
  let newLineCounter = 1;

  while (o < origLines.length || p < propLines.length) {
    const origVal = origLines[o];
    const propVal = propLines[p];

    if (o < origLines.length && p < propLines.length && origVal === propVal) {
      diffs.push({
        type: 'unchanged',
        oldLineNum: oldLineCounter++,
        newLineNum: newLineCounter++,
        text: origVal,
      });
      o++;
      p++;
    } else {
      const matchInProp = p < propLines.length ? propLines.slice(p).indexOf(origVal) : -1;
      const matchInOrig = o < origLines.length ? origLines.slice(o).indexOf(propVal) : -1;

      if (o < origLines.length && (matchInProp === -1 || (matchInOrig !== -1 && matchInOrig < matchInProp))) {
        diffs.push({
          type: 'removed',
          oldLineNum: oldLineCounter++,
          text: origVal,
        });
        o++;
      } else if (p < propLines.length) {
        diffs.push({
          type: 'added',
          newLineNum: newLineCounter++,
          text: propVal,
        });
        p++;
      }
    }
  }

  return diffs;
}

export const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({
  original_state,
  proposed_state,
  originalState,
  proposedState,
  title = 'PROPOSED INFRASTRUCTURE ALTERATION (GIT DIFF)',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const origText = original_state ?? originalState ?? DEFAULT_ORIGINAL_CONFIG;
  const propText = proposed_state ?? proposedState ?? DEFAULT_PROPOSED_CONFIG;

  const diffLines = useMemo(() => computeUnifiedDiff(origText, propText), [origText, propText]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diffLines.forEach((line) => {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diffLines]);

  const handleCopyDiff = () => {
    const rawDiffText = diffLines
      .map((l) => `${l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' '} ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(rawDiffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`glass-panel border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs w-full my-3 bg-[#040814] ${className}`}>
      {/* Top Header Bar */}
      <div className="bg-[#090e1c] border-b border-slate-800/90 px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-slate-200 tracking-wider text-[11px]">
            {title}
          </span>
        </div>

        {/* Stats Badges & Actions */}
        <div className="flex items-center gap-2">
          {/* Additions / Deletions count */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-emerald-400 flex items-center gap-0.5">
              <Plus className="w-3 h-3" />+{stats.added}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400 flex items-center gap-0.5">
              <Minus className="w-3 h-3" />-{stats.removed}
            </span>
          </div>

          <button
            onClick={handleCopyDiff}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
            title="Copy Diff Block"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Classic Git Diff Code Block */}
      <div className="p-2 sm:p-3 overflow-x-auto max-h-56 overflow-y-auto leading-relaxed select-text bg-[#030611]">
        <table className="w-full border-collapse text-left font-mono">
          <tbody>
            {diffLines.map((line, idx) => {
              const isAdded = line.type === 'added';
              const isRemoved = line.type === 'removed';

              let lineBg = 'hover:bg-slate-900/40 text-slate-300 border-l-2 border-transparent';
              let linePrefix = ' ';
              let prefixColor = 'text-slate-600';

              if (isAdded) {
                lineBg = 'bg-emerald-950/50 text-emerald-300 border-l-2 border-emerald-500 font-medium';
                linePrefix = '+';
                prefixColor = 'text-emerald-400 font-bold';
              } else if (isRemoved) {
                lineBg = 'bg-red-950/50 text-red-300 border-l-2 border-red-500 font-medium';
                linePrefix = '-';
                prefixColor = 'text-red-400 font-bold';
              }

              return (
                <tr key={idx} className={`transition-colors ${lineBg}`}>
                  {/* Old Line Number */}
                  <td className="w-8 select-none text-right pr-2 text-[10px] text-slate-600 font-mono py-0.5">
                    {line.oldLineNum || ''}
                  </td>
                  {/* New Line Number */}
                  <td className="w-8 select-none text-right pr-2 text-[10px] text-slate-600 font-mono py-0.5 border-r border-slate-800/60">
                    {line.newLineNum || ''}
                  </td>
                  {/* Diff Symbol (+ / -) */}
                  <td className={`w-6 select-none text-center font-bold font-mono py-0.5 ${prefixColor}`}>
                    {linePrefix}
                  </td>
                  {/* Line Content */}
                  <td className="py-0.5 px-2 whitespace-pre font-mono text-xs leading-5 break-all">
                    {line.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="bg-[#070c18] border-t border-slate-800/80 px-3 py-1.5 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>Verify CockroachDB MCP target state before granting voice consent</span>
        </span>
        <span className="font-bold text-cyan-400/80">GIT UNIFIED FORMAT</span>
      </div>
    </div>
  );
};

export default ConfigDiffViewer;
