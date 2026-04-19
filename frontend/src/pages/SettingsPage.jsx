import { useState, useCallback } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { connectionsAPI, settingsAPI } from '../api';
import { useToast } from '../components/Toast';
import { PageLoader, ErrorState } from '../components/Spinner';
import { PROVIDER_COLORS, PROVIDER_ICONS, formatCurrency } from '../utils/format';
import {
  Plus, Trash2, Power, PowerOff, Save, Shield, DollarSign,
} from 'lucide-react';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'aws', label: 'AWS' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'custom', label: 'Custom' },
];

const PLAN_TIERS = [
  {
    name: 'Free', price: '$0', features: ['Basic tracking', '1 API connection', '7-day history'],
    current: false,
  },
  {
    name: 'Startup', price: '$29', features: ['Unlimited APIs', 'Alerts & insights', '90-day history', 'Team (3 seats)'],
    current: true,
  },
  {
    name: 'Business', price: '$99', features: ['Everything in Startup', 'Advanced breakdown', 'Custom tags', 'Unlimited seats', 'API access'],
    current: false,
  },
];

export default function SettingsPage() {
  const toast = useToast();

  // ── Data fetching ───────────────────────────────────────────
  const { data: connections, loading: loadingConns, refetch: refetchConns } = useApi(connectionsAPI.list);
  const { data: budgets, loading: loadingBudgets, refetch: refetchBudgets } = useApi(settingsAPI.listBudgets);
  const { data: alertSettings, loading: loadingAlerts, refetch: refetchAlerts, setData: setAlertSettings } = useApi(settingsAPI.getAlertSettings);

  // ── Mutations ───────────────────────────────────────────────
  const { mutate: createConn } = useMutation(connectionsAPI.create);
  const { mutate: toggleConn } = useMutation(connectionsAPI.toggle);
  const { mutate: removeConn } = useMutation(connectionsAPI.remove);
  const { mutate: createBudget } = useMutation(settingsAPI.createBudget);
  const { mutate: deleteBudget } = useMutation(settingsAPI.deleteBudget);
  const { mutate: saveAlerts, loading: savingAlerts } = useMutation(settingsAPI.updateAlertSettings);

  // ── Connection form ─────────────────────────────────────────
  const [showAddConn, setShowAddConn] = useState(false);
  const [newProvider, setNewProvider] = useState('openai');
  const [newApiKey, setNewApiKey] = useState('');

  const handleAddConnection = async () => {
    try {
      await createConn({ provider: newProvider, api_key: newApiKey, display_name: '' });
      toast.success('Connection added');
      setShowAddConn(false);
      setNewApiKey('');
      refetchConns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add connection');
    }
  };

  const handleToggle = async (id, currentActive) => {
    await toggleConn(id, !currentActive);
    refetchConns();
  };

  const handleRemove = async (id) => {
    await removeConn(id);
    toast.success('Connection removed');
    refetchConns();
  };

  // ── Budget form ─────────────────────────────────────────────
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgetProvider, setBudgetProvider] = useState('*');
  const [budgetLimit, setBudgetLimit] = useState('');

  const handleAddBudget = async () => {
    try {
      await createBudget({ provider: budgetProvider, monthly_limit: Number(budgetLimit) });
      toast.success('Budget created');
      setShowAddBudget(false);
      setBudgetLimit('');
      refetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create budget');
    }
  };

  // ── Alert settings ──────────────────────────────────────────
  const handleSaveAlerts = async () => {
    try {
      const result = await saveAlerts(alertSettings);
      setAlertSettings(result);
      toast.success('Alert settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const updateAlert = (key, value) => {
    setAlertSettings((prev) => ({ ...prev, [key]: value }));
  };

  const loading = loadingConns || loadingBudgets || loadingAlerts;
  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage API connections, budgets, and alert preferences</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* API CONNECTIONS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label">API Connections</h2>
          <button onClick={() => setShowAddConn(!showAddConn)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Plus size={13} />
            Add
          </button>
        </div>

        {/* Add form */}
        {showAddConn && (
          <div className="card mb-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="label">Provider</label>
              <select value={newProvider} onChange={(e) => setNewProvider(e.target.value)} className="input py-2 text-sm">
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2]">
              <label className="label">API Key (read-only)</label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="input py-2 text-sm"
                placeholder="sk-..."
              />
            </div>
            <button onClick={handleAddConnection} disabled={!newApiKey} className="btn-primary text-sm px-4 py-2">
              Connect
            </button>
          </div>
        )}

        {/* Connections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(connections || []).map((conn) => (
            <div key={conn.id} className="card-hover flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${PROVIDER_COLORS[conn.provider]}18`, color: PROVIDER_COLORS[conn.provider] }}
                >
                  {PROVIDER_ICONS[conn.provider] || '◎'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{conn.display_name || conn.provider}</div>
                  <div className={`text-[10px] font-mono ${conn.is_active ? 'text-accent-green' : 'text-white/25'}`}>
                    {conn.is_active ? '● Connected' : '○ Disconnected'}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleToggle(conn.id, conn.is_active)}
                  className={`p-2 rounded-lg transition-colors ${conn.is_active ? 'text-accent-amber hover:bg-accent-amber/10' : 'text-accent-green hover:bg-accent-green/10'}`}
                  title={conn.is_active ? 'Disable' : 'Enable'}
                >
                  {conn.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
                <button
                  onClick={() => handleRemove(conn.id)}
                  className="p-2 rounded-lg text-accent-red/60 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BUDGETS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label">Monthly Budgets</h2>
          <button onClick={() => setShowAddBudget(!showAddBudget)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Plus size={13} />
            Add
          </button>
        </div>

        {showAddBudget && (
          <div className="card mb-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="label">Provider</label>
              <select value={budgetProvider} onChange={(e) => setBudgetProvider(e.target.value)} className="input py-2 text-sm">
                <option value="*">All providers (total)</option>
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Monthly limit ($)</label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="input py-2 text-sm"
                placeholder="500"
                min="1"
              />
            </div>
            <button onClick={handleAddBudget} disabled={!budgetLimit} className="btn-primary text-sm px-4 py-2">
              Create
            </button>
          </div>
        )}

        <div className="card">
          {(budgets || []).length === 0 ? (
            <p className="text-sm text-white/25 text-center py-4">No budgets configured</p>
          ) : (
            <div className="space-y-0">
              {(budgets || []).map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between py-3 ${i < budgets.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign size={15} className="text-white/20" />
                    <div>
                      <div className="text-sm text-white font-medium">
                        {b.provider === '*' ? 'Total (all providers)' : b.provider.charAt(0).toUpperCase() + b.provider.slice(1)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-white/70">{formatCurrency(b.monthly_limit, 0)}/mo</span>
                    <button
                      onClick={async () => { await deleteBudget(b.id); refetchBudgets(); toast.success('Budget removed'); }}
                      className="text-white/15 hover:text-accent-red transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ALERT PREFERENCES */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label">Alert Thresholds</h2>
          <button onClick={handleSaveAlerts} disabled={savingAlerts} className="btn-primary text-xs flex items-center gap-1.5">
            <Save size={13} />
            {savingAlerts ? 'Saving...' : 'Save'}
          </button>
        </div>

        {alertSettings && (
          <div className="card space-y-0">
            {[
              {
                label: 'Daily spend spike',
                desc: 'Alert when daily cost exceeds threshold above 7-day average',
                key: 'spike_threshold_pct',
                type: 'number',
                suffix: '%',
              },
              {
                label: 'Budget warning',
                desc: 'Alert when approaching monthly budget limit',
                key: 'budget_warning_pct',
                type: 'number',
                suffix: '%',
              },
              {
                label: 'Anomaly detection',
                desc: 'Alert on unusual traffic patterns',
                key: 'anomaly_detection',
                type: 'toggle',
              },
              {
                label: 'Weekly digest',
                desc: 'Summary of spend and top insights',
                key: 'weekly_digest',
                type: 'toggle',
              },
              {
                label: 'Email notifications',
                desc: 'Send alerts to your email',
                key: 'notification_email',
                type: 'toggle',
              },
            ].map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center justify-between py-4 ${i < 4 ? 'border-b border-white/[0.04]' : ''}`}
              >
                <div>
                  <div className="text-sm text-white font-medium">{item.label}</div>
                  <div className="text-[11px] text-white/25 mt-0.5">{item.desc}</div>
                </div>
                {item.type === 'toggle' ? (
                  <button
                    onClick={() => updateAlert(item.key, !alertSettings[item.key])}
                    className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5
                      ${alertSettings[item.key] ? 'bg-brand-500' : 'bg-white/[0.08]'}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
                        ${alertSettings[item.key] ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={alertSettings[item.key] || ''}
                      onChange={(e) => updateAlert(item.key, Number(e.target.value))}
                      className="input w-20 py-1.5 px-2.5 text-sm text-right font-mono"
                    />
                    {item.suffix && <span className="text-xs text-white/25 font-mono">{item.suffix}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRICING PLANS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="section-label mb-4">Pricing Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLAN_TIERS.map((plan) => (
            <div
              key={plan.name}
              className={`card text-center relative ${plan.current ? 'border-brand-500/30 bg-brand-500/[0.04]' : ''}`}
            >
              {plan.current && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[9px] font-bold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Current
                </div>
              )}
              <div className="text-base font-bold text-white mb-1">{plan.name}</div>
              <div className="text-3xl font-bold font-mono text-white mb-1">
                {plan.price}<span className="text-xs font-normal text-white/30">/mo</span>
              </div>
              <div className="border-t border-white/[0.06] my-4" />
              {plan.features.map((f) => (
                <div key={f} className="text-xs text-white/45 py-1">✓ {f}</div>
              ))}
              {!plan.current && (
                <button className="btn-secondary text-xs w-full mt-4">
                  {plan.price === '$0' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
