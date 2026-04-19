/**
 * Format a number as currency.
 */
export function formatCurrency(value, decimals = 2) {
  if (value == null) return '$0.00';
  return '$' + Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large number with abbreviation (1.2K, 3.4M).
 */
export function formatNumber(value) {
  if (value == null) return '0';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString();
}

/**
 * Format a percentage with + prefix for positive values.
 */
export function formatPct(value) {
  if (value == null) return '0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}%`;
}

/**
 * Relative time string (2h ago, 3d ago).
 */
export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Provider color mapping.
 */
export const PROVIDER_COLORS = {
  openai: '#10a37f',
  aws: '#ff9900',
  stripe: '#635bff',
  twilio: '#f22f46',
  custom: '#6366f1',
};

export const PROVIDER_ICONS = {
  openai: '◈',
  aws: '◆',
  stripe: '◇',
  twilio: '◉',
  custom: '◎',
};

/**
 * Severity styles for alerts.
 */
export const SEVERITY_STYLES = {
  critical: { bg: 'bg-accent-red/10', border: 'border-accent-red/20', dot: 'bg-accent-red', text: 'text-accent-red' },
  warning:  { bg: 'bg-accent-amber/10', border: 'border-accent-amber/20', dot: 'bg-accent-amber', text: 'text-accent-amber' },
  info:     { bg: 'bg-brand-500/10', border: 'border-brand-500/20', dot: 'bg-brand-400', text: 'text-brand-300' },
  success:  { bg: 'bg-accent-green/10', border: 'border-accent-green/20', dot: 'bg-accent-green', text: 'text-accent-green' },
};
