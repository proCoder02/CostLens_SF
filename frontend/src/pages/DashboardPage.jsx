import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { dashboardAPI, usageAPI } from '../api';
import { PageLoader, ErrorState } from '../components/Spinner';
import { formatCurrency, formatPct, formatNumber, PROVIDER_COLORS } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Link2, Lightbulb, ArrowUpRight } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState(30);
  const { data: dash, loading, error, refetch } = useApi(dashboardAPI.getSummary, [period]);
  const { data: endpoints } = useApi(usageAPI.getEndpoints, [period]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!dash) return null;

  const changeUp = dash.daily_change_pct > 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-all duration-150
                ${period === opt.value
                  ? 'bg-brand-500/25 text-brand-300'
                  : 'text-white/30 hover:text-white/50'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Today's Spend"
          value={formatCurrency(dash.today_cost)}
          sub={
            <span className={changeUp ? 'text-accent-red' : 'text-accent-green'}>
              {formatPct(dash.daily_change_pct)} vs yesterday
            </span>
          }
          icon={changeUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          iconColor={changeUp ? 'text-accent-red' : 'text-accent-green'}
        />
        <SummaryCard
          label="MTD Spend"
          value={formatCurrency(dash.mtd_cost, 0)}
          sub={`of ${formatCurrency(dash.monthly_budget, 0)} budget`}
          progress={dash.budget_usage_pct}
          icon={<Wallet size={16} />}
          iconColor="text-brand-300"
        />
        <SummaryCard
          label="Active APIs"
          value={dash.active_connections}
          sub={`of ${dash.total_connections} configured`}
          icon={<Link2 size={16} />}
          iconColor="text-accent-cyan"
        />
        <SummaryCard
          label="Potential Savings"
          value={formatCurrency(dash.potential_savings, 0) + '/mo'}
          sub="View recommendations"
          icon={<Lightbulb size={16} />}
          iconColor="text-accent-green"
        />
      </div>

      {/* Cost chart */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Daily Cost Breakdown</h2>
            <p className="text-[11px] font-mono text-white/25 mt-0.5">Stacked by provider · last {period} days</p>
          </div>
          <div className="flex gap-4">
            {dash.providers?.map((p) => (
              <div key={p.provider} className="flex items-center gap-1.5 text-[11px] text-white/40">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: PROVIDER_COLORS[p.provider] || '#6366f1' }}
                />
                {p.provider}
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dash.daily_costs || []} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              interval={Math.ceil((dash.daily_costs?.length || 30) / 8)}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={45}
            />
            <Tooltip content={<CustomTooltip providers={dash.providers || []} />} />
            {(dash.providers || []).map((p) => (
              <Bar
                key={p.provider}
                dataKey={`costs.${p.provider}`}
                stackId="cost"
                fill={PROVIDER_COLORS[p.provider] || '#6366f1'}
                radius={[0, 0, 0, 0]}
                opacity={0.85}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top endpoints */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Top Endpoints by Cost</h2>
        <div className="space-y-0">
          {(endpoints || []).slice(0, 6).map((ep, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-3 ${i < 5 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <span className="text-[10px] font-mono text-white/15 w-5 text-right">#{i + 1}</span>
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PROVIDER_COLORS[ep.provider] || '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white truncate">{ep.endpoint}</div>
                <div className="text-[10px] text-white/25">{ep.feature_tag} · {formatNumber(ep.total_requests)} calls</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold font-mono text-white">{formatCurrency(ep.total_cost)}</div>
                <span className={`text-[10px] font-mono ${ep.change_pct > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                  {ep.change_pct > 0 ? '▲' : '▼'} {Math.abs(ep.change_pct)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function SummaryCard({ label, value, sub, icon, iconColor, progress }) {
  return (
    <div className="card-hover relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{label}</span>
        <span className={`${iconColor} opacity-50 group-hover:opacity-80 transition-opacity`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white font-mono tracking-tight mb-1">{value}</div>
      {sub && <div className="text-[11px] text-white/30">{sub}</div>}
      {progress != null && (
        <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: progress > 90 ? '#ef4444' : progress > 75 ? '#f59e0b' : '#6366f1',
            }}
          />
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label, providers }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface-200 border border-white/10 rounded-xl p-3 shadow-xl min-w-[160px]">
      <div className="text-[11px] font-mono text-white/40 mb-2">{label}</div>
      {payload.map((entry, i) => {
        const provider = entry.dataKey.replace('costs.', '');
        return (
          <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1">
            <span className="flex items-center gap-1.5 text-white/50">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.fill }} />
              {provider}
            </span>
            <span className="font-mono text-white">{formatCurrency(entry.value)}</span>
          </div>
        );
      })}
      <div className="border-t border-white/[0.08] mt-2 pt-2 flex items-center justify-between text-xs">
        <span className="text-white/40">Total</span>
        <span className="font-mono font-semibold text-white">
          {formatCurrency(payload.reduce((s, e) => s + (e.value || 0), 0))}
        </span>
      </div>
    </div>
  );
}
