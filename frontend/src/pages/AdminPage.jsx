import { useState, useCallback, useEffect, useRef } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { adminAPI } from '../api';
import { useToast } from '../components/Toast';
import { PageLoader, ErrorState } from '../components/Spinner';
import { formatCurrency, timeAgo } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Users, DollarSign, TrendingUp, CreditCard, Search, Shield, Crown,
  UserCheck, Ban, ArrowUpRight, ArrowDownRight, RotateCcw, Save,
  ClipboardList, Settings, Eye, StickyNote, X,
} from 'lucide-react';

const PLAN_COLORS = {
  free: { bg: 'bg-white/[0.06]', text: 'text-white/40', border: 'border-white/10' },
  startup: { bg: 'bg-brand-500/10', text: 'text-brand-300', border: 'border-brand-500/20' },
  business: { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/20' },
};

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: stats, loading, error, refetch } = useApi(adminAPI.getStats);
  const { data: chart } = useApi(adminAPI.getRevenueChart, [30]);
  const { data: usersData, refetch: refetchUsers } = useApi(adminAPI.getUsers, [0, 50, userSearch, userPlanFilter]);
  const { data: paymentsData, refetch: refetchPayments } = useApi(adminAPI.getPayments, [0, 100, payStatusFilter]);
  const { data: config, refetch: refetchConfig, setData: setConfig } = useApi(adminAPI.getConfig);
  const { data: auditData, refetch: refetchAudit } = useApi(adminAPI.getAuditLog, [50]);

  // Debounce user search — avoid API call on every keystroke
  const [userSearchInput, setUserSearchInput] = useState('');
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setUserSearch(userSearchInput), 400);
    return () => clearTimeout(debounceRef.current);
  }, [userSearchInput]);

  // Inline refund confirmation state — replaces window.confirm()
  const [confirmRefund, setConfirmRefund] = useState(null); // payment id

  const { mutate: changePlan } = useMutation(adminAPI.changeUserPlan);
  const { mutate: toggleActive } = useMutation(adminAPI.toggleUserActive);
  const { mutate: refundPay } = useMutation(adminAPI.refundPayment);
  const { mutate: saveConfig, loading: savingConfig } = useMutation(adminAPI.updateConfig);

  if (loading) return <PageLoader />;
  if (error) {
    const is403 = error?.includes?.('403') || error?.toLowerCase?.().includes?.('admin');
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
          <Shield size={24} className="text-accent-amber" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-1">{is403 ? 'Admin Access Required' : 'Failed to load'}</h2>
          <p className="text-sm text-white/40 max-w-xs">
            {is403
              ? 'Your account does not have admin privileges. Contact support to request access.'
              : error}
          </p>
        </div>
        {!is403 && <button onClick={refetch} className="btn-secondary text-xs">Retry</button>}
      </div>
    );
  }
  if (!stats) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: `Users (${stats.total_users})`, icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={20} className="text-accent-amber" />
        <h1 className="page-title">Admin Portal</h1>
      </div>
      <p className="page-subtitle mb-6">Manage your SaaS — users, billing, onboarding, and settings</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${tab === t.id ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Metric label="Total Users" value={stats.total_users} sub={`${stats.new_users_this_month} new this month`} change={stats.user_growth_pct} icon={<Users size={16}/>} color="text-brand-300"/>
          <Metric label="MRR" value={formatCurrency(stats.mrr)} sub={`ARR: ${formatCurrency(stats.arr)}`} change={stats.mrr_growth_pct} icon={<DollarSign size={16}/>} color="text-accent-green"/>
          <Metric label="Active Subs" value={stats.active_subscriptions} sub={`${stats.churned_this_month} churned · ${stats.churn_rate_pct}% rate`} icon={<CreditCard size={16}/>} color="text-accent-cyan"/>
          <Metric label="Total Revenue" value={formatCurrency(stats.total_revenue)} sub={`${stats.payments_this_month} payments · ${stats.failed_payments_this_month} failed`} icon={<TrendingUp size={16}/>} color="text-accent-amber"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2">
            <h2 className="text-sm font-semibold text-white mb-1">Revenue</h2>
            <p className="text-[11px] font-mono text-white/25 mb-4">Last 30 days</p>
            {chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="date" tick={{fill:'rgba(255,255,255,0.2)',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${new Date(v).getMonth()+1}/${new Date(v).getDate()}`} interval={Math.ceil((chart?.length||30)/8)}/>
                  <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} tickFormatter={(v)=>`$${v}`} width={45}/>
                  <Tooltip contentStyle={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:12}} formatter={(v)=>[formatCurrency(v),'Revenue']}/>
                  <Bar dataKey="revenue" fill="#10b981" radius={[3,3,0,0]} opacity={0.8}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-white/20 text-sm">No revenue data</div>}
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Plan Distribution</h2>
            {(stats.plan_distribution||[]).map((p)=>{
              const pct = stats.total_users>0?((p.count/stats.total_users)*100).toFixed(0):0;
              const c = PLAN_COLORS[p.plan]||PLAN_COLORS.free;
              return <div key={p.plan} className="mb-3">
                <div className="flex justify-between mb-1"><span className={`badge ${c.bg} ${c.text} ${c.border} border capitalize`}>{p.plan}</span><span className="text-sm font-mono text-white">{p.count}</span></div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:p.plan==='business'?'#f59e0b':p.plan==='startup'?'#6366f1':'rgba(255,255,255,0.15)'}}/></div>
              </div>;
            })}
          </div>
        </div>
      </>}

      {/* ═══ USERS ═══ */}
      {tab === 'users' && <>
        {/* User detail modal */}
        {selectedUser && <UserDetailModal userId={selectedUser} onClose={()=>setSelectedUser(null)} toast={toast} onRefetch={refetchUsers}/>}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"/><input type="text" value={userSearchInput} onChange={(e)=>setUserSearchInput(e.target.value)} placeholder="Search email, name, company..." className="input pl-9 py-2 text-sm"/></div>
          <select value={userPlanFilter} onChange={(e)=>setUserPlanFilter(e.target.value)} className="input py-2 text-sm w-32"><option value="">All plans</option><option value="free">Free</option><option value="startup">Startup</option><option value="business">Business</option></select>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead><tr className="border-b border-white/[0.06]">
              {['User','Company','Plan','Status','Joined','Actions'].map(h=><th key={h} className="table-header text-left py-3 px-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {(usersData?.users||[]).map((u)=>{
                const pc=PLAN_COLORS[u.plan]||PLAN_COLORS.free;
                return <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2"><div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center text-xs font-bold text-white/50">{u.full_name?.[0]||u.email[0].toUpperCase()}</div>
                    <div><div className="text-sm text-white font-medium flex items-center gap-1.5">{u.full_name||'—'}{u.is_admin&&<Crown size={12} className="text-accent-amber"/>}</div><div className="text-[11px] text-white/30 font-mono">{u.email}</div></div>
                  </div></td>
                  <td className="py-3 px-2 text-xs text-white/40">{u.company_name||'—'}</td>
                  <td className="py-3 px-2">
                    <select value={u.plan} onChange={async(e)=>{try{await changePlan(u.id,e.target.value);toast.success(`Plan changed to ${e.target.value}`);refetchUsers();}catch{toast.error('Failed');}}} disabled={u.is_admin} className={`text-xs px-2 py-1 rounded-md border cursor-pointer bg-transparent ${pc.bg} ${pc.text} ${pc.border}`}>
                      <option value="free">Free</option><option value="startup">Startup</option><option value="business">Business</option>
                    </select>
                  </td>
                  <td className="py-3 px-2"><span className={`badge ${u.is_active?'badge-green':'badge-red'}`}>{u.is_active?'Active':'Disabled'}</span></td>
                  <td className="py-3 px-2 text-xs text-white/30 font-mono">{u.created_at?new Date(u.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}):'—'}</td>
                  <td className="py-3 px-2 flex gap-1">
                    <button onClick={()=>setSelectedUser(u.id)} className="p-1.5 rounded-md text-white/25 hover:text-brand-300 hover:bg-brand-500/10 transition-colors" title="View details"><Eye size={14}/></button>
                    {!u.is_admin&&<button onClick={async()=>{try{const r=await toggleActive(u.id);toast.success(r.is_active?'Activated':'Deactivated');refetchUsers();}catch{toast.error('Failed');}}} className={`p-1.5 rounded-md transition-colors ${u.is_active?'text-accent-red/40 hover:text-accent-red hover:bg-accent-red/10':'text-accent-green/40 hover:text-accent-green hover:bg-accent-green/10'}`} title={u.is_active?'Deactivate':'Activate'}>{u.is_active?<Ban size={14}/>:<UserCheck size={14}/>}</button>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          {usersData?.total>0&&<div className="border-t border-white/[0.04] pt-3 mt-1 text-xs text-white/25 font-mono text-center">{usersData.users.length} of {usersData.total} users</div>}
        </div>
      </>}

      {/* ═══ PAYMENTS ═══ */}
      {tab === 'payments' && <>
        <div className="flex gap-3 mb-4">
          <select value={payStatusFilter} onChange={(e)=>setPayStatusFilter(e.target.value)} className="input py-2 text-sm w-36"><option value="">All</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead><tr className="border-b border-white/[0.06]">
              {['Customer','Company','Amount','Plan','Card','Status','Date',''].map(h=><th key={h} className="table-header text-left py-3 px-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {(paymentsData?.payments||[]).map((p)=><tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-2"><div className="text-xs text-white/70">{p.user_name||'—'}</div><div className="text-[10px] text-white/25 font-mono">{p.user_email}</div></td>
                <td className="py-3 px-2 text-xs text-white/40">{p.company||'—'}</td>
                <td className="py-3 px-2 text-sm font-mono font-semibold text-white">{formatCurrency(p.amount)}</td>
                <td className="py-3 px-2"><span className={`badge capitalize ${(PLAN_COLORS[p.plan]||PLAN_COLORS.free).bg} ${(PLAN_COLORS[p.plan]||PLAN_COLORS.free).text} ${(PLAN_COLORS[p.plan]||PLAN_COLORS.free).border} border`}>{p.plan}</span></td>
                <td className="py-3 px-2 text-xs text-white/35">{p.card_brand} ···{p.card_last4}</td>
                <td className="py-3 px-2"><span className={`badge ${p.status==='succeeded'?'badge-green':p.status==='failed'?'badge-red':p.status==='refunded'?'badge-brand':'badge-amber'} capitalize`}>{p.status}</span></td>
                <td className="py-3 px-2 text-xs text-white/30 font-mono">{p.created_at?new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—'}</td>
                <td className="py-3 px-2">{p.status==='succeeded'&&(
                  confirmRefund===p.id
                    ? <span className="flex items-center gap-1">
                        <button onClick={async()=>{try{await refundPay(p.id);toast.success('Payment refunded');setConfirmRefund(null);refetchPayments();refetchAudit();}catch{toast.error('Refund failed');setConfirmRefund(null);}}} className="px-2 py-1 rounded text-[11px] bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30 transition-colors font-semibold">Confirm</button>
                        <button onClick={()=>setConfirmRefund(null)} className="px-2 py-1 rounded text-[11px] text-white/30 hover:text-white/60 transition-colors">Cancel</button>
                      </span>
                    : <button onClick={()=>setConfirmRefund(p.id)} className="p-1.5 rounded-md text-white/20 hover:text-accent-amber hover:bg-accent-amber/10 transition-colors" title="Refund"><RotateCcw size={13}/></button>
                )}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}

      {/* ═══ SETTINGS (SaaS Config) ═══ */}
      {tab === 'settings' && config && <>
        <div className="flex justify-end mb-4">
          <button onClick={async()=>{try{await saveConfig(config);toast.success('Settings saved');refetchConfig();refetchAudit();}catch{toast.error('Save failed');}}} disabled={savingConfig} className="btn-primary text-xs flex items-center gap-1.5"><Save size={13}/>{savingConfig?'Saving...':'Save All Settings'}</button>
        </div>

        {/* Branding */}
        <Section title="Branding & Support">
          <Row label="App Name" desc="Shown to customers across the product"><input className="input py-1.5 text-sm w-64" value={config.app_name||''} onChange={(e)=>setConfig(p=>({...p,app_name:e.target.value}))}/></Row>
          <Row label="Support Email"><input className="input py-1.5 text-sm w-64" value={config.support_email||''} onChange={(e)=>setConfig(p=>({...p,support_email:e.target.value}))}/></Row>
          <Row label="Support URL"><input className="input py-1.5 text-sm w-64" placeholder="https://docs.costlens.io" value={config.support_url||''} onChange={(e)=>setConfig(p=>({...p,support_url:e.target.value}))}/></Row>
        </Section>

        {/* Onboarding */}
        <Section title="Onboarding">
          <Row label="Registration Open" desc="Allow new users to sign up"><Toggle val={config.registration_enabled} set={(v)=>setConfig(p=>({...p,registration_enabled:v}))}/></Row>
          <Row label="Default Plan" desc="Plan assigned on signup"><select className="input py-1.5 text-sm w-40" value={config.default_plan||'free'} onChange={(e)=>setConfig(p=>({...p,default_plan:e.target.value}))}><option value="free">Free</option><option value="startup">Startup</option></select></Row>
          <Row label="Free Trial" desc="Days of trial on paid plan (0 = no trial)"><input type="number" className="input py-1.5 text-sm w-24 text-right font-mono" value={config.trial_days||0} onChange={(e)=>setConfig(p=>({...p,trial_days:Number(e.target.value)}))}/></Row>
          <Row label="Trial Plan" desc="Which plan to unlock during trial"><select className="input py-1.5 text-sm w-40" value={config.trial_plan||'startup'} onChange={(e)=>setConfig(p=>({...p,trial_plan:e.target.value}))}><option value="startup">Startup</option><option value="business">Business</option></select></Row>
          <Row label="Welcome Email" desc="Send welcome email on signup"><Toggle val={config.welcome_email_enabled} set={(v)=>setConfig(p=>({...p,welcome_email_enabled:v}))}/></Row>
          <Row label="Email Verification" desc="Require email verification before access"><Toggle val={config.require_email_verification} set={(v)=>setConfig(p=>({...p,require_email_verification:v}))}/></Row>
          <Row label="Allowed Domains" desc="Comma-separated, empty = all (e.g. acme.com,startup.io)"><input className="input py-1.5 text-sm w-64" placeholder="Leave empty for all" value={config.allowed_email_domains||''} onChange={(e)=>setConfig(p=>({...p,allowed_email_domains:e.target.value}))}/></Row>
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <Row label="Startup Price"><div className="flex items-center gap-1"><span className="text-white/30">$</span><input type="number" className="input py-1.5 text-sm w-24 text-right font-mono" value={config.startup_price||29} onChange={(e)=>setConfig(p=>({...p,startup_price:Number(e.target.value)}))}/><span className="text-xs text-white/20">/mo</span></div></Row>
          <Row label="Business Price"><div className="flex items-center gap-1"><span className="text-white/30">$</span><input type="number" className="input py-1.5 text-sm w-24 text-right font-mono" value={config.business_price||99} onChange={(e)=>setConfig(p=>({...p,business_price:Number(e.target.value)}))}/><span className="text-xs text-white/20">/mo</span></div></Row>
          <Row label="Stripe Startup Price ID" desc="From your Stripe dashboard"><input className="input py-1.5 text-sm w-64 font-mono" placeholder="price_..." value={config.stripe_startup_price_id||''} onChange={(e)=>setConfig(p=>({...p,stripe_startup_price_id:e.target.value}))}/></Row>
          <Row label="Stripe Business Price ID"><input className="input py-1.5 text-sm w-64 font-mono" placeholder="price_..." value={config.stripe_business_price_id||''} onChange={(e)=>setConfig(p=>({...p,stripe_business_price_id:e.target.value}))}/></Row>
        </Section>

        {/* Plan Features */}
        <Section title="Plan Feature Limits">
          <div className="overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr className="border-b border-white/[0.06]">
            {['Feature','Free','Startup','Business'].map(h=><th key={h} className="table-header text-left py-3 px-2">{h}</th>)}
          </tr></thead><tbody>
            <FeatureRow label="Max Connections" free={config.free_max_connections} startup={config.startup_max_connections} business={config.business_max_connections} onChange={(plan,v)=>setConfig(p=>({...p,[`${plan}_max_connections`]:Number(v)}))}/>
            <FeatureRow label="History (days)" free={config.free_history_days} startup={config.startup_history_days} business={config.business_history_days} onChange={(plan,v)=>setConfig(p=>({...p,[`${plan}_history_days`]:Number(v)}))}/>
            <FeatureRow label="Team Seats" free={config.free_max_team_seats} startup={config.startup_max_team_seats} business={config.business_max_team_seats} onChange={(plan,v)=>setConfig(p=>({...p,[`${plan}_max_team_seats`]:Number(v)}))} note="0 = unlimited"/>
            <tr className="border-b border-white/[0.03]">
              <td className="py-3 px-2 text-xs text-white/60">Alerts</td>
              <td className="py-3 px-2"><Toggle val={config.free_alerts_enabled} set={(v)=>setConfig(p=>({...p,free_alerts_enabled:v}))}/></td>
              <td className="py-3 px-2"><Toggle val={config.startup_alerts_enabled} set={(v)=>setConfig(p=>({...p,startup_alerts_enabled:v}))}/></td>
              <td className="py-3 px-2"><Toggle val={config.business_alerts_enabled} set={(v)=>setConfig(p=>({...p,business_alerts_enabled:v}))}/></td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-xs text-white/60">Insights</td>
              <td className="py-3 px-2"><Toggle val={config.free_insights_enabled} set={(v)=>setConfig(p=>({...p,free_insights_enabled:v}))}/></td>
              <td className="py-3 px-2"><Toggle val={config.startup_insights_enabled} set={(v)=>setConfig(p=>({...p,startup_insights_enabled:v}))}/></td>
              <td className="py-3 px-2"><Toggle val={config.business_insights_enabled} set={(v)=>setConfig(p=>({...p,business_insights_enabled:v}))}/></td>
            </tr>
          </tbody></table></div>
        </Section>

        {/* Maintenance */}
        <Section title="Maintenance Mode">
          <Row label="Maintenance Mode" desc="Show maintenance page to all non-admin users"><Toggle val={config.maintenance_mode} set={(v)=>setConfig(p=>({...p,maintenance_mode:v}))}/></Row>
          <Row label="Message"><input className="input py-1.5 text-sm w-full" value={config.maintenance_message||''} onChange={(e)=>setConfig(p=>({...p,maintenance_message:e.target.value}))}/></Row>
        </Section>
      </>}

      {/* ═══ AUDIT LOG ═══ */}
      {tab === 'audit' && <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead><tr className="border-b border-white/[0.06]">
            {['Admin','Action','Target','Details','Time'].map(h=><th key={h} className="table-header text-left py-3 px-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {(auditData||[]).length===0?<tr><td colSpan={5} className="text-center py-8 text-white/20 text-sm">No actions logged yet</td></tr>
            :(auditData||[]).map((a)=><tr key={a.id} className="border-b border-white/[0.03]">
              <td className="py-3 px-2 text-xs font-mono text-white/40">{a.admin_email}</td>
              <td className="py-3 px-2"><span className="badge badge-brand">{a.action}</span></td>
              <td className="py-3 px-2 text-xs text-white/30">{a.target_type} {a.target_id?`#${a.target_id.slice(0,8)}`:''}</td>
              <td className="py-3 px-2 text-xs text-white/30 max-w-[200px] truncate">{a.details}</td>
              <td className="py-3 px-2 text-xs text-white/20 font-mono">{timeAgo(a.created_at)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

/* ── Reusable sub-components ──────────────────────────────────── */

function Metric({label,value,sub,change,icon,color}){
  return <div className="card-hover group"><div className="flex justify-between mb-3"><span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{label}</span><span className={`${color} opacity-50 group-hover:opacity-80 transition-opacity`}>{icon}</span></div><div className="text-2xl font-bold text-white font-mono tracking-tight mb-1">{value}</div><div className="flex items-center gap-2"><span className="text-[11px] text-white/30">{sub}</span>{change!=null&&<span className={`text-[10px] font-mono flex items-center gap-0.5 ${change>=0?'text-accent-green':'text-accent-red'}`}>{change>=0?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{Math.abs(change)}%</span>}</div></div>;
}

function Section({title,children}){
  return <div className="mb-8"><h2 className="section-label mb-3">{title}</h2><div className="card space-y-0">{children}</div></div>;
}

function Row({label,desc,children}){
  return <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0"><div><div className="text-sm text-white">{label}</div>{desc&&<div className="text-[11px] text-white/25 mt-0.5">{desc}</div>}</div><div>{children}</div></div>;
}

function Toggle({val,set}){
  return <button onClick={()=>set(!val)} className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${val?'bg-brand-500':'bg-white/[0.08]'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${val?'translate-x-4':'translate-x-0'}`}/></button>;
}

function FeatureRow({label,free,startup,business,onChange,note}){
  return <tr className="border-b border-white/[0.03]">
    <td className="py-3 px-2 text-xs text-white/60">{label}{note&&<span className="text-white/20 ml-1">({note})</span>}</td>
    <td className="py-3 px-2"><input type="number" className="input py-1 text-xs w-16 text-right font-mono" value={free||0} onChange={(e)=>onChange('free',e.target.value)}/></td>
    <td className="py-3 px-2"><input type="number" className="input py-1 text-xs w-16 text-right font-mono" value={startup||0} onChange={(e)=>onChange('startup',e.target.value)}/></td>
    <td className="py-3 px-2"><input type="number" className="input py-1 text-xs w-16 text-right font-mono" value={business||0} onChange={(e)=>onChange('business',e.target.value)}/></td>
  </tr>;
}

/* ── User Detail Modal ────────────────────────────────────────── */
function UserDetailModal({userId,onClose,toast,onRefetch}){
  const {data:user,loading}=useApi(adminAPI.getUserDetail,[userId]);
  const {mutate:saveNotes}=useMutation(adminAPI.updateUserNotes);
  const [notes,setNotes]=useState('');
  useEffect(()=>{if(user)setNotes(user.notes||'');},[user]);

  if(loading)return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin"/></div>;
  if(!user)return null;

  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
    <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
      <div className="flex justify-between items-start mb-4">
        <div><div className="text-lg font-bold text-white">{user.full_name||user.email}</div><div className="text-xs font-mono text-white/30">{user.email}</div></div>
        <button onClick={onClose} className="text-white/20 hover:text-white"><X size={18}/></button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-[10px] text-white/25 uppercase mb-1">Plan</div><div className="text-sm font-semibold text-white capitalize">{user.plan}</div></div>
        <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-[10px] text-white/25 uppercase mb-1">Total Paid</div><div className="text-sm font-semibold text-accent-green font-mono">{formatCurrency(user.total_paid)}</div></div>
        <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-[10px] text-white/25 uppercase mb-1">Company</div><div className="text-sm text-white">{user.company_name||'—'}</div></div>
        <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-[10px] text-white/25 uppercase mb-1">Status</div><div className={`text-sm font-semibold ${user.is_active?'text-accent-green':'text-accent-red'}`}>{user.is_active?'Active':'Disabled'}</div></div>
      </div>

      {user.subscription&&<div className="bg-white/[0.03] rounded-lg p-3 mb-4">
        <div className="text-[10px] text-white/25 uppercase mb-1">Subscription</div>
        <div className="text-sm text-white capitalize">{user.subscription.plan} · <span className={user.subscription.status==='active'?'text-accent-green':'text-accent-red'}>{user.subscription.status}</span></div>
        {user.subscription.period_end&&<div className="text-[10px] text-white/20 mt-1">Renews: {new Date(user.subscription.period_end).toLocaleDateString()}</div>}
      </div>}

      <div className="mb-4">
        <div className="text-[10px] text-white/25 uppercase mb-1.5">Admin Notes</div>
        <textarea className="input text-sm h-20 resize-none" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Add internal notes about this customer..."/>
        <button onClick={async()=>{try{await saveNotes(userId,notes);toast.success('Notes saved');onRefetch();}catch{toast.error('Failed');}}} className="btn-secondary text-xs mt-2 flex items-center gap-1"><StickyNote size={12}/>Save Notes</button>
      </div>

      {user.recent_payments?.length>0&&<div>
        <div className="text-[10px] text-white/25 uppercase mb-2">Recent Payments</div>
        {user.recent_payments.map((p)=><div key={p.id} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
          <div><span className="text-xs text-white/60 capitalize">{p.plan}</span><span className="text-[10px] text-white/20 ml-2">{p.created_at?new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—'}</span></div>
          <div className="flex items-center gap-2"><span className="text-sm font-mono text-white">{formatCurrency(p.amount)}</span><span className={`badge text-[9px] ${p.status==='succeeded'?'badge-green':p.status==='refunded'?'badge-brand':'badge-red'}`}>{p.status}</span></div>
        </div>)}
      </div>}
    </div>
  </div>;
}
