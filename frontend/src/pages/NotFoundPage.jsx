import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-8xl font-bold font-mono text-white/[0.06] mb-4">404</div>
        <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-white/35 mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </div>
    </div>
  );
}
