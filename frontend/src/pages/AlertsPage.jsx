import { useState, useCallback } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { alertsAPI } from '../api';
import { PageLoader, ErrorState, EmptyState } from '../components/Spinner';
import { timeAgo, SEVERITY_STYLES } from '../utils/format';
import { Bell, CheckCheck, RefreshCw, Filter } from 'lucide-react';

const SEVERITY_FILTERS = ['all', 'critical', 'warning', 'info', 'success'];

export default function AlertsPage() {
  const [filter, setFilter] = useState('all');
  const { data: alerts, loading, error, refetch, setData } = useApi(alertsAPI.list, [50]);
  const { mutate: markAll, loading: markingAll } = useMutation(alertsAPI.markAllRead);
  const { mutate: triggerCheck, loading: checking } = useMutation(alertsAPI.triggerCheck);

  const handleMarkAllRead = useCallback(async () => {
    await markAll();
    setData((prev) => (prev || []).map((a) => ({ ...a, is_read: true })));
  }, [markAll, setData]);

  const handleTriggerCheck = useCallback(async () => {
    await triggerCheck();
    refetch();
  }, [triggerCheck, refetch]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allAlerts = alerts || [];
  const filtered = filter === 'all' ? allAlerts : allAlerts.filter((a) => a.severity === filter);
  const unreadCount = allAlerts.filter((a) => !a.is_read).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">{unreadCount} unread · {allAlerts.length} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTriggerCheck}
            disabled={checking}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            Run check
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Severity filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto">
        {SEVERITY_FILTERS.map((sev) => {
          const count = sev === 'all' ? allAlerts.length : allAlerts.filter((a) => a.severity === sev).length;
          return (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all duration-150
                ${filter === sev
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                }`}
            >
              {sev === 'all' ? 'All' : sev}
              <span className="ml-1.5 text-[10px] font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No alerts"
          description={filter === 'all' ? 'All clear — no alerts to show' : `No ${filter} alerts`}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
            return (
              <div
                key={alert.id}
                className={`card flex gap-3 items-start transition-all duration-200
                  ${s.bg} ${s.border} border
                  ${alert.is_read ? 'opacity-55 hover:opacity-80' : 'opacity-100'}`}
              >
                <span className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`badge ${s.bg} ${s.text} ${s.border} border text-[9px] uppercase tracking-wider mb-1.5`}>
                        {alert.alert_type}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/20 flex-shrink-0">
                      {timeAgo(alert.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-white/80 leading-relaxed mt-1">{alert.message}</p>
                </div>
                {!alert.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
