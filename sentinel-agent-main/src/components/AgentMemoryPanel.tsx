import React, { memo } from 'react';
import { Database, ShieldCheck, ShieldAlert, Cpu, Clock, Terminal, Activity, Sparkles, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface PastIncident {
  id?: string;
  title: string;
  similarity: number; // Decimal (0.94) or integer (94)
  timestamp?: string;
  summary?: string;
}

export type McpPermissionStatus = 
  | '[READ_ONLY | GRANTED]' 
  | '[WRITE_CONSENT | AWAITING_APPROVAL]' 
  | 'READ_ONLY | GRANTED'
  | 'WRITE_CONSENT | AWAITING_APPROVAL'
  | string;

export interface McpAuditLogAction {
  id?: string;
  timestamp: string;
  toolName: string;
  status: McpPermissionStatus;
  details?: string;
}

export interface AgentMemoryPanelProps {
  pastIncidents?: PastIncident[];
  mcpAuditLogs?: McpAuditLogAction[];
  className?: string;
}

const DEFAULT_PAST_INCIDENTS: PastIncident[] = [
  {
    id: 'inc-9021',
    title: 'DB Connection Pool Exhaustion on auth-service',
    similarity: 0.94,
    timestamp: '2026-06-12',
    summary: 'Max connections reached in PostgreSQL primary node.'
  },
  {
    id: 'inc-8842',
    title: 'Redis Cache Eviction Cascade & High CPU Spike',
    similarity: 0.87,
    timestamp: '2026-05-28',
    summary: 'Thundering herd on user session lookup.'
  },
  {
    id: 'inc-7619',
    title: 'PostgreSQL Index Lock contention during migration',
    similarity: 0.72,
    timestamp: '2026-04-14',
    summary: 'Schema modification caused temporary deadlocks.'
  }
];

const DEFAULT_MCP_AUDIT_LOGS: McpAuditLogAction[] = [
  {
    id: 'mcp-101',
    timestamp: '18:55:04 UTC',
    toolName: 'pgvector_similarity_search',
    status: '[READ_ONLY | GRANTED]',
    details: 'Queried 1536d embeddings for root cause match.'
  },
  {
    id: 'mcp-102',
    timestamp: '18:56:22 UTC',
    toolName: 'pg_stat_activity_inspect',
    status: '[READ_ONLY | GRANTED]',
    details: 'Fetched active queries and backends status.'
  },
  {
    id: 'mcp-103',
    timestamp: '18:57:40 UTC',
    toolName: 'sql_terminate_idle_connections',
    status: '[WRITE_CONSENT | AWAITING_APPROVAL]',
    details: 'Requires SRE consent to execute PG_CANCEL_BACKEND.'
  },
  {
    id: 'mcp-104',
    timestamp: '18:58:11 UTC',
    toolName: 'pg_pool_resize_max_connections',
    status: '[WRITE_CONSENT | AWAITING_APPROVAL]',
    details: 'Pending human voice approval or token verification.'
  }
];

export const AgentMemoryPanel: React.FC<AgentMemoryPanelProps> = memo(({
  pastIncidents = DEFAULT_PAST_INCIDENTS,
  mcpAuditLogs = DEFAULT_MCP_AUDIT_LOGS,
  className = ''
}) => {
  // Helper to format score into integer percentage
  const getPercentage = (similarity: number): number => {
    const pct = similarity <= 1 ? similarity * 100 : similarity;
    return Math.min(100, Math.max(0, Math.round(pct)));
  };

  // Helper to detect status type
  const isWriteConsent = (status: string): boolean => {
    const s = status.toUpperCase();
    return s.includes('WRITE_CONSENT') || s.includes('AWAITING_APPROVAL');
  };

  return (
    <div className={`glass-panel rounded-xl border border-cyan-500/30 p-5 bg-slate-950/90 text-slate-100 flex flex-col gap-6 shadow-2xl overflow-hidden relative ${className}`}>
      {/* Background Cyber Glow Accent */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* SECTION 1: Vector Memory Recall (pgvector) */}
      <section className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 glow-cyan">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-cyan-300 uppercase flex items-center gap-2">
                Vector Memory Recall <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 font-mono">pgvector</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Cosine similarity search across historical incident embeddings</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 font-mono bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>1536-dim Index</span>
          </div>
        </div>

        {/* Incident Recall List */}
        <div className="flex flex-col gap-3.5">
          {pastIncidents.map((incident, idx) => {
            const similarityPct = getPercentage(incident.similarity);
            
            // Cyber color bar gradient based on similarity tier
            let barGradient = 'from-cyan-500 via-teal-400 to-emerald-400';
            let badgeStyle = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60 glow-emerald';
            
            if (similarityPct < 75) {
              barGradient = 'from-cyan-600 to-amber-500';
              badgeStyle = 'text-amber-400 border-amber-500/40 bg-amber-950/60 glow-amber';
            }

            return (
              <div 
                key={incident.id || `inc-${idx}`}
                className="group p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:bg-slate-900/90 shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs text-cyan-400/70 mt-0.5">[{idx + 1}]</span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {incident.title}
                      </h3>
                      {incident.summary && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-sans">
                          {incident.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Similarity Badge */}
                  <div className={`px-2.5 py-1 rounded font-mono text-xs font-bold border flex items-center gap-1 shrink-0 ${badgeStyle}`}>
                    <Cpu className="w-3 h-3" />
                    <span>{similarityPct}% Match</span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out shadow-sm`}
                      style={{ width: `${similarityPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-0.5">
                    <span>Similarity Score: ({(similarityPct / 100).toFixed(2)})</span>
                    <span>Target Cosine Metric</span>
                  </div>
                </div>
              </div>
            );
          })}

          {pastIncidents.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
              No vector memory entries retrieved.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Managed MCP Audit Log */}
      <section className="flex flex-col gap-4 relative z-10 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 glow-emerald">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-emerald-300 uppercase flex items-center gap-2">
                Managed MCP Audit Log <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-mono">DB Governance</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Real-time database action permissions & approval state trace</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 font-mono bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Policy Enforcer</span>
          </div>
        </div>

        {/* Audit Log Table / Items */}
        <div className="flex flex-col gap-2.5">
          {mcpAuditLogs.map((log, idx) => {
            const isWrite = isWriteConsent(log.status);

            return (
              <div
                key={log.id || `mcp-${idx}`}
                className={`p-3 rounded-lg border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isWrite 
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70' 
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-emerald-500/40'
                }`}
              >
                {/* Left info: timestamp & tool name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 shrink-0 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{log.timestamp}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-xs font-bold text-slate-200 truncate">
                        {log.toolName}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-slate-400 truncate font-sans">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Badge: Color-coded (Green vs Flashing Amber) */}
                <div className="shrink-0">
                  {isWrite ? (
                    // Flashing Amber Badge: [WRITE_CONSENT | AWAITING_APPROVAL]
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded bg-amber-950/90 text-amber-300 border border-amber-500/80 glow-amber animate-pulse shadow-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      <span>[WRITE_CONSENT | AWAITING_APPROVAL]</span>
                    </div>
                  ) : (
                    // Green Badge: [READ_ONLY | GRANTED]
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 glow-emerald shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>[READ_ONLY | GRANTED]</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {mcpAuditLogs.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
              No MCP audit logs recorded.
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

AgentMemoryPanel.displayName = 'AgentMemoryPanel';

export default AgentMemoryPanel;
