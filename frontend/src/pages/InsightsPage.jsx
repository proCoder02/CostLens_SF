import { useApi } from '../hooks/useApi';
import { insightsAPI } from '../api';
import { PageLoader, ErrorState, EmptyState } from '../components/Spinner';
import { DollarSign, ArrowRight, TrendingDown } from 'lucide-react';

export default function InsightsPage() {
  const { data: insights, loading, error, refetch } = useApi(insightsAPI.list, [30]);
  const { data: summary } = useApi(insightsAPI.summary, [30]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allInsights = insights || [];
  const totalSavings = summary?.total_potential_savings || '$0/mo';

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="page-title">Smart Insights</h1>
        <p className="page-subtitle">AI-powered optimization recommendations</p>
      </div>

      {allInsights.length === 0 ? (
        <EmptyState
          icon="✦"
          title="No insights yet"
          description="Connect API providers and accumulate usage data to receive optimization recommendations."
        />
      ) : (
        <>
          {/* Insight cards */}
          <div className="space-y-3 mb-8">
            {allInsights.map((ins, i) => (
              <div
                key={i}
                className="card-hover flex gap-4 items-start"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl flex-shrink-0">
                  {ins.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-white">{ins.title}</h3>
                    <span className="badge badge-brand flex-shrink-0">
                      #{ins.priority}
                    </span>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed mb-3">{ins.detail}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-green/[0.07] border border-accent-green/15">
                    <span className="text-xs text-accent-green">{ins.action}</span>
                    <ArrowRight size={12} className="text-accent-green/60" />
                    <span className="text-xs font-bold font-mono text-accent-green">Save {ins.estimated_savings}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total savings card */}
          <div className="card text-center py-10 relative overflow-hidden noise">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.08] to-accent-cyan/[0.04]" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-green/10 mb-4 glow-cyan">
                <TrendingDown size={24} className="text-accent-green" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Total Potential Savings</h2>
              <div className="text-4xl font-bold font-mono text-accent-green mb-3 tracking-tight">
                {totalSavings}
              </div>
              <p className="text-xs text-white/35 max-w-xs mx-auto">
                Implement all {allInsights.length} recommendations to reduce your API spend
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
