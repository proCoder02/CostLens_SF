import { ArrowRight, Eye, EyeOff, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface-50">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-surface-50 to-surface-0" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-cyan/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">CostLens</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Stop overpaying<br />
            for APIs.
          </h1>
          <p className="text-white/40 text-lg max-w-md leading-relaxed">
            Track every dollar across OpenAI, AWS, Stripe and more.
            Get alerts before costs spiral. Ship smarter.
          </p>

          {/* Floating stat cards */}
          <div className="mt-12 space-y-3 max-w-xs">
            {[
              { label: 'Avg. savings', value: '$847/mo', color: 'text-accent-green' },
              { label: 'APIs tracked', value: '12,400+', color: 'text-brand-300' },
              { label: 'Alert accuracy', value: '99.2%', color: 'text-accent-cyan' },
            ].map((stat) => (
              <div key={stat.label} className="card flex items-center justify-between">
                <span className="text-sm text-white/40">{stat.label}</span>
                <span className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">CostLens</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-white/35 text-sm mb-8">Sign in to your account</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@startup.io"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/30">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-1.5">Demo Account</p>
            <p className="text-xs text-white/40 font-mono">demoo@costlens.io / demodemo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
