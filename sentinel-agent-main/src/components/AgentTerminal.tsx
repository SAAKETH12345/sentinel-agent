import React, { useState, useEffect, useRef, memo } from 'react';
import { Terminal as TerminalIcon, Play, Pause, RefreshCw, Copy, Check, ShieldCheck, Zap, Server, ChevronRight, Cpu, Sparkles, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TerminalStep {
  phase: string;
  reasoning: string;
  action: string;
  confidence?: number;
  timestamp?: string;
  codeSnippet?: string;
}

interface AgentTerminalProps {
  logs: TerminalStep[];
  isStreaming: boolean;
  currentPhase: string;
  onClearLogs: () => void;
  onTriggerSimulatedAlert: () => void;
  playTyping?: () => void;
  stopTyping?: () => void;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = memo(({
  logs,
  isStreaming,
  currentPhase,
  onClearLogs,
  onTriggerSimulatedAlert,
  playTyping,
  stopTyping,
}) => {
  const [typedLogs, setTypedLogs] = useState<TerminalStep[]>([]);
  const [currentTypingText, setCurrentTypingText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Audio typewriter sound effect loop
  useEffect(() => {
    if ((isTyping || isStreaming) && currentPhase !== 'RESOLVED' && currentPhase !== 'IDLE') {
      playTyping?.();
    } else {
      stopTyping?.();
    }
  }, [isTyping, isStreaming, currentPhase, playTyping, stopTyping]);

  // Ultra-Fluid Hacker Terminal Typewriter Animation (requestAnimationFrame @ 144 FPS)
  useEffect(() => {
    if (logs.length === 0) {
      setTypedLogs([]);
      setCurrentTypingText('');
      setIsTyping(false);
      return;
    }

    if (typedLogs.length < logs.length) {
      const targetLog = logs[typedLogs.length];
      setIsTyping(true);

      const fullText = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          phase: targetLog.phase,
          reasoning: targetLog.reasoning,
          action: targetLog.action,
        },
        null,
        2
      );

      let charIndex = 0;
      let rafId: number;
      let lastTime = performance.now();

      const renderStep = (now: number) => {
        const elapsed = now - lastTime;
        // Fluid speed: ~2-3 characters every 18ms for graceful cyber typewriter feel
        if (elapsed >= 18) {
          lastTime = now;
          charIndex += Math.min(Math.floor(Math.random() * 2) + 2, fullText.length - charIndex);
          setCurrentTypingText(fullText.slice(0, charIndex));
        }

        if (charIndex < fullText.length) {
          rafId = requestAnimationFrame(renderStep);
        } else {
          setTypedLogs((prev) => [...prev, targetLog]);
          setCurrentTypingText('');
          setIsTyping(false);
        }
      };

      rafId = requestAnimationFrame(renderStep);
      return () => cancelAnimationFrame(rafId);
    }
  }, [logs, typedLogs]);

  // Buttery-Smooth Continuous Gliding Auto-Scroll Engine (144 FPS RAF lerp)
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      const element = scrollContainerRef.current;
      let rafId: number;

      const smoothGlideScroll = () => {
        const target = element.scrollHeight - element.clientHeight;
        const current = element.scrollTop;
        const diff = target - current;

        if (Math.abs(diff) > 0.5) {
          // Smooth exponential easing for camera-like gliding scroll tracking
          element.scrollTop = current + diff * 0.15;
          rafId = requestAnimationFrame(smoothGlideScroll);
        } else {
          element.scrollTop = target;
        }
      };

      rafId = requestAnimationFrame(smoothGlideScroll);
      return () => cancelAnimationFrame(rafId);
    }
  }, [typedLogs, currentTypingText, autoScroll]);

  // Handle user manual scroll up/down inside terminal container
  const handleContainerScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const copyToClipboard = () => {
    const fullLogText = logs.map((l) => JSON.stringify(l, null, 2)).join('\n\n');
    navigator.clipboard.writeText(fullLogText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPhaseBadgeStyle = (phase: string) => {
    switch (phase) {
      case 'RECEIVE_TELEMETRY':
        return 'bg-cyan-950/90 border-cyan-600 text-cyan-300 glow-cyan';
      case 'VECTOR_SEARCH':
        return 'bg-purple-950/90 border-purple-600 text-purple-300';
      case 'DIAGNOSE':
        return 'bg-blue-950/90 border-blue-600 text-blue-300';
      case 'PROPOSE_FIX':
      case 'AWAITING_APPROVAL':
        return 'bg-amber-950/90 border-amber-500 text-amber-300 glow-amber';
      case 'SELF_HEAL':
      case 'APPLYING_FIX':
        return 'bg-emerald-950/90 border-emerald-500 text-emerald-300 glow-emerald';
      case 'RESOLVED':
        return 'bg-emerald-950 border-emerald-400 text-emerald-200 text-glow-emerald';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="glass-panel border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px] sm:h-[640px] lg:h-[780px] relative scanlines font-mono">
      {/* Top Cyber Status Bar */}
      <div className="bg-[#090e1c] border-b border-slate-800 p-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block border border-red-400" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-400" />
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 tracking-wider">
              AGENT_TERMINAL // FLUID_STREAMING
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Badge */}
          <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded font-bold border transition-all ${getPhaseBadgeStyle(currentPhase)}`}>
            PHASE: {currentPhase}
          </span>

          {/* Action Tools */}
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-600 transition-colors cursor-pointer"
            title="Copy Terminal Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-600 transition-colors cursor-pointer"
            title="Clear Output"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300 font-mono select-text relative smooth-scroll-viewport"
      >
        {/* Empty State Banner */}
        {logs.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-700/60 flex items-center justify-center glow-cyan">
              <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <p className="text-slate-200 font-bold text-base tracking-wide">SENTINEL AGENT TERMINAL STANDBY</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                Awaiting incoming AWS CloudWatch alerts or live telemetry stream. Select an alert from the left feed or dispatch a custom payload to trigger LLM diagnosis.
              </p>
            </div>
            <button
              onClick={onTriggerSimulatedAlert}
              className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 font-bold transition-all glow-cyan flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4 fill-cyan-400" />
              Simulate Incident Alert Stream
            </button>
          </div>
        )}

        {/* Rendered Completed Log Entries with Animated Spring Entry */}
        {typedLogs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-950/95 border border-slate-800/90 rounded-xl p-4 shadow-xl hover:border-cyan-800/80 transition-colors duration-200"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-900 text-[11px]">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-400 font-bold text-glow-cyan">{log.phase}</span>
              </div>
              <span className="text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                STEP 0{index + 1}
              </span>
            </div>

            {/* Reasoning */}
            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Reasoning / Thought Process:</span>
              <p className="text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 font-sans leading-relaxed text-xs">
                {log.reasoning}
              </p>
            </div>

            {/* Action code block */}
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Executed Tool / Action:</span>
              <pre className="text-emerald-400 bg-black/90 p-3.5 rounded-lg border border-emerald-950 font-mono overflow-x-auto whitespace-pre-wrap break-all shadow-inner text-xs leading-relaxed">
                {log.action}
              </pre>
            </div>
          </motion.div>
        ))}

        {/* Live Fluid Typewriter Block */}
        {currentTypingText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950 border border-cyan-500/80 rounded-xl p-4.5 shadow-2xl glow-cyan"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-950 text-[11px]">
              <span className="text-cyan-300 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                STREAMING LLM REASONING...
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            </div>
            <pre className="text-cyan-400 font-mono whitespace-pre-wrap break-all leading-relaxed text-xs">
              {currentTypingText}
              <span className="inline-block w-2.5 h-4 bg-cyan-400 ml-1 align-middle animate-terminal-blink" />
            </pre>
          </motion.div>
        )}

        {/* Active streaming spinner when waiting next chunk */}
        {isStreaming && !currentTypingText && typedLogs.length > 0 && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl shadow-inner glow-cyan">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="font-bold">Agent executing CockroachDB vector similarity search & diagnostics...</span>
          </div>
        )}

        {/* Floating Jump to Bottom Button */}
        <AnimatePresence>
          {!autoScroll && typedLogs.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="sticky bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold text-xs shadow-2xl glow-cyan flex items-center gap-2 hover:bg-cyan-900 transition-all z-20 cursor-pointer"
            >
              <span>Jump to latest logs ↓</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Terminal Footer Indicator */}
      <div className="bg-[#090e1c] border-t border-slate-800 p-2.5 px-4 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
          <span>WebSocket Status: {isStreaming ? 'STREAMING FLUID [144 FPS RAF]' : 'CONNECTED / STANDBY'}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-cyan-500 rounded"
          />
          <span className="text-[10px] text-slate-400">Auto-scroll</span>
        </label>
      </div>
    </div>
  );
});
