import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { usageAPI } from '../api';
import { PageLoader, ErrorState, EmptyState } from '../components/Spinner';
import { formatCurrency, formatNumber, PROVIDER_COLORS } from '../utils/format';
import { ArrowUpDown, Search } from 'lucide-react';

export default function EndpointsPage() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('total_cost');
  const [sortDir, setSortDir] = useState('desc');
  const { data, loading, error, refetch } = useApi(usageAPI.getEndpoints, [days]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = (data || [])
    .filter((ep) =>
      ep.endpoint.toLowerCase().includes(search.toLowerCase()) ||
      ep.feature_tag.toLowerCase().includes(search.toLowerCase()) ||
      ep.provider.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * mul;
    });

  const totalCost = filtered.reduce((s, ep) => s + ep.total_cost, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="page-title">Endpoints</h1>
          <p className="page-subtitle">{filtered.length} tracked endpoints · {days}-day window</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter endpoints..."
              className="input pl-9 py-2 text-sm w-56"
            />
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input py-2 text-sm w-20 cursor-pointer"
          >
            <option value={7}>7d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="⟁"
          title="No endpoints found"
          description="Connect an API provider and start tracking usage to see endpoint data here."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {[
                  { key: null, label: 'Endpoint', width: 'w-auto' },
                  { key: null, label: 'Provider', width: 'w-28' },
                  { key: 'total_requests', label: 'Calls', width: 'w-24' },
                  { key: 'total_cost', label: 'Cost', width: 'w-24' },
                  { key: 'avg_latency_ms', label: 'Latency', width: 'w-24' },
                  { key: 'change_pct', label: 'Trend', width: 'w-24' },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`table-header text-left py-3 px-2 ${col.width} ${col.key ? 'cursor-pointer select-none hover:text-white/40 transition-colors' : ''}`}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && sortKey === col.key && (
                        <ArrowUpDown size={10} className="text-brand-400" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ep, i) => {
                const costPct = totalCost > 0 ? (ep.total_cost / totalCost) * 100 : 0;
                return (
                  <tr
                    key={i}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="text-xs font-mono text-white">{ep.endpoint}</div>
                      <div className="text-[10px] text-white/25 mt-0.5">{ep.feature_tag}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ backgroundColor: PROVIDER_COLORS[ep.provider] || '#6366f1' }}
                        />
                        {ep.provider}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-white/60">{formatNumber(ep.total_requests)}</td>
                    <td className="py-3 px-2">
                      <div className="text-sm font-semibold font-mono text-white">{formatCurrency(ep.total_cost)}</div>
                      {/* Cost bar */}
                      <div className="w-16 h-1 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand-500/60 rounded-full"
                          style={{ width: `${Math.min(costPct, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-white/40">{Math.round(ep.avg_latency_ms)}ms</td>
                    <td className="py-3 px-2">
                      <span
                        className={`badge ${
                          ep.change_pct > 20
                            ? 'badge-red'
                            : ep.change_pct > 0
                            ? 'badge-amber'
                            : 'badge-green'
                        }`}
                      >
                        {ep.change_pct > 0 ? '▲' : '▼'} {Math.abs(ep.change_pct)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
