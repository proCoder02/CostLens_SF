// import { useState, useCallback } from 'react';
// import { useApi, useMutation } from '../hooks/useApi';
// import { connectionsAPI, settingsAPI } from '../api';
// import { useToast } from '../components/Toast';
// import { PageLoader, ErrorState } from '../components/Spinner';
// import { PROVIDER_COLORS, PROVIDER_ICONS, formatCurrency } from '../utils/format';
// import {
//   Plus, Trash2, Power, PowerOff, Save, Shield, DollarSign,
// } from 'lucide-react';

// const PROVIDER_OPTIONS = [
//   { value: 'openai', label: 'OpenAI' },
//   { value: 'aws', label: 'AWS' },
//   { value: 'stripe', label: 'Stripe' },
//   { value: 'twilio', label: 'Twilio' },
//   { value: 'custom', label: 'Custom' },
// ];

// const PLAN_TIERS = [
//   {
//     name: 'Free', price: '$0', features: ['Basic tracking', '1 API connection', '7-day history'],
//     current: false,
//   },
//   {
//     name: 'Startup', price: '$29', features: ['Unlimited APIs', 'Alerts & insights', '90-day history', 'Team (3 seats)'],
//     current: true,
//   },
//   {
//     name: 'Business', price: '$99', features: ['Everything in Startup', 'Advanced breakdown', 'Custom tags', 'Unlimited seats', 'API access'],
//     current: false,
//   },
// ];

// export default function SettingsPage() {
//   const toast = useToast();

//   // ── Data fetching ───────────────────────────────────────────
//   const { data: connections, loading: loadingConns, refetch: refetchConns } = useApi(connectionsAPI.list);
//   const { data: budgets, loading: loadingBudgets, refetch: refetchBudgets } = useApi(settingsAPI.listBudgets);
//   const { data: alertSettings, loading: loadingAlerts, refetch: refetchAlerts, setData: setAlertSettings } = useApi(settingsAPI.getAlertSettings);

//   // ── Mutations ───────────────────────────────────────────────
//   const { mutate: createConn } = useMutation(connectionsAPI.create);
//   const { mutate: toggleConn } = useMutation(connectionsAPI.toggle);
//   const { mutate: removeConn } = useMutation(connectionsAPI.remove);
//   const { mutate: createBudget } = useMutation(settingsAPI.createBudget);
//   const { mutate: deleteBudget } = useMutation(settingsAPI.deleteBudget);
//   const { mutate: saveAlerts, loading: savingAlerts } = useMutation(settingsAPI.updateAlertSettings);

//   // ── Connection form ─────────────────────────────────────────
//   const [showAddConn, setShowAddConn] = useState(false);
//   const [newProvider, setNewProvider] = useState('openai');
//   const [newApiKey, setNewApiKey] = useState('');

//   const handleAddConnection = async () => {
//     try {
//       await createConn({ provider: newProvider, api_key: newApiKey, display_name: '' });
//       toast.success('Connection added');
//       setShowAddConn(false);
//       setNewApiKey('');
//       refetchConns();
//     } catch (err) {
//       toast.error(err.response?.data?.detail || 'Failed to add connection');
//     }
//   };

//   const handleToggle = async (id, currentActive) => {
//     await toggleConn(id, !currentActive);
//     refetchConns();
//   };

//   const handleRemove = async (id) => {
//     await removeConn(id);
//     toast.success('Connection removed');
//     refetchConns();
//   };

//   // ── Budget form ─────────────────────────────────────────────
//   const [showAddBudget, setShowAddBudget] = useState(false);
//   const [budgetProvider, setBudgetProvider] = useState('*');
//   const [budgetLimit, setBudgetLimit] = useState('');

//   const handleAddBudget = async () => {
//     try {
//       await createBudget({ provider: budgetProvider, monthly_limit: Number(budgetLimit) });
//       toast.success('Budget created');
//       setShowAddBudget(false);
//       setBudgetLimit('');
//       refetchBudgets();
//     } catch (err) {
//       toast.error(err.response?.data?.detail || 'Failed to create budget');
//     }
//   };

//   // ── Alert settings ──────────────────────────────────────────
//   const handleSaveAlerts = async () => {
//     try {
//       const result = await saveAlerts(alertSettings);
//       setAlertSettings(result);
//       toast.success('Alert settings saved');
//     } catch {
//       toast.error('Failed to save settings');
//     }
//   };

//   const updateAlert = (key, value) => {
//     setAlertSettings((prev) => ({ ...prev, [key]: value }));
//   };

//   const loading = loadingConns || loadingBudgets || loadingAlerts;
//   if (loading) return <PageLoader />;

//   return (
//     <div className="animate-fade-in">
//       <div className="mb-7">
//         <h1 className="page-title">Settings</h1>
//         <p className="page-subtitle">Manage API connections, budgets, and alert preferences</p>
//       </div>

//       {/* ═══════════════════════════════════════════════════════════ */}
//       {/* API CONNECTIONS */}
//       {/* ═══════════════════════════════════════════════════════════ */}
//       <section className="mb-10">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="section-label">API Connections</h2>
//           <button onClick={() => setShowAddConn(!showAddConn)} className="btn-secondary text-xs flex items-center gap-1.5">
//             <Plus size={13} />
//             Add
//           </button>
//         </div>

//         {/* Add form */}
//         {showAddConn && (
//           <div className="card mb-4 flex flex-col sm:flex-row gap-3 items-end">
//             <div className="flex-1">
//               <label className="label">Provider</label>
//               <select value={newProvider} onChange={(e) => setNewProvider(e.target.value)} className="input py-2 text-sm">
//                 {PROVIDER_OPTIONS.map((p) => (
//                   <option key={p.value} value={p.value}>{p.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div className="flex-[2]">
//               <label className="label">API Key (read-only)</label>
//               <input
//                 type="password"
//                 value={newApiKey}
//                 onChange={(e) => setNewApiKey(e.target.value)}
//                 className="input py-2 text-sm"
//                 placeholder="sk-..."
//               />
//             </div>
//             <button onClick={handleAddConnection} disabled={!newApiKey} className="btn-primary text-sm px-4 py-2">
//               Connect
//             </button>
//           </div>
//         )}

//         {/* Connections grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           {(connections || []).map((conn) => (
//             <div key={conn.id} className="card-hover flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div
//                   className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
//                   style={{ backgroundColor: `${PROVIDER_COLORS[conn.provider]}18`, color: PROVIDER_COLORS[conn.provider] }}
//                 >
//                   {PROVIDER_ICONS[conn.provider] || '◎'}
//                 </div>
//                 <div>
//                   <div className="text-sm font-semibold text-white">{conn.display_name || conn.provider}</div>
//                   <div className={`text-[10px] font-mono ${conn.is_active ? 'text-accent-green' : 'text-white/25'}`}>
//                     {conn.is_active ? '● Connected' : '○ Disconnected'}
//                   </div>
//                 </div>
//               </div>
//               <div className="flex gap-1.5">
//                 <button
//                   onClick={() => handleToggle(conn.id, conn.is_active)}
//                   className={`p-2 rounded-lg transition-colors ${conn.is_active ? 'text-accent-amber hover:bg-accent-amber/10' : 'text-accent-green hover:bg-accent-green/10'}`}
//                   title={conn.is_active ? 'Disable' : 'Enable'}
//                 >
//                   {conn.is_active ? <PowerOff size={14} /> : <Power size={14} />}
//                 </button>
//                 <button
//                   onClick={() => handleRemove(conn.id)}
//                   className="p-2 rounded-lg text-accent-red/60 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
//                   title="Remove"
//                 >
//                   <Trash2 size={14} />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* ═══════════════════════════════════════════════════════════ */}
//       {/* BUDGETS */}
//       {/* ═══════════════════════════════════════════════════════════ */}
//       <section className="mb-10">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="section-label">Monthly Budgets</h2>
//           <button onClick={() => setShowAddBudget(!showAddBudget)} className="btn-secondary text-xs flex items-center gap-1.5">
//             <Plus size={13} />
//             Add
//           </button>
//         </div>

//         {showAddBudget && (
//           <div className="card mb-4 flex flex-col sm:flex-row gap-3 items-end">
//             <div className="flex-1">
//               <label className="label">Provider</label>
//               <select value={budgetProvider} onChange={(e) => setBudgetProvider(e.target.value)} className="input py-2 text-sm">
//                 <option value="*">All providers (total)</option>
//                 {PROVIDER_OPTIONS.map((p) => (
//                   <option key={p.value} value={p.value}>{p.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div className="flex-1">
//               <label className="label">Monthly limit ($)</label>
//               <input
//                 type="number"
//                 value={budgetLimit}
//                 onChange={(e) => setBudgetLimit(e.target.value)}
//                 className="input py-2 text-sm"
//                 placeholder="500"
//                 min="1"
//               />
//             </div>
//             <button onClick={handleAddBudget} disabled={!budgetLimit} className="btn-primary text-sm px-4 py-2">
//               Create
//             </button>
//           </div>
//         )}

//         <div className="card">
//           {(budgets || []).length === 0 ? (
//             <p className="text-sm text-white/25 text-center py-4">No budgets configured</p>
//           ) : (
//             <div className="space-y-0">
//               {(budgets || []).map((b, i) => (
//                 <div
//                   key={b.id}
//                   className={`flex items-center justify-between py-3 ${i < budgets.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
//                 >
//                   <div className="flex items-center gap-3">
//                     <DollarSign size={15} className="text-white/20" />
//                     <div>
//                       <div className="text-sm text-white font-medium">
//                         {b.provider === '*' ? 'Total (all providers)' : b.provider.charAt(0).toUpperCase() + b.provider.slice(1)}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     <span className="text-sm font-mono text-white/70">{formatCurrency(b.monthly_limit, 0)}/mo</span>
//                     <button
//                       onClick={async () => { await deleteBudget(b.id); refetchBudgets(); toast.success('Budget removed'); }}
//                       className="text-white/15 hover:text-accent-red transition-colors"
//                     >
//                       <Trash2 size={13} />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </section>

//       {/* ═══════════════════════════════════════════════════════════ */}
//       {/* ALERT PREFERENCES */}
//       {/* ═══════════════════════════════════════════════════════════ */}
//       <section className="mb-10">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="section-label">Alert Thresholds</h2>
//           <button onClick={handleSaveAlerts} disabled={savingAlerts} className="btn-primary text-xs flex items-center gap-1.5">
//             <Save size={13} />
//             {savingAlerts ? 'Saving...' : 'Save'}
//           </button>
//         </div>

//         {alertSettings && (
//           <div className="card space-y-0">
//             {[
//               {
//                 label: 'Daily spend spike',
//                 desc: 'Alert when daily cost exceeds threshold above 7-day average',
//                 key: 'spike_threshold_pct',
//                 type: 'number',
//                 suffix: '%',
//               },
//               {
//                 label: 'Budget warning',
//                 desc: 'Alert when approaching monthly budget limit',
//                 key: 'budget_warning_pct',
//                 type: 'number',
//                 suffix: '%',
//               },
//               {
//                 label: 'Anomaly detection',
//                 desc: 'Alert on unusual traffic patterns',
//                 key: 'anomaly_detection',
//                 type: 'toggle',
//               },
//               {
//                 label: 'Weekly digest',
//                 desc: 'Summary of spend and top insights',
//                 key: 'weekly_digest',
//                 type: 'toggle',
//               },
//               {
//                 label: 'Email notifications',
//                 desc: 'Send alerts to your email',
//                 key: 'notification_email',
//                 type: 'toggle',
//               },
//             ].map((item, i) => (
//               <div
//                 key={item.key}
//                 className={`flex items-center justify-between py-4 ${i < 4 ? 'border-b border-white/[0.04]' : ''}`}
//               >
//                 <div>
//                   <div className="text-sm text-white font-medium">{item.label}</div>
//                   <div className="text-[11px] text-white/25 mt-0.5">{item.desc}</div>
//                 </div>
//                 {item.type === 'toggle' ? (
//                   <button
//                     onClick={() => updateAlert(item.key, !alertSettings[item.key])}
//                     className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5
//                       ${alertSettings[item.key] ? 'bg-brand-500' : 'bg-white/[0.08]'}`}
//                   >
//                     <div
//                       className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
//                         ${alertSettings[item.key] ? 'translate-x-4' : 'translate-x-0'}`}
//                     />
//                   </button>
//                 ) : (
//                   <div className="flex items-center gap-1">
//                     <input
//                       type="number"
//                       value={alertSettings[item.key] || ''}
//                       onChange={(e) => updateAlert(item.key, Number(e.target.value))}
//                       className="input w-20 py-1.5 px-2.5 text-sm text-right font-mono"
//                     />
//                     {item.suffix && <span className="text-xs text-white/25 font-mono">{item.suffix}</span>}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* ═══════════════════════════════════════════════════════════ */}
//       {/* PRICING PLANS */}
//       {/* ═══════════════════════════════════════════════════════════ */}
//       <section>
//         <h2 className="section-label mb-4">Pricing Plans</h2>
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//           {PLAN_TIERS.map((plan) => (
//             <div
//               key={plan.name}
//               className={`card text-center relative ${plan.current ? 'border-brand-500/30 bg-brand-500/[0.04]' : ''}`}
//             >
//               {plan.current && (
//                 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[9px] font-bold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full">
//                   Current
//                 </div>
//               )}
//               <div className="text-base font-bold text-white mb-1">{plan.name}</div>
//               <div className="text-3xl font-bold font-mono text-white mb-1">
//                 {plan.price}<span className="text-xs font-normal text-white/30">/mo</span>
//               </div>
//               <div className="border-t border-white/[0.06] my-4" />
//               {plan.features.map((f) => (
//                 <div key={f} className="text-xs text-white/45 py-1">✓ {f}</div>
//               ))}
//               {!plan.current && (
//                 <button className="btn-secondary text-xs w-full mt-4">
//                   {plan.price === '$0' ? 'Downgrade' : 'Upgrade'}
//                 </button>
//               )}
//             </div>
//           ))}
//         </div>
//       </section>
//     </div>
//   );
// }


import {
  DollarSign,
  Plus,
  Power, PowerOff, Save,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { connectionsAPI, settingsAPI } from '../api';
import { PageLoader } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useApi, useMutation } from '../hooks/useApi';
import { PROVIDER_COLORS, PROVIDER_ICONS, formatCurrency } from '../utils/format';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'aws', label: 'AWS' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'custom', label: 'Custom API' },
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
  const [newDisplayName, setNewDisplayName] = useState('');

  // Custom API fields
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newAuthHeader, setNewAuthHeader] = useState('X-API-Key');
  const [newEndpoints, setNewEndpoints] = useState('');
  const [newCostPerRecord, setNewCostPerRecord] = useState('0.01');

  const isCustom = newProvider === 'custom';

  const handleAddConnection = async () => {
    try {
      const payload = {
        provider: newProvider,
        api_key: newApiKey,
        display_name: newDisplayName,
      };

      // Append custom fields if provider is custom
      if (isCustom) {
        payload.base_url = newBaseUrl;
        payload.auth_header = newAuthHeader;
        payload.endpoints = newEndpoints
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
        payload.cost_per_record = parseFloat(newCostPerRecord) || 0.01;
      }

      await createConn(payload);
      toast.success('Connection added');
      setShowAddConn(false);
      resetConnForm();
      refetchConns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add connection');
    }
  };

  const resetConnForm = () => {
    setNewApiKey('');
    setNewDisplayName('');
    setNewBaseUrl('');
    setNewAuthHeader('X-API-Key');
    setNewEndpoints('');
    setNewCostPerRecord('0.01');
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

  const canConnect = isCustom
    ? newApiKey && newBaseUrl && newEndpoints
    : newApiKey;

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
          <div className="card mb-4">
            {/* Row 1: Provider + API Key */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex-1">
                <label className="label">Provider</label>
                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value)} className="input py-2 text-sm">
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="label">Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="input py-2 text-sm"
                  placeholder="e.g. RAPEX API"
                />
              </div>
              <div className="flex-[2]">
                <label className="label">API Key</label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="input py-2 text-sm"
                  placeholder="sk-..."
                />
              </div>
            </div>

            {/* Custom API fields — only visible when provider is 'custom' */}
            {isCustom && (
              <div className="border border-white/5 rounded-lg p-4 mb-3 bg-white/[0.02]">
                <p className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wider">Custom API Configuration</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label">Base URL</label>
                    <input
                      type="text"
                      value={newBaseUrl}
                      onChange={(e) => setNewBaseUrl(e.target.value)}
                      className="input py-2 text-sm"
                      placeholder="https://rapexapi.nodexdata.click"
                    />
                  </div>
                  <div>
                    <label className="label">Auth Header Name</label>
                    <input
                      type="text"
                      value={newAuthHeader}
                      onChange={(e) => setNewAuthHeader(e.target.value)}
                      className="input py-2 text-sm"
                      placeholder="X-API-Key"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label">Endpoints (comma-separated)</label>
                    <input
                      type="text"
                      value={newEndpoints}
                      onChange={(e) => setNewEndpoints(e.target.value)}
                      className="input py-2 text-sm"
                      placeholder="/rapex_alerts, /alerts, /vin/decode"
                    />
                    <p className="text-[10px] text-white/25 mt-1">CostLens will poll these endpoints every 15 min</p>
                  </div>
                  <div>
                    <label className="label">Cost per Record ($)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={newCostPerRecord}
                      onChange={(e) => setNewCostPerRecord(e.target.value)}
                      className="input py-2 text-sm"
                      placeholder="0.01"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleAddConnection} disabled={!canConnect} className="btn-primary text-sm px-4 py-2">
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Connections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(connections || []).map((conn) => (
            <div key={conn.id} className="card-hover flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${PROVIDER_COLORS[conn.provider] || '#888'}18`, color: PROVIDER_COLORS[conn.provider] || '#888' }}
                >
                  {PROVIDER_ICONS[conn.provider] || '◎'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{conn.display_name || conn.provider}</div>
                  <div className={`text-[10px] font-mono ${conn.is_active ? 'text-accent-green' : 'text-white/25'}`}>
                    {conn.is_active ? '● Connected' : '○ Disconnected'}
                  </div>
                  {conn.provider === 'custom' && conn.base_url && (
                    <div className="text-[10px] text-white/20 truncate max-w-[200px]">{conn.base_url}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleToggle(conn.id, conn.is_active)}
                  className={`p-2 rounded-lg transition-colors ${conn.is_active ? 'text-accent-amber hover:bg-accent-amber/10' : 'text-accent-green hover:bg-accent-green/10'}`}
                  title={conn.is_active ? 'Disable' : 'Enable'}
                >
                  {conn.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                </button>
                <button
                  onClick={() => handleRemove(conn.id)}
                  className="p-2 rounded-lg text-accent-red/60 hover:bg-accent-red/10 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {(!connections || connections.length === 0) && (
          <div className="card text-center text-white/30 text-sm py-8">
            No API connections yet. Click "Add" to connect your first provider.
          </div>
        )}
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
                <option value="*">All Providers</option>
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Monthly Limit ($)</label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="input py-2 text-sm"
                placeholder="500"
              />
            </div>
            <button onClick={handleAddBudget} disabled={!budgetLimit} className="btn-primary text-sm px-4 py-2">
              <DollarSign size={13} className="inline mr-1" />
              Set Budget
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(budgets || []).map((b) => (
            <div key={b.id} className="card-hover flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {b.provider === '*' ? 'All Providers' : b.provider}
                </div>
                <div className="text-xs text-white/40">
                  Limit: {formatCurrency(b.monthly_limit)}/mo
                </div>
              </div>
              <button
                onClick={async () => { await deleteBudget(b.id); refetchBudgets(); }}
                className="p-2 rounded-lg text-accent-red/60 hover:bg-accent-red/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ALERT PREFERENCES */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {alertSettings && (
        <section className="mb-10">
          <h2 className="section-label mb-4">Alert Preferences</h2>
          <div className="card space-y-5">
            <div>
              <label className="label">Spike Threshold (%)</label>
              <p className="text-[11px] text-white/30 mb-1">Alert when daily spend exceeds this % above the 7-day average</p>
              <input
                type="range" min="10" max="200" step="5"
                value={alertSettings.spike_threshold_pct || 40}
                onChange={(e) => updateAlert('spike_threshold_pct', Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-white/50">{alertSettings.spike_threshold_pct || 40}%</span>
            </div>

            <div>
              <label className="label">Budget Warning (%)</label>
              <p className="text-[11px] text-white/30 mb-1">Alert when monthly spend reaches this % of your budget</p>
              <input
                type="range" min="50" max="100" step="5"
                value={alertSettings.budget_warning_pct || 80}
                onChange={(e) => updateAlert('budget_warning_pct', Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-white/50">{alertSettings.budget_warning_pct || 80}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white">Anomaly Detection</div>
                <div className="text-[11px] text-white/30">Auto-detect unusual spending patterns</div>
              </div>
              <button
                onClick={() => updateAlert('anomaly_detection', !alertSettings.anomaly_detection)}
                className={`w-10 h-5 rounded-full transition-colors ${alertSettings.anomaly_detection ? 'bg-accent-green' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ml-0.5 ${alertSettings.anomaly_detection ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white">Weekly Digest</div>
                <div className="text-[11px] text-white/30">Receive a weekly cost summary email</div>
              </div>
              <button
                onClick={() => updateAlert('weekly_digest', !alertSettings.weekly_digest)}
                className={`w-10 h-5 rounded-full transition-colors ${alertSettings.weekly_digest ? 'bg-accent-green' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ml-0.5 ${alertSettings.weekly_digest ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <button onClick={handleSaveAlerts} disabled={savingAlerts} className="btn-primary text-sm px-5 py-2">
              <Save size={13} className="inline mr-1.5" />
              {savingAlerts ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PLAN */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="section-label mb-4">Current Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLAN_TIERS.map((tier) => (
            <div key={tier.name} className={`card ${tier.current ? 'ring-1 ring-accent-green/40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                {tier.current && <span className="badge-green text-[10px]">Current</span>}
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-3">{tier.price}<span className="text-xs text-white/30">/mo</span></div>
              <ul className="space-y-1">
                {tier.features.map((f) => (
                  <li key={f} className="text-xs text-white/40">✓ {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}