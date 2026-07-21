import React, { useState, useEffect, useRef, memo } from 'react';
import { ShieldAlert, Radio, ArrowRight, Server, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

export interface CloudWatchAlert {
  id: string;
  timestamp: string;
  namespace: string;
  metricName: string;
  resourceId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  value: string;
  summary: string;
}

const mockAlertTemplates: Omit<CloudWatchAlert, 'id' | 'timestamp'>[] = [
  {
    namespace: 'AWS/RDS',
    metricName: 'DatabaseConnections',
    resourceId: 'prod-auth-db-us-east-1a',
    severity: 'CRITICAL',
    value: '100 / 100 Max Conns',
    summary: 'CRITICAL: DB Connection Pool Exhausted on auth-service at 18:00 UTC.',
  },
  {
    namespace: 'AWS/EC2',
    metricName: 'CPUUtilization',
    resourceId: 'checkout-worker-asg-i-0f8a92b',
    severity: 'CRITICAL',
    value: '96.8% (Threshold > 85%)',
    summary: 'High CPU utilization detected on checkout cluster. Worker nodes throttling.',
  },
  {
    namespace: 'AWS/ECS',
    metricName: 'MemoryUtilization',
    resourceId: 'payment-gateway-service-v2',
    severity: 'WARNING',
    value: '88.4% (8192 MB)',
    summary: 'Memory footprint spiking above 85% threshold. Potential heap leak in payment workers.',
  },
  {
    namespace: 'AWS/Kinesis',
    metricName: 'ReadProvisionedThroughputExceeded',
    resourceId: 'telemetry-stream-main',
    severity: 'WARNING',
    value: '423 Exceeded Events/sec',
    summary: 'Shard throughput throttled on telemetry data stream.',
  },
  {
    namespace: 'AWS/ElastiCache',
    metricName: 'EngineCPUUtilization',
    resourceId: 'redis-session-cache-cluster',
    severity: 'CRITICAL',
    value: '99.1% CPU',
    summary: 'Redis session cache primary node unresponsive. Key evictions surging.',
  },
  {
    namespace: 'AWS/Lambda',
    metricName: 'Throttles',
    resourceId: 'auth-token-verifier-fn',
    severity: 'CRITICAL',
    value: '1,250 Concurrent Throttles',
    summary: 'Lambda execution concurrency quota reached. Requests returning HTTP 429.',
  },
  {
    namespace: 'AWS/DynamoDB',
    metricName: 'WriteThrottleEvents',
    resourceId: 'user-sessions-dynamo-table',
    severity: 'WARNING',
    value: '84 Throttled Requests/min',
    summary: 'Write capacity units exceeded on global secondary index.',
  },
  {
    namespace: 'AWS/APIGateway',
    metricName: '5XXError',
    resourceId: 'prod-api-v1-gateway',
    severity: 'CRITICAL',
    value: '5.8% Error Rate',
    summary: 'Upstream gateway timeouts detected on /v1/checkout endpoint.',
  },
];

interface CloudWatchAlertsProps {
  onSelectAlert: (alertText: string) => void;
  activeAlertId: string | null;
}

export const CloudWatchAlerts: React.FC<CloudWatchAlertsProps> = memo(({
  onSelectAlert,
  activeAlertId,
}) => {
  const [alerts, setAlerts] = useState<CloudWatchAlert[]>(() => {
    return mockAlertTemplates.map((tpl, idx) => ({
      ...tpl,
      id: `cw-alert-${Date.now() - idx * 12000}`,
      timestamp: new Date(Date.now() - idx * 12000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));
  });

  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Periodic new incoming AWS alert injection to populate feed up to 15 items
  useEffect(() => {
    const timer = setInterval(() => {
      const randomTpl = mockAlertTemplates[Math.floor(Math.random() * mockAlertTemplates.length)];
      const now = new Date();
      const newAlert: CloudWatchAlert = {
        ...randomTpl,
        id: `cw-alert-${Date.now()}`,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 14)]);
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setIsScrolledDown(scrollRef.current.scrollTop > 60);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-panel border border-slate-800/90 rounded-xl p-4 shadow-2xl flex flex-col h-[400px] relative font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="absolute -inset-1 bg-amber-400 rounded-full animate-ping opacity-60" />
          </div>
          <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold text-glow-amber">
            Incoming AWS CloudWatch Alarms
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-300 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            LIVE FEED ({alerts.length})
          </span>
          {isScrolledDown && (
            <button
              onClick={scrollToTop}
              className="p-1 rounded bg-slate-900 border border-slate-700 text-amber-400 hover:bg-amber-950 hover:border-amber-500 transition-all cursor-pointer"
              title="Scroll to Top"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Smooth Hardware-Accelerated Alerts Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 font-mono smooth-scroll-viewport select-text relative"
      >
        {alerts.map((alert) => {
          const isSelected = activeAlertId === alert.id;
          const isCritical = alert.severity === 'CRITICAL';

          return (
            <div
              key={alert.id}
              onClick={() => onSelectAlert(alert.summary)}
              className={`p-3.5 rounded-xl border transition-colors duration-200 cursor-pointer group shadow-lg ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 glow-cyan'
                  : isCritical
                  ? 'bg-slate-950/90 border-red-900/40 hover:border-red-500/80 hover:bg-slate-900/90'
                  : 'bg-slate-950/80 border-slate-800/90 hover:border-amber-500/60 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wider bg-slate-900 border border-slate-700 text-slate-300">
                    {alert.namespace}
                  </span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                    {alert.resourceId}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{alert.timestamp}</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    {isCritical ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span>{alert.metricName}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {alert.summary}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAlert(alert.summary);
                  }}
                  className={`shrink-0 text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 glow-cyan'
                      : 'bg-slate-900 text-slate-300 group-hover:text-cyan-300 group-hover:border-cyan-600 border-slate-700'
                  }`}
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Metric Value:</span>
                <span className={isCritical ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                  {alert.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
