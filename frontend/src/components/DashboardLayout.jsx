import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alertsAPI } from '../api';
import {
  LayoutDashboard, Waypoints, Bell, Sparkles, Settings,
  LogOut, Menu, X, Zap, ChevronRight, CreditCard, Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/app',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/app/endpoints', label: 'Endpoints', icon: Waypoints },
  { path: '/app/alerts',    label: 'Alerts',    icon: Bell },
  { path: '/app/insights',  label: 'Insights',  icon: Sparkles },
  { path: '/app/billing',   label: 'Billing',   icon: CreditCard },
  { path: '/app/settings',  label: 'Settings',  icon: Settings },
];

const ADMIN_NAV = { path: '/app/admin', label: 'Admin', icon: Shield, adminOnly: true };

const PLAN_LABELS = {
  free: 'Free',
  startup: 'Startup · $29/mo',
  business: 'Business · $99/mo',
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Fetch unread count
  useEffect(() => {
    alertsAPI.unreadCount().then((d) => setUnread(d.unread_count)).catch(() => {});
    const interval = setInterval(() => {
      alertsAPI.unreadCount().then((d) => setUnread(d.unread_count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[220px] bg-surface-50 border-r border-white/[0.06]
          flex flex-col z-50 transition-transform duration-300 lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-7">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center glow-brand">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white tracking-tight">CostLens</div>
            <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.12em]">api monitor</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
              {label === 'Alerts' && unread > 0 && (
                <span className="ml-auto bg-accent-red text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}

          {/* Admin nav — only visible to admin users */}
          {user?.is_admin && (
            <>
              <div className="border-t border-white/[0.06] my-2" />
              <NavLink
                to={ADMIN_NAV.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-accent-amber/15 text-accent-amber'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`
                }
              >
                <ADMIN_NAV.icon size={17} className="flex-shrink-0" />
                <span>{ADMIN_NAV.label}</span>
                <span className="ml-auto text-[9px] font-mono text-accent-amber/50 uppercase tracking-wider">owner</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Plan badge */}
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-gradient-to-br from-brand-500/15 to-accent-cyan/5 border border-brand-500/15 p-3">
            <div className="text-xs font-semibold text-brand-300">{PLAN_LABELS[user?.plan] || 'Free'}</div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {user?.plan === 'free' ? 'Upgrade for alerts' : 'Alerts + Insights active'}
            </div>
          </div>
        </div>

        {/* User & logout */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center text-xs font-bold text-white/60">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80 truncate">{user?.full_name || 'User'}</div>
              <div className="text-[10px] text-white/30 truncate font-mono">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="text-white/20 hover:text-accent-red transition-colors"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 lg:ml-[220px]">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="text-white/50 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-brand-400" />
            <span className="text-sm font-bold text-white">CostLens</span>
          </div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="px-6 lg:px-10 py-8 max-w-[1200px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
