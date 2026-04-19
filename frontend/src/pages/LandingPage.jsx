import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, BarChart3, Bell, Sparkles, Shield, ArrowRight,
  Check, ChevronRight, Globe, Cpu, CreditCard, Phone,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <BarChart3 size={22} />,
    title: 'Real-Time Cost Tracking',
    desc: 'See exactly where every dollar goes across all your API providers. Per-endpoint, per-feature, per-day.',
  },
  {
    icon: <Bell size={22} />,
    title: 'Spike Alerts',
    desc: 'Get notified the moment your spend deviates from normal patterns. No more bill shock at month-end.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Smart Insights',
    desc: 'AI-powered optimization recommendations: caching, batching, deduplication — with estimated savings.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Read-Only Keys',
    desc: 'Your API keys are used read-only for usage polling. We never make calls on your behalf.',
  },
];

const PROVIDERS_LOGOS = [
  { name: 'OpenAI', icon: <Cpu size={20} />, color: '#10a37f' },
  { name: 'AWS', icon: <Globe size={20} />, color: '#ff9900' },
  { name: 'Stripe', icon: <CreditCard size={20} />, color: '#635bff' },
  { name: 'Twilio', icon: <Phone size={20} />, color: '#f22f46' },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    desc: 'For side projects',
    features: ['1 API connection', 'Basic tracking', '7-day history', 'Community support'],
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Startup',
    price: '$29',
    desc: 'For growing teams',
    features: ['Unlimited APIs', 'Spike alerts', 'Smart insights', '90-day history', '3 team seats', 'Email notifications'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$99',
    desc: 'For scaling companies',
    features: ['Everything in Startup', 'Advanced breakdown', 'Custom feature tags', 'Unlimited seats', 'REST API access', 'Slack integration', 'Priority support'],
    cta: 'Contact sales',
    highlight: false,
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-surface-0 text-white overflow-hidden">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-16 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight">CostLens</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#providers" className="hover:text-white transition-colors">Integrations</a>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/app" className="btn-primary text-sm flex items-center gap-1.5">
              Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative px-6 lg:px-16 pt-20 pb-32 text-center">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-brand-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-72 h-72 bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-60 right-1/4 w-56 h-56 bg-brand-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            Now tracking 12,000+ APIs across 800 startups
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-gradient">Stop guessing</span>
            <br />
            what your APIs cost
          </h1>

          <p className="text-lg lg:text-xl text-white/40 max-w-xl mx-auto leading-relaxed mb-10">
            Track usage across OpenAI, AWS, Stripe, and more.
            Get alerts before costs spike. Optimize with AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 glow-brand"
            >
              Start free — takes 2 min
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn-secondary text-base px-6 py-3.5">
              See how it works
            </a>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative z-10 max-w-4xl mx-auto mt-20">
          <div className="rounded-xl border border-white/[0.08] bg-surface-100/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="text-[10px] font-mono text-white/15 ml-3">app.costlens.io/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-4 gap-3">
              {[
                { label: "Today's Spend", val: '$47.82', change: '+12.4%', color: 'text-accent-amber' },
                { label: 'MTD Spend', val: '$1,241', change: '75% of budget', color: 'text-white/30' },
                { label: 'Active APIs', val: '4', change: 'All healthy', color: 'text-accent-green' },
                { label: 'Savings Found', val: '$110/mo', change: '4 insights', color: 'text-accent-green' },
              ].map((c) => (
                <div key={c.label} className="card">
                  <div className="text-[9px] font-mono text-white/25 uppercase tracking-wider mb-2">{c.label}</div>
                  <div className="text-xl font-bold font-mono text-white">{c.val}</div>
                  <div className={`text-[10px] mt-1 ${c.color}`}>{c.change}</div>
                </div>
              ))}
            </div>
            {/* Faux chart bars */}
            <div className="px-6 pb-6">
              <div className="h-32 flex items-end gap-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const h = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 40;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i === 26 ? '#ef4444' : '#6366f1',
                        opacity: 0.4 + (i / 30) * 0.4,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Providers ──────────────────────────────────────────── */}
      <section id="providers" className="px-6 lg:px-16 py-16 text-center">
        <p className="text-xs font-mono text-white/20 uppercase tracking-[0.2em] mb-8">Integrates with</p>
        <div className="flex items-center justify-center gap-10 flex-wrap">
          {PROVIDERS_LOGOS.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 text-white/30">
              <span style={{ color: p.color }}>{p.icon}</span>
              <span className="text-sm font-medium">{p.name}</span>
            </div>
          ))}
          <span className="text-xs text-white/15 font-mono">+ custom APIs</span>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="px-6 lg:px-16 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Everything you need to<br />
              <span className="text-gradient">control API costs</span>
            </h2>
            <p className="text-white/35 max-w-lg mx-auto">
              From real-time tracking to automated optimization — ship faster without the bill anxiety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover group p-7">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-300 mb-4 group-hover:bg-brand-500/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="px-6 lg:px-16 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-white/35">Start free. Upgrade when your team needs alerts and insights.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`card p-7 text-center relative
                  ${plan.highlight ? 'border-brand-500/30 bg-brand-500/[0.04] glow-brand' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-accent-cyan text-white text-[9px] font-bold font-mono uppercase tracking-wider px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-base font-bold text-white mb-1">{plan.name}</div>
                <div className="text-xs text-white/30 mb-4">{plan.desc}</div>
                <div className="text-4xl font-bold font-mono text-white mb-1">
                  {plan.price}<span className="text-sm font-normal text-white/25">/mo</span>
                </div>
                <div className="border-t border-white/[0.06] my-6" />
                <div className="space-y-2.5 text-left mb-8">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-xs text-white/50">
                      <Check size={14} className="text-accent-green flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  to="/register"
                  className={`block w-full py-2.5 rounded-lg text-sm font-medium transition-all
                    ${plan.highlight
                      ? 'btn-primary'
                      : 'btn-secondary'
                    }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-16 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            Ready to stop overpaying?
          </h2>
          <p className="text-white/35 mb-8 text-lg">
            Join 800+ startups already saving an average of $847/month on API costs.
          </p>
          <Link to="/register" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2 glow-brand">
            Start for free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 lg:px-16 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold">CostLens</span>
            <span className="text-xs text-white/15 font-mono ml-2">v1.0</span>
          </div>
          <div className="flex gap-8 text-xs text-white/25">
            <a href="#" className="hover:text-white/50 transition-colors">Docs</a>
            <a href="#" className="hover:text-white/50 transition-colors">Blog</a>
            <a href="#" className="hover:text-white/50 transition-colors">Status</a>
            <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
          </div>
          <div className="text-xs text-white/15 font-mono">
            © 2026 CostLens. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
