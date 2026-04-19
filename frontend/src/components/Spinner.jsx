export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
  };

  return (
    <div className={`${sizes[size]} border-brand-500/30 border-t-brand-400 rounded-full animate-spin ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <span className="text-sm text-white/30 font-mono tracking-wide">Loading data...</span>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex-1 flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center text-accent-red text-xl">!</div>
        <p className="text-white/60 text-sm">{message || 'Something went wrong'}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary text-sm px-4 py-2">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-3xl mb-3 opacity-40">{icon}</div>}
      <h3 className="text-white/60 font-medium mb-1">{title}</h3>
      {description && <p className="text-white/30 text-sm max-w-xs">{description}</p>}
      {action && onAction && (
        <button onClick={onAction} className="btn-primary text-sm mt-4">
          {action}
        </button>
      )}
    </div>
  );
}
