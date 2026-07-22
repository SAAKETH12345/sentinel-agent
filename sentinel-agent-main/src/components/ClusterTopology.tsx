import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, AlertTriangle, ShieldCheck, Zap, Activity, Cpu, Bot, CheckCircle2 } from 'lucide-react';

export type ClusterState = 'HEALTHY' | 'INCIDENT' | 'RECOVERING';

export interface ClusterTopologyProps {
  clusterState?: ClusterState;
  className?: string;
  onNodeClick?: (nodeId: number) => void;
}

export const ClusterTopology: React.FC<ClusterTopologyProps> = memo(({
  clusterState = 'HEALTHY',
  className = '',
  onNodeClick,
}) => {
  // SVG Canvas dimensions & coordinates
  const agentOrigin = { x: 70, y: 50 };
  const node1 = { id: 1, name: 'Node 1: US-East Primary', x: 300, y: 80, region: 'us-east-1' };
  const node2 = { id: 2, name: 'Node 2: Auth Session DB', x: 480, y: 260, region: 'us-east-2' };
  const node3 = { id: 3, name: 'Node 3: US-West Replica', x: 120, y: 260, region: 'us-west-2' };

  // Color & style helpers based on cluster state
  const isIncident = clusterState === 'INCIDENT';
  const isRecovering = clusterState === 'RECOVERING';

  // Node 2 styling
  let node2Stroke = '#06b6d4'; // Cyan default
  let node2Fill = 'rgba(6, 182, 212, 0.15)';
  let node2GlowClass = 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]';

  if (isIncident) {
    node2Stroke = '#ef4444'; // Red
    node2Fill = 'rgba(239, 68, 68, 0.25)';
    node2GlowClass = 'drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]';
  } else if (isRecovering) {
    node2Stroke = '#10b981'; // Emerald transition
    node2Fill = 'rgba(16, 185, 129, 0.25)';
    node2GlowClass = 'drop-shadow-[0_0_18px_rgba(16,185,129,0.8)]';
  }

  return (
    <div className={`glass-panel rounded-xl border border-slate-800 p-5 bg-slate-950/90 text-slate-100 flex flex-col gap-4 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-2 font-mono">
              CockroachDB Topology <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">3-Node Mesh</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Raft Consensus Cluster State Engine</p>
          </div>
        </div>

        {/* Cluster State Badge */}
        <div className="flex items-center gap-2">
          {clusterState === 'HEALTHY' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-mono font-bold glow-emerald">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HEALTHY</span>
            </div>
          )}
          {clusterState === 'INCIDENT' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/80 text-red-300 text-xs font-mono font-bold glow-red animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>INCIDENT DETECTED</span>
            </div>
          )}
          {clusterState === 'RECOVERING' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-300 text-xs font-mono font-bold glow-amber">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>RECOVERING / SELF-HEALING</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Topology Graphic */}
      <div className="relative w-full h-[320px] bg-slate-950/80 rounded-xl border border-slate-800/80 p-2 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full max-h-[300px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Cyan Gradient for Healthy Mesh Lines */}
            <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>

            {/* Red Alert Gradient for Incident Line */}
            <linearGradient id="redLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>

            {/* Glowing filter for nodes */}
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="glowPacket" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND MESH LINES (Connecting Node 1, 2, 3) */}
          {/* Node 1 to Node 2 */}
          <line
            x1={node1.x}
            y1={node1.y}
            x2={node2.x}
            y2={node2.y}
            stroke={isIncident ? 'url(#redLineGrad)' : 'url(#cyanLineGrad)'}
            strokeWidth={isIncident ? '3' : '2'}
            strokeDasharray={isIncident ? '6,4' : 'none'}
            className={isIncident ? 'animate-pulse' : ''}
          />
          {/* Node 2 to Node 3 */}
          <line
            x1={node2.x}
            y1={node2.y}
            x2={node3.x}
            y2={node3.y}
            stroke={isIncident ? 'url(#redLineGrad)' : 'url(#cyanLineGrad)'}
            strokeWidth="2"
          />
          {/* Node 3 to Node 1 */}
          <line
            x1={node3.x}
            y1={node3.y}
            x2={node1.x}
            y2={node1.y}
            stroke="url(#cyanLineGrad)"
            strokeWidth="2"
          />

          {/* AGENT UI CONNECTOR PATH (For RECOVERING animation) */}
          <line
            x1={agentOrigin.x}
            y1={agentOrigin.y}
            x2={node1.x}
            y2={node1.y}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.4"
          />

          {/* AGENT UI ICON / SOURCE ORIGIN NODE */}
          <g transform={`translate(${agentOrigin.x}, ${agentOrigin.y})`}>
            <circle r="22" fill="#080d1a" stroke="#06b6d4" strokeWidth="2" filter="url(#glowCyan)" />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <div className="w-full h-full flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
            </foreignObject>
            <text y="34" textAnchor="middle" fill="#06b6d4" className="text-[9px] font-mono font-bold">
              AGENT GOVERNANCE
            </text>
          </g>

          {/* ANIMATED RECOVERING DATA PACKET (Agent UI -> Node 1 -> Node 2) */}
          {isRecovering && (
            <g>
              {/* Agent -> Node 2 motion packet */}
              <motion.circle
                r="7"
                fill="#10b981"
                filter="url(#glowPacket)"
                initial={{ cx: agentOrigin.x, cy: agentOrigin.y }}
                animate={{
                  cx: [agentOrigin.x, node1.x, node2.x],
                  cy: [agentOrigin.y, node1.y, node2.y],
                  scale: [1, 1.4, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              {/* Packet Trail effect */}
              <motion.circle
                r="4"
                fill="#06b6d4"
                opacity="0.6"
                initial={{ cx: agentOrigin.x, cy: agentOrigin.y }}
                animate={{
                  cx: [agentOrigin.x, node1.x, node2.x],
                  cy: [agentOrigin.y, node1.y, node2.y],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: 0.15,
                  ease: 'easeInOut',
                }}
              />
            </g>
          )}

          {/* NODE 1: US-East Primary */}
          <g
            transform={`translate(${node1.x}, ${node1.y})`}
            className="cursor-pointer"
            onClick={() => onNodeClick?.(1)}
          >
            <motion.circle
              r="28"
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth="2.5"
              filter="url(#glowCyan)"
              animate={clusterState === 'HEALTHY' ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] } : {}}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <foreignObject x="-14" y="-14" width="28" height="28">
              <div className="w-full h-full flex items-center justify-center text-cyan-300">
                <Server className="w-5 h-5" />
              </div>
            </foreignObject>
            <text y="44" textAnchor="middle" fill="#e2e8f0" className="text-[11px] font-mono font-bold">
              Node 1 (Primary)
            </text>
            <text y="56" textAnchor="middle" fill="#94a3b8" className="text-[9px] font-mono">
              us-east-1
            </text>
          </g>

          {/* NODE 3: US-West Replica */}
          <g
            transform={`translate(${node3.x}, ${node3.y})`}
            className="cursor-pointer"
            onClick={() => onNodeClick?.(3)}
          >
            <motion.circle
              r="28"
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth="2.5"
              filter="url(#glowCyan)"
              animate={clusterState === 'HEALTHY' ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] } : {}}
              transition={{ duration: 2.8, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
            />
            <foreignObject x="-14" y="-14" width="28" height="28">
              <div className="w-full h-full flex items-center justify-center text-cyan-300">
                <Server className="w-5 h-5" />
              </div>
            </foreignObject>
            <text y="44" textAnchor="middle" fill="#e2e8f0" className="text-[11px] font-mono font-bold">
              Node 3 (Replica)
            </text>
            <text y="56" textAnchor="middle" fill="#94a3b8" className="text-[9px] font-mono">
              us-west-2
            </text>
          </g>

          {/* NODE 2: Target Node (Auth Session DB - INCIDENT / RECOVERING) */}
          <g
            transform={`translate(${node2.x}, ${node2.y})`}
            className="cursor-pointer"
            onClick={() => onNodeClick?.(2)}
          >
            <motion.circle
              r="30"
              fill={node2Fill}
              stroke={node2Stroke}
              strokeWidth={isIncident ? '3.5' : '2.5'}
              filter={isIncident ? 'url(#glowRed)' : 'url(#glowCyan)'}
              animate={
                isIncident
                  ? { scale: [1, 1.22, 1], opacity: [1, 0.35, 1] }
                  : clusterState === 'HEALTHY'
                  ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }
                  : { scale: [1, 1.1, 1] }
              }
              transition={
                isIncident
                  ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 2.8, repeat: Infinity, delay: 1, ease: 'easeInOut' }
              }
            />

            <foreignObject x="-14" y="-14" width="28" height="28">
              <div className={`w-full h-full flex items-center justify-center ${isIncident ? 'text-red-400' : isRecovering ? 'text-emerald-400' : 'text-cyan-300'}`}>
                {isIncident ? (
                  <AlertTriangle className="w-6 h-6 animate-bounce text-red-400" />
                ) : isRecovering ? (
                  <Zap className="w-6 h-6 text-emerald-400 animate-pulse" />
                ) : (
                  <Server className="w-5 h-5" />
                )}
              </div>
            </foreignObject>

            <text y="46" textAnchor="middle" fill={isIncident ? '#fca5a5' : '#e2e8f0'} className="text-[11px] font-mono font-bold">
              Node 2 (Auth DB)
            </text>
            <text y="58" textAnchor="middle" fill={isIncident ? '#f87171' : '#94a3b8'} className="text-[9px] font-mono">
              {isIncident ? 'ERR_MAX_CONNS' : 'us-east-2'}
            </text>
          </g>
        </svg>

        {/* INCIDENT TOOLTIP OVERLAY ON NODE 2 */}
        <AnimatePresence>
          {isIncident && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute top-[160px] right-[40px] z-30 bg-red-950/95 text-red-200 border border-red-500/80 p-2.5 rounded-lg shadow-2xl glow-red flex items-center gap-2 font-mono text-xs max-w-[220px]"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              <div>
                <div className="font-extrabold text-red-300 text-[11px] leading-tight">
                  Connection Pool Exhausted
                </div>
                <div className="text-[9px] text-red-400 mt-0.5">
                  100/100 connections stuck in idle
                </div>
              </div>
              <div className="absolute -bottom-2 right-12 w-3 h-3 bg-red-950 border-r border-b border-red-500/80 rotate-45" />
            </motion.div>
          )}

          {isRecovering && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute top-[160px] right-[40px] z-30 bg-emerald-950/95 text-emerald-200 border border-emerald-500/80 p-2.5 rounded-lg shadow-2xl glow-emerald flex items-center gap-2 font-mono text-xs max-w-[220px]"
            >
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
              <div>
                <div className="font-extrabold text-emerald-300 text-[11px] leading-tight">
                  Applying Remediation
                </div>
                <div className="text-[9px] text-emerald-400 mt-0.5">
                  Injecting pool resize packet & session purge
                </div>
              </div>
              <div className="absolute -bottom-2 right-12 w-3 h-3 bg-emerald-950 border-r border-b border-emerald-500/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Metrics Summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-slate-800/80 pt-3 relative z-10">
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Raft Consensus</span>
          <span className="text-cyan-400 font-bold">Quorum (3/3)</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Replication Factor</span>
          <span className="text-slate-200 font-bold">3x Storage</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Active Connections</span>
          <span className={isIncident ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
            {isIncident ? '100 / 100 (100%)' : '22 / 100 (22%)'}
          </span>
        </div>
      </div>
    </div>
  );
});

ClusterTopology.displayName = 'ClusterTopology';

export default ClusterTopology;
