import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
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
      await register(email, password, fullName);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">CostLens</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
        <p className="text-white/35 text-sm mb-8">Start monitoring API costs in 2 minutes</p>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Alex Chen"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@startup.io"
              required
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
                placeholder="Min. 8 characters"
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

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/30">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
