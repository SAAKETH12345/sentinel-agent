import React, { useState, useEffect, memo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Cpu, Database, Activity, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface TelemetryPoint {
  time: string;
  cpu: number;
  dbConnections: number;
  cpuThreshold: number;
  dbLimit: number;
}

const initialData: TelemetryPoint[] = Array.from({ length: 15 }, (_, i) => {
  const t = new Date(Date.now() - (14 - i) * 2000);
  const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return {
    time: timeStr,
    cpu: Math.floor(45 + Math.random() * 20),
    dbConnections: Math.floor(55 + Math.random() * 20),
    cpuThreshold: 85,
    dbLimit: 100,
  };
});

interface TelemetryChartsProps {
  isAlertActive: boolean;
  overrideCpu?: number | null;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = memo(({
  isAlertActive,
  overrideCpu = null,
}) => {
  const [data, setData] = useState<TelemetryPoint[]>(initialData);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setData((prevData) => {
        const lastPoint = prevData[prevData.length - 1];
        let nextCpu: number;
        let nextDb: number;

        if (overrideCpu !== null && overrideCpu !== undefined) {
          // Smoothly animate towards target override CPU (e.g. 99% or 20%)
          const current = lastPoint?.cpu || 50;
          const diff = overrideCpu - current;
          nextCpu = Math.abs(diff) < 2 ? overrideCpu : current + diff * 0.45;

          if (overrideCpu > 85) {
            nextDb = Math.min(100, (lastPoint?.dbConnections || 80) + 4);
          } else {
            nextDb = Math.max(28, (lastPoint?.dbConnections || 50) - 6);
          }
        } else if (isAlertActive) {
          // Spike telemetry when an incident alert is triggered
          nextCpu = Math.min(99, Math.max(85, (lastPoint?.cpu || 75) + (Math.random() * 8 - 3)));
          nextDb = Math.min(100, Math.max(90, (lastPoint?.dbConnections || 85) + (Math.random() * 4 - 1)));
        } else {
          // Normal operations (nominal)
          nextCpu = Math.min(65, Math.max(18, (lastPoint?.cpu || 35) + (Math.random() * 6 - 3)));
          nextDb = Math.min(70, Math.max(25, (lastPoint?.dbConnections || 40) + (Math.random() * 6 - 3)));
        }

        const newPoint: TelemetryPoint = {
          time: timeStr,
          cpu: Math.round(nextCpu),
          dbConnections: Math.round(nextDb),
          cpuThreshold: 85,
          dbLimit: 100,
        };

        return [...prevData.slice(1), newPoint];
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isLive, isAlertActive, overrideCpu]);

  const currentCpu = data[data.length - 1]?.cpu || 0;
  const currentDb = data[data.length - 1]?.dbConnections || 0;
  const isCritical = currentCpu > 85;

  return (
    <div
      className={`glass-panel rounded-xl p-3.5 sm:p-4.5 shadow-2xl relative overflow-hidden transition-colors duration-300 ${
        isCritical ? 'border-red-500/60 glow-red' : 'border-slate-800/90'
      }`}
    >
      <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-cyan-400'} animate-pulse`} />
          <h2
            className={`text-xs uppercase tracking-widest font-bold ${
              isCritical ? 'text-red-400 text-glow-amber' : 'text-cyan-400 text-glow-cyan'
            }`}
          >
            Live Cluster Telemetry
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-mono transition-all border cursor-pointer ${
              isLive
                ? 'bg-cyan-950/80 border-cyan-600/80 text-cyan-300 glow-cyan'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isLive ? 'animate-spin' : ''}`} />
            <span>{isLive ? 'STREAMING' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3.5 font-mono">
        {/* CPU Utilization Metric Card */}
        <div
          className={`p-2.5 sm:p-3.5 rounded-xl border transition-colors duration-300 ${
            isCritical
              ? 'bg-red-950/40 border-red-500/80 glow-red'
              : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 mb-1 gap-1">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] sm:text-xs">
              <Cpu className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCritical ? 'text-red-400' : 'text-cyan-400'}`} />
              <span>CPU Utilization</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold w-fit ${
                isCritical ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'text-cyan-400'
              }`}
            >
              {isCritical ? 'CRITICAL' : 'NOMINAL'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1">
            <span className={isCritical ? 'text-red-400 text-glow-amber' : 'text-cyan-400 text-glow-cyan'}>
              {currentCpu}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-bold">%</span>
          </div>
        </div>

        {/* Database Connections Metric Card */}
        <div
          className={`p-2.5 sm:p-3.5 rounded-xl border transition-colors duration-300 ${
            currentDb > 85
              ? 'bg-amber-950/40 border-amber-500/80 glow-amber'
              : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 mb-1 gap-1">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] sm:text-xs">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>DB Pool</span>
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold ${currentDb > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {currentDb}/100 max
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1">
            <span className={currentDb > 85 ? 'text-amber-400 text-glow-amber' : 'text-emerald-400 text-glow-emerald'}>
              {currentDb}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-bold">conns</span>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart for CPU & DB */}
      <div className="h-36 sm:h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isCritical ? '#ef4444' : '#06b6d4'} stopOpacity={0.65} />
                <stop offset="95%" stopColor={isCritical ? '#ef4444' : '#06b6d4'} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="dbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[0, 100]} />

            <Tooltip
              contentStyle={{
                backgroundColor: '#060a12',
                borderColor: '#1e293b',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxShadow: '0 0 20px rgba(6,182,212,0.3)',
              }}
            />

            <ReferenceLine
              y={85}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: '85%', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }}
            />

            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU Utilization %"
              stroke={isCritical ? '#ef4444' : '#06b6d4'}
              strokeWidth={isCritical ? 3 : 2.5}
              fillOpacity={1}
              fill="url(#cpuGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="dbConnections"
              name="DB Pool Conns"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#dbGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
