import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Database, Activity, ShieldAlert, CheckCircle, Search, Wrench, Play, Cpu, AlertTriangle, Radio, Server, Layers, Network, CheckCircle2, Sparkles, Zap, Flame, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelemetryCharts } from './components/TelemetryCharts';
import { CloudWatchAlerts } from './components/CloudWatchAlerts';
import { AgentTerminal, TerminalStep } from './components/AgentTerminal';
import { VoiceApprovalButton } from './components/VoiceApprovalButton';
import { VectorSimilarityGraph } from './components/VectorSimilarityGraph';
import { AgentMemoryPanel } from './components/AgentMemoryPanel';
import { ClusterTopology, ClusterState } from './components/ClusterTopology';

type IncidentPhase =
  | 'IDLE'
  | 'RECEIVE_TELEMETRY'
  | 'VECTOR_SEARCH'
  | 'DIAGNOSE'
  | 'PROPOSE_FIX'
  | 'AWAITING_APPROVAL'
  | 'SELF_HEAL'
  | 'RESOLVED';

type ActiveTab = 'TERMINAL' | 'VECTOR_GRAPH' | 'AGENT_MEMORY';

const PHASE_STEPS: { key: IncidentPhase; label: string }[] = [
  { key: 'RECEIVE_TELEMETRY', label: '1. TELEMETRY' },
  { key: 'VECTOR_SEARCH', label: '2. VECTOR SEARCH' },
  { key: 'DIAGNOSE', label: '3. DIAGNOSTIC' },
  { key: 'PROPOSE_FIX', label: '4. PROPOSAL' },
  { key: 'AWAITING_APPROVAL', label: '5. VOICE GOVERNANCE' },
  { key: 'SELF_HEAL', label: '6. SELF HEAL' },
  { key: 'RESOLVED', label: '7. RESOLVED' },
];

export default function App() {
  const [phase, setPhase] = useState<IncidentPhase>('IDLE');
  const [logs, setLogs] = useState<TerminalStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('TERMINAL');
  const [overrideCpu, setOverrideCpu] = useState<number | null>(null);
  const [memoryNotification, setMemoryNotification] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [telemetryInput, setTelemetryInput] = useState(
    'CRITICAL: DB Connection Pool Exhausted on auth-service at 18:00 UTC.'
  );

  const wsRef = useRef<WebSocket | null>(null);

  // Live Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-switch tabs to highlight active phase
  useEffect(() => {
    if (phase === 'VECTOR_SEARCH') {
      setActiveTab('VECTOR_GRAPH');
    } else if (phase === 'AWAITING_APPROVAL' || phase === 'SELF_HEAL' || phase === 'RESOLVED') {
      setActiveTab('TERMINAL');
    }
  }, [phase]);

  // Connect to backend WebSocket endpoint on mount
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/alert');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to backend WebSocket at ws://localhost:8000/ws/alert');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // CPU Spike signal
          if (data.type === 'SPIKE_CPU' || data.targetCpu === 99) {
            setOverrideCpu(99);
          }

          // Resolution signal
          if (data.type === 'RESOLVE_INCIDENT' || data.targetCpu === 20 || data.phase === 'RESOLVED') {
            setOverrideCpu(20);
            setPhase('RESOLVED');
            setIsStreaming(false);
            setMemoryNotification(
              'CockroachDB Vector Memory Updated: Resolution Runbook Artifact Saved successfully!'
            );
            setTimeout(() => setMemoryNotification(null), 7000);
          }

          if (data.phase) {
            const normalizedPhase =
              data.phase === 'RECEIVE_TELEMETRY'
                ? 'RECEIVE_TELEMETRY'
                : data.phase === 'VECTOR_SEARCH'
                ? 'VECTOR_SEARCH'
                : data.phase === 'DIAGNOSE'
                ? 'DIAGNOSE'
                : data.phase === 'PROPOSE_FIX' || data.phase === 'AWAITING_APPROVAL'
                ? 'AWAITING_APPROVAL'
                : data.phase;

            setPhase(normalizedPhase);
            setLogs((prev) => [...prev, data]);

            if (normalizedPhase === 'AWAITING_APPROVAL') {
              setIsStreaming(false);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      try {
        ws?.close();
      } catch {}
    };
  }, []);

  // Trigger incident pipeline (via WebSocket backend or fallback orchestrator)
  const runIncidentPipeline = (alertTextPayload?: string) => {
    const alertMessage = alertTextPayload || telemetryInput;
    setLogs([]);
    setPhase('RECEIVE_TELEMETRY');
    setIsStreaming(true);
    setOverrideCpu(99);
    setMemoryNotification(null);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SPIKE_CPU', alert: alertMessage }));
    } else {
      runLocalSimulationEngine(alertMessage);
    }
  };

  // Autonomous simulation engine for offline demonstration mode
  const runLocalSimulationEngine = (alertTextMessage: string) => {
    setLogs([]);
    setPhase('RECEIVE_TELEMETRY');
    setIsStreaming(true);
    setOverrideCpu(99);

    // Step 1: Receive Telemetry
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        {
          phase: 'RECEIVE_TELEMETRY',
          reasoning: `Received AWS CloudWatch telemetry alert: "${alertTextMessage}". Parsed service context & error signature. CPU spiked to 99%.`,
          action: 'acknowledge_telemetry_alert(source: "AWS/CloudWatch", severity: "CRITICAL")',
        },
      ]);
      setPhase('VECTOR_SEARCH');

      // Step 2: Vector Memory Search
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            phase: 'VECTOR_SEARCH',
            reasoning:
              'Executing pgvector cosine similarity query against CockroachDB vector database. Top candidate match: INC-8891 (0.962 similarity).',
            action: `vector_cosine_similarity_search(query: "${alertTextMessage.substring(0, 45)}...", top_k: 3)`,
          },
        ]);
        setPhase('DIAGNOSE');

        // Step 3: MCP Query & Diagnostic
        setTimeout(() => {
          setLogs((prev) => [
            ...prev,
            {
              phase: 'DIAGNOSE',
              reasoning:
                'Vector match confirms connection pool exhaustion. AWS EC2 worker CPU throttled at 99%. Proposing cluster node auto-scaling and session purge.',
              action: 'execute_mcp_query(target_metric: "active_db_sessions", lock_timeout_sec: 5)',
            },
          ]);
          setPhase('PROPOSE_FIX');

          // Step 4: Proposal & Awaiting Approval
          setTimeout(() => {
            setLogs((prev) => [
              ...prev,
              {
                phase: 'AWAITING_APPROVAL',
                reasoning:
                  'Confirmed 100/100 connections stuck in "idle in transaction". Proposed Remediation: Scale AWS EC2 Nodes & Clear CockroachDB Idle Sessions.',
                action:
                  'HALT: Awaiting human governance voice approval for "aws auto-scaling scale-up --cluster auth-cluster & cockroach sql --execute=\'CANCEL SESSION <idle_ids>\'"',
              },
            ]);
            setPhase('AWAITING_APPROVAL');
            setIsStreaming(false);
          }, 2200);
        }, 2200);
      }, 2200);
    }, 1200);
  };

  // Execution when Voice or Button approval is granted
  const handleApproveFix = () => {
    setPhase('SELF_HEAL');
    setIsStreaming(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'APPROVE_FIX', phase: 'SELF_HEAL' }));
    }

    setLogs((prev) => [
      ...prev,
      {
        phase: 'APPLYING_FIX',
        reasoning:
          'HUMAN VOICE APPROVAL RECEIVED ("Action Approved"). Executing AWS cluster auto-scaling and CockroachDB session termination.',
        action: 'aws auto-scaling scale-up & cockroach sql --execute="CANCEL SESSION <idle_ids>" -> SUCCESS',
      },
    ]);

    setTimeout(() => {
      setOverrideCpu(20);
      setLogs((prev) => [
        ...prev,
        {
          phase: 'RESOLVED',
          reasoning:
            'Telemetry verified nominal. CPU utilization animated back down from 99% to 20%, DB connection pool cleared. Resolution runbook saved to CockroachDB vector memory.',
          action:
            'update_runbook_memory(incident_id: "INC-8891", resolution: "Scaled AWS EC2 nodes & cleared idle DB sessions")',
        },
      ]);
      setPhase('RESOLVED');
      setIsStreaming(false);
      setMemoryNotification(
        'CockroachDB Vector Memory Updated: Resolution Runbook Artifact Saved successfully!'
      );
      setTimeout(() => setMemoryNotification(null), 7000);
    }, 2400);
  };

  const handleSelectAlertFromFeed = (summaryText: string) => {
    setTelemetryInput(summaryText);
    runIncidentPipeline(summaryText);
  };

  const clearTerminal = () => {
    setLogs([]);
    setPhase('IDLE');
    setIsStreaming(false);
    setOverrideCpu(null);
    setMemoryNotification(null);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans flex flex-col selection:bg-cyan-900 selection:text-cyan-100 cyber-grid relative overflow-x-hidden">
      {/* Cyberpunk Scanline Glow Layer */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50 opacity-30" />

      {/* Top Navigation Header - Fully Mobile Responsive */}
      <header className="border-b border-slate-800/80 bg-[#060a14]/90 p-3 sm:p-4 sticky top-0 z-40 backdrop-blur-xl shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="p-2 sm:p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 glow-cyan cursor-pointer"
              >
                <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-mono font-extrabold tracking-wider text-slate-100 text-glow-cyan">
                    SENTINEL<span className="text-cyan-400">.SRE</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-700 text-cyan-300 glow-cyan">
                    v3.0 CYBERPUNK
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 hidden sm:block">
                  Autonomous L3 SRE Incident Detection & Voice-Governed Self-Healing
                </p>
              </div>
            </div>

            {/* Mobile Clock badge */}
            <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Live Status Indicators */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono w-full md:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-950/80 border border-emerald-900/80 text-emerald-400 shadow-md">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
              <span>CockroachDB MCP: <strong className="text-emerald-300">CONNECTED</strong></span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-950/80 border border-cyan-900/80 text-cyan-400 shadow-md">
              <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span>pgvector: <strong className="text-cyan-300">ONLINE</strong></span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 shadow-md">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Touch-Friendly Interactive Phase Stepper Bar */}
      <div className="bg-[#050812] border-b border-slate-800/80 py-2.5 px-3 sm:px-4 overflow-x-auto shadow-inner font-mono smooth-scroll-viewport">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between min-w-[760px] sm:min-w-[900px] gap-2">
          {PHASE_STEPS.map((step, idx) => {
            const isCompleted =
              PHASE_STEPS.findIndex((s) => s.key === phase) > idx || phase === 'RESOLVED';
            const isActive = step.key === phase;

            return (
              <React.Fragment key={step.key}>
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 glow-cyan scale-105'
                      : isCompleted
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                      : 'bg-slate-950/40 border border-slate-800/60 text-slate-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive
                        ? 'bg-cyan-400 animate-ping'
                        : isCompleted
                        ? 'bg-emerald-400'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>{step.label}</span>
                </div>
                {idx < PHASE_STEPS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 min-w-[15px] sm:min-w-[20px] transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-500/80' : isActive ? 'bg-cyan-500/80 animate-pulse' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* CockroachDB Memory Update Notification Banner */}
      <AnimatePresence>
        {memoryNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-b border-emerald-500/80 p-2.5 sm:p-3 px-4 sm:px-6 text-xs font-mono text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xl glow-emerald sticky top-[65px] sm:top-[73px] z-30"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              <span className="font-extrabold text-glow-emerald text-xs sm:text-sm text-center sm:text-left">{memoryNotification}</span>
            </div>
            <span className="text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-900 border border-emerald-600 text-emerald-200 font-bold shrink-0">
              pgvector upsert: SUCCESS
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Layout - Responsive Mobile Stack */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 z-10">
        {/* Left Column (5 Cols on desktop, full width on mobile): Telemetry Charts & CloudWatch Alerts */}
        <div className="lg:col-span-5 flex flex-col space-y-4 sm:space-y-5">
          {/* Real-time Telemetry Graphs */}
          <TelemetryCharts
            isAlertActive={phase !== 'IDLE' && phase !== 'RESOLVED'}
            overrideCpu={overrideCpu}
          />

          {/* AWS CloudWatch Alerts Feed */}
          <CloudWatchAlerts
            onSelectAlert={handleSelectAlertFromFeed}
            activeAlertId={activeAlertId}
          />

          {/* Custom Incident Payload Injector Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-panel border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-xl font-mono"
          >
            <h3 className="text-xs uppercase tracking-wider text-slate-300 font-bold mb-2.5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Custom Incident Payload Injector
            </h3>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
              <button
                onClick={() =>
                  setTelemetryInput('CRITICAL: DB Connection Pool Exhausted on auth-service at 18:00 UTC.')
                }
                className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all hover:border-cyan-600 cursor-pointer"
              >
                ⚡ DB Pool Exhaustion
              </button>
              <button
                onClick={() =>
                  setTelemetryInput('HIGH_ALERT: CPU Throttled at 99.8% on worker-cluster-us-east-1.')
                }
                className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all hover:border-red-600 cursor-pointer"
              >
                🔥 CPU Spike 99%
              </button>
              <button
                onClick={() =>
                  setTelemetryInput('WARNING: Redis Session Cache Memory Eviction surge on checkout service.')
                }
                className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all hover:border-amber-600 cursor-pointer"
              >
                ⚠️ Redis Memory Leak
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                value={telemetryInput}
                onChange={(e) => setTelemetryInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:glow-cyan resize-none leading-relaxed"
                rows={2}
                placeholder="Enter alert text telemetry..."
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => runIncidentPipeline()}
                disabled={phase !== 'IDLE' && phase !== 'RESOLVED'}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 font-extrabold text-xs tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-600 glow-cyan flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-cyan-400" />
                Dispatch Custom Alert to Agent
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Right Column (7 Cols on desktop, full width on mobile): Split Pane Navigation & Components */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Responsive Navigation View Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-[#080d1a]/90 p-1.5 rounded-xl border border-slate-800 font-mono text-xs shadow-lg backdrop-blur-md gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab('TERMINAL')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-extrabold transition-all flex items-center gap-2 border text-xs cursor-pointer ${
                  activeTab === 'TERMINAL'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600 glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Agent Terminal</span>
              </button>

              <button
                onClick={() => setActiveTab('VECTOR_GRAPH')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-extrabold transition-all flex items-center gap-2 border text-xs cursor-pointer ${
                  activeTab === 'VECTOR_GRAPH'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 glow-emerald'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Network className="w-4 h-4 text-emerald-400" />
                <span>Cluster & Vector Index</span>
                {phase === 'VECTOR_SEARCH' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('AGENT_MEMORY')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-extrabold transition-all flex items-center gap-2 border text-xs cursor-pointer ${
                  activeTab === 'AGENT_MEMORY'
                    ? 'bg-purple-950 text-purple-300 border-purple-600 glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Agent Memory & MCP Audit</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 text-center sm:text-right px-2 font-mono">
              PHASE: <strong className="text-cyan-400 font-bold">{phase}</strong>
            </span>
          </div>

          {/* Active View Container with AnimatePresence */}
          <AnimatePresence mode="wait">
            {activeTab === 'TERMINAL' ? (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <AgentTerminal
                  logs={logs}
                  isStreaming={isStreaming}
                  currentPhase={phase}
                  onClearLogs={clearTerminal}
                  onTriggerSimulatedAlert={() => runIncidentPipeline()}
                />
              </motion.div>
            ) : activeTab === 'VECTOR_GRAPH' ? (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <ClusterTopology
                  clusterState={
                    phase === 'SELF_HEAL'
                      ? 'RECOVERING'
                      : phase !== 'IDLE' && phase !== 'RESOLVED'
                      ? 'INCIDENT'
                      : 'HEALTHY'
                  }
                />
                <VectorSimilarityGraph
                  alertText={telemetryInput}
                  isSearching={phase === 'VECTOR_SEARCH'}
                />
              </motion.div>
            ) : (
              <motion.div
                key="memory_panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <ClusterTopology
                  clusterState={
                    phase === 'SELF_HEAL'
                      ? 'RECOVERING'
                      : phase !== 'IDLE' && phase !== 'RESOLVED'
                      ? 'INCIDENT'
                      : 'HEALTHY'
                  }
                />
                <AgentMemoryPanel />
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Voice Approval & Massive Glowing Button */}
          <VoiceApprovalButton
            onApprove={handleApproveFix}
            isAwaitingApproval={phase === 'AWAITING_APPROVAL'}
            isResolved={phase === 'RESOLVED'}
          />
        </div>
      </main>

      {/* DEMO CONTROL PANEL TOOLBAR (Fixed Sleek Admin Toolbar for 3-Minute Hackathon Demo Video) */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-cyan-500/40 backdrop-blur-xl px-3 sm:px-6 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-extrabold text-cyan-300 tracking-wider text-[11px] uppercase flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            Demo Control Panel <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-600 font-mono">SRE ADMIN TOOLBAR</span>
          </span>
        </div>

        {/* Hackathon Demo Scenario Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button 1: DB Pool Exhaustion Scenario */}
          <button
            onClick={() => {
              const payload = 'CRITICAL: DB Connection Pool Exhausted on auth-service at 18:00 UTC.';
              setTelemetryInput(payload);
              setActiveTab('VECTOR_GRAPH');
              runIncidentPipeline(payload);
            }}
            className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-500/70 hover:border-red-400 font-bold transition-all text-xs flex items-center gap-1.5 shadow-lg glow-red cursor-pointer"
            title="Simulate AWS CloudWatch payload arriving and trigger ClusterTopology INCIDENT state"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Trigger Scenario: DB Pool Exhaustion</span>
          </button>

          {/* Button 2: Slow Queries Scenario */}
          <button
            onClick={() => {
              const payload = 'HIGH_ALERT: Slow Query Threshold Exceeded (>4800ms) on pg_stat_activity query runner.';
              setTelemetryInput(payload);
              setActiveTab('TERMINAL');
              runIncidentPipeline(payload);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-500/70 hover:border-amber-400 font-bold transition-all text-xs flex items-center gap-1.5 shadow-lg glow-amber cursor-pointer"
            title="Simulate slow query metric payload arriving"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Trigger Scenario: Slow Queries</span>
          </button>

          {/* Button 3: Agent Crash & Recovery */}
          <button
            onClick={() => {
              setMemoryNotification('⚠️ AGENT PROCESS CRASH SIMULATED (SIGSEGV) — Restarting worker daemon & re-syncing Raft topology...');
              setPhase('SELF_HEAL');
              setLogs((prev) => [
                ...prev,
                {
                  phase: 'SELF_HEAL',
                  reasoning: 'CRASH RECOVERY SIMULATION: Agent process crash detected. Restoring execution memory checkpoint from CockroachDB pgvector.',
                  action: 'systemctl restart sentinel-agent-worker && pgvector_resync() -> RECOVERY_SUCCESS',
                },
              ]);
              setTimeout(() => {
                setPhase('RESOLVED');
                setMemoryNotification('Agent process recovered & memory state re-synchronized!');
                setTimeout(() => setMemoryNotification(null), 5000);
              }, 3000);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-500/70 hover:border-cyan-400 font-bold transition-all text-xs flex items-center gap-1.5 shadow-lg glow-cyan cursor-pointer"
            title="Simulate process restart, state re-sync, and recovery transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>Simulate Agent Crash & Recovery</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
