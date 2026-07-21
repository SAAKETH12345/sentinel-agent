import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Search, ShieldAlert, Sparkles, CheckCircle2, Code, Plus, Minus, Maximize2, RefreshCw, Cpu, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Center Node (Current Alert Query Vector) ---
const CenterNodeComponent: React.FC<NodeProps> = ({ data }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="glass-panel border-2 border-red-500 rounded-xl p-4 shadow-2xl glow-red max-w-[270px] font-mono relative backdrop-blur-xl"
    >
      <Handle type="source" position={Position.Right} id="right" className="!bg-red-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-red-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Top} id="top" className="!bg-red-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-red-500 !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-red-900/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        <span className="text-xs font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5 text-glow-amber">
          <ShieldAlert className="w-4 h-4 text-red-400" /> CURRENT ALERT
        </span>
      </div>

      <div className="text-[11px] font-bold text-slate-100 line-clamp-2 leading-relaxed mb-2">
        {String(data.label || 'Connection pool exhausted on auth-service')}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80 font-mono">
        <span>Embedding Query Vector:</span>
        <span className="text-cyan-400 font-extrabold text-glow-cyan">ℝ¹⁵³⁶</span>
      </div>
    </motion.div>
  );
};

// --- Custom Incident Node (Past Incidents Stored in CockroachDB) ---
const IncidentNodeComponent: React.FC<NodeProps> = ({ data }) => {
  const rank = Number(data.rank || 0);
  const similarity = Number(data.similarity || 0);
  const isTopMatch = rank === 1;

  let borderColor = 'border-slate-700';
  let glowClass = '';
  let badgeColor = 'bg-slate-900 text-slate-400 border-slate-700';
  let titleColor = 'text-slate-300';

  if (rank === 1) {
    borderColor = 'border-emerald-500';
    glowClass = 'glow-emerald';
    badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-500 glow-emerald';
    titleColor = 'text-emerald-300 text-glow-emerald';
  } else if (rank === 2) {
    borderColor = 'border-cyan-500';
    glowClass = 'glow-cyan';
    badgeColor = 'bg-cyan-950 text-cyan-300 border-cyan-500';
    titleColor = 'text-cyan-300 text-glow-cyan';
  } else if (rank === 3) {
    borderColor = 'border-purple-500';
    glowClass = '';
    badgeColor = 'bg-purple-950 text-purple-300 border-purple-500';
    titleColor = 'text-purple-300';
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: rank * 0.08 }}
      className={`glass-panel border-2 ${borderColor} rounded-xl p-4 shadow-2xl max-w-[290px] font-mono relative transition-all duration-300 ${glowClass}`}
    >
      <Handle type="target" position={Position.Left} id="left-in" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="right-in" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Top} id="top-in" className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="bottom-in" className="!bg-cyan-400 !w-3 !h-3" />

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor} flex items-center gap-1`}>
          {isTopMatch ? <Award className="w-3 h-3 text-emerald-400" /> : null}
          {isTopMatch ? 'TOP MATCH' : `RANK #${rank}`}
        </span>
        <span className="text-[11px] font-extrabold text-amber-400 text-glow-amber">
          {(similarity * 100).toFixed(1)}% Match
        </span>
      </div>

      <div className={`text-xs font-bold ${titleColor} mb-1.5 leading-snug`}>
        {String(data.title)}
      </div>

      <p className="text-[10px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
        {String(data.solution)}
      </p>

      <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-1.5 font-mono">
        <span>CockroachDB pgvector</span>
        <span className="text-slate-400 font-bold">cosine dist: {(1 - similarity).toFixed(3)}</span>
      </div>
    </motion.div>
  );
};

const nodeTypes = {
  centerNode: CenterNodeComponent,
  incidentNode: IncidentNodeComponent,
};

// --- Custom High-Contrast Cyberpunk Controls Bar ---
const CustomGraphControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#090d16]/95 border border-cyan-600/80 shadow-2xl glow-cyan backdrop-blur-md">
      <button
        onClick={() => zoomIn()}
        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 hover:text-cyan-200 transition-all cursor-pointer"
        title="Zoom In (+)"
      >
        <Plus className="w-4 h-4 font-bold" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 hover:text-cyan-200 transition-all cursor-pointer"
        title="Zoom Out (-)"
      >
        <Minus className="w-4 h-4 font-bold" />
      </button>
      <div className="h-5 w-[1px] bg-slate-800" />
      <button
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-cyan-950 hover:border-cyan-500 hover:text-cyan-200 transition-all flex items-center gap-1 text-[11px] font-mono px-3 cursor-pointer"
        title="Reset & Fit View"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span>Fit View</span>
      </button>
    </div>
  );
};

interface VectorSimilarityGraphProps {
  alertText?: string;
  isSearching?: boolean;
}

export const VectorSimilarityGraphContent: React.FC<VectorSimilarityGraphProps> = ({
  alertText = 'CRITICAL: Connection pool exhausted on auth-service at 18:00 UTC.',
  isSearching = false,
}) => {
  // Define Nodes layout
  const nodes: Node[] = useMemo(() => {
    return [
      {
        id: 'center',
        type: 'centerNode',
        position: { x: 300, y: 180 },
        data: { label: alertText },
      },
      {
        id: 'inc-1',
        type: 'incidentNode',
        position: { x: 680, y: 40 },
        data: {
          rank: 1,
          similarity: 0.962,
          title: 'INC-8891: Auth Service Connection Leak & Stale Locks',
          solution: 'Execute cockroach sql session termination for idle transactions.',
        },
      },
      {
        id: 'inc-2',
        type: 'incidentNode',
        position: { x: 680, y: 220 },
        data: {
          rank: 2,
          similarity: 0.894,
          title: 'INC-4102: Postgres Client Pool Exhaustion',
          solution: 'Scale up max connections counter and restart connection pooler.',
        },
      },
      {
        id: 'inc-3',
        type: 'incidentNode',
        position: { x: 680, y: 390 },
        data: {
          rank: 3,
          similarity: 0.831,
          title: 'INC-9012: Redis Connection Timeouts',
          solution: 'Purge stale session tokens and recycle cache nodes.',
        },
      },
      {
        id: 'inc-4',
        type: 'incidentNode',
        position: { x: 30, y: 60 },
        data: {
          rank: 4,
          similarity: 0.412,
          title: 'INC-1104: Disk Partition Full',
          solution: 'Clean log archives in /var/log.',
        },
      },
      {
        id: 'inc-5',
        type: 'incidentNode',
        position: { x: 30, y: 340 },
        data: {
          rank: 5,
          similarity: 0.285,
          title: 'INC-3391: Kinesis Shard Throttled',
          solution: 'Reshard stream partitions.',
        },
      },
    ];
  }, [alertText]);

  // Define Edges layout with similarity scores
  const edges: Edge[] = useMemo(() => {
    return [
      {
        id: 'e-center-1',
        source: 'center',
        target: 'inc-1',
        sourceHandle: 'right',
        targetHandle: 'left-in',
        animated: true,
        label: '0.962 Similarity (Cosine)',
        labelStyle: { fill: '#10b981', fontWeight: 800, fontSize: 11, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#030712', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#10b981', strokeWidth: 1.5 },
        style: { stroke: '#10b981', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      },
      {
        id: 'e-center-2',
        source: 'center',
        target: 'inc-2',
        sourceHandle: 'right',
        targetHandle: 'left-in',
        animated: true,
        label: '0.894 Similarity',
        labelStyle: { fill: '#06b6d4', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#030712', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#06b6d4' },
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
      },
      {
        id: 'e-center-3',
        source: 'center',
        target: 'inc-3',
        sourceHandle: 'right',
        targetHandle: 'left-in',
        animated: true,
        label: '0.831 Similarity',
        labelStyle: { fill: '#c084fc', fontWeight: 600, fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#030712', fillOpacity: 0.9, rx: 4, ry: 4, stroke: '#a855f7' },
        style: { stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      },
      {
        id: 'e-center-4',
        source: 'center',
        target: 'inc-4',
        sourceHandle: 'left',
        targetHandle: 'right-in',
        label: '0.412 (Filtered)',
        labelStyle: { fill: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#030712', fillOpacity: 0.8 },
        style: { stroke: '#334155', strokeWidth: 1, strokeDasharray: '2 2' },
      },
      {
        id: 'e-center-5',
        source: 'center',
        target: 'inc-5',
        sourceHandle: 'left',
        targetHandle: 'right-in',
        label: '0.285 (Filtered)',
        labelStyle: { fill: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#030712', fillOpacity: 0.8 },
        style: { stroke: '#334155', strokeWidth: 1, strokeDasharray: '2 2' },
      },
    ];
  }, []);

  return (
    <div className="glass-panel border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[420px] sm:h-[500px] lg:h-[560px] font-mono relative">
      {/* Top Header & SQL Inspector Bar */}
      <div className="bg-[#0b101d]/90 border-b border-slate-800/80 p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-700/80 glow-cyan">
            <Database className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 text-glow-cyan">
                CockroachDB Vector Similarity Graph Index
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold glow-emerald">
                pgvector cosine distance
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Embedding space mapping query vector (1536-dim) to historical incident runbooks
            </p>
          </div>
        </div>

        {/* Live Vector Search Status Pill */}
        <div className="flex items-center gap-2">
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-600 text-cyan-300 text-xs glow-cyan animate-pulse">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>SEARCHING VECTOR MEMORY...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>3 CANDIDATES RETRIEVED</span>
            </div>
          )}
        </div>
      </div>

      {/* SQL Query Snippet Bar */}
      <div className="bg-[#070b14]/90 border-b border-slate-800/80 p-2.5 px-5 flex items-center justify-between text-[11px] text-slate-400 font-mono backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Code className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-500">CockroachDB Query:</span>
          <code className="text-emerald-400 bg-slate-950/90 px-2.5 py-1 rounded-md border border-slate-800 text-[10.5px]">
            SELECT title, solution, 1 - (embedding &lt;=&gt; $1::vector) AS similarity FROM runbooks ORDER BY embedding &lt;=&gt; $1::vector LIMIT 3;
          </code>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
          className="bg-[#030712]"
        >
          <Background color="#1e293b" gap={24} size={1} variant={BackgroundVariant.Dots} />
          <CustomGraphControls />
        </ReactFlow>
      </div>
    </div>
  );
};

export const VectorSimilarityGraph: React.FC<VectorSimilarityGraphProps> = React.memo((props) => {
  return (
    <ReactFlowProvider>
      <VectorSimilarityGraphContent {...props} />
    </ReactFlowProvider>
  );
});
