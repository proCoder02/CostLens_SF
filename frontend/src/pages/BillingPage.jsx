import { useState, useCallback } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { billingAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PageLoader, ErrorState } from '../components/Spinner';
import { formatCurrency, timeAgo } from '../utils/format';
import {
  Check, CreditCard, ArrowRight, Loader2, XCircle,
  Calendar, Receipt, AlertTriangle, Zap, Crown, Sparkles,
} from 'lucide-react';

const PLAN_META = {
  free: { icon: <Zap size={20} />, color: 'white/40', gradient: 'from-white/5 to-white/[0.02]' },
  startup: { icon: <Sparkles size={20} />, color: 'brand-400', gradient: 'from-brand-500/10 to-brand-500/[0.02]' },
  business: { icon: <Crown size={20} />, color: 'accent-amber', gradient: 'from-accent-amber/10 to-accent-amber/[0.02]' },
};

const STATUS_STYLES = {
  succeeded: { label: 'Paid', class: 'badge-green' },
  failed: { label: 'Failed', class: 'badge-red' },
  pending: { label: 'Pending', class: 'badge-amber' },
  refunded: { label: 'Refunded', class: 'badge-brand' },
};

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();

  const { data: plansData, loading: loadingPlans } = useApi(billingAPI.getPlans);
  const { data: subscription, loading: loadingSub, refetch: refetchSub } = useApi(billingAPI.getSubscription);
  const { data: historyData, loading: loadingHistory, refetch: refetchHistory } = useApi(billingAPI.getHistory);

  const { mutate: checkout, loading: checkingOut } = useMutation(billingAPI.checkout);
  const { mutate: cancelSub, loading: canceling } = useMutation(billingAPI.cancelSubscription);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCheckout = useCallback(async (planId) => {
    setSelectedPlan(planId);
    try {
      const result = await checkout(planId);

      if (result.checkout_url) {
        // Production: redirect to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        // Dev mode: payment simulated
        toast.success(result.message || `Upgraded to ${planId}!`, 'Payment Successful');
        refetchSub();
        refetchHistory();
        // Update local user state
        if (user) user.plan = planId;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Checkout failed');
    } finally {
      setSelectedPlan(null);
    }
  }, [checkout, toast, refetchSub, refetchHistory, user]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelSub();
      toast.success('Subscription canceled. You will retain access until the end of your billing period.');
      setShowCancelConfirm(false);
      refetchSub();
      refetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancellation failed');
    }
  }, [cancelSub, toast, refetchSub, refetchHistory]);

  if (loadingPlans || loadingSub) return <PageLoader />;

  const plans = plansData?.plans || [];
  const payments = historyData?.payments || [];
  const currentPlan = user?.plan || 'free';
  const sub = subscription;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-7">
        <h1 className="page-title">Billing</h1>
        <p className="page-subtitle">Manage your plan, subscription, and payment history</p>
      </div>

      {/* Current subscription status */}
      {sub && sub.has_subscription && (
        <div className="card mb-6 relative overflow-hidden noise">
          <div className={`absolute inset-0 bg-gradient-to-r ${PLAN_META[sub.plan]?.gradient || 'from-white/5 to-transparent'}`} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${PLAN_META[sub.plan]?.color}/10 flex items-center justify-center text-${PLAN_META[sub.plan]?.color}`}>
                {PLAN_META[sub.plan]?.icon}
              </div>
              <div>
                <div className="text-sm text-white/40">Current Plan</div>
                <div className="text-xl font-bold text-white capitalize">{sub.plan}</div>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <div className="flex items-center gap-2">
                <span className={`badge ${sub.status === 'active' ? 'badge-green' : 'badge-red'} capitalize`}>
                  {sub.status}
                </span>
                {sub.cancel_at_period_end && (
                  <span className="badge badge-amber">Cancels at period end</span>
                )}
              </div>
              {sub.current_period_end && (
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <Calendar size={11} />
                  Renews {new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="mb-8">
        <h2 className="section-label mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = !isCurrent && plan.price > 0;
            const isDowngrade = !isCurrent && plan.price === 0 && currentPlan !== 'free';
            const meta = PLAN_META[plan.id] || PLAN_META.free;
            const isLoading = selectedPlan === plan.id && checkingOut;

            return (
              <div
                key={plan.id}
                className={`card p-6 relative transition-all duration-200
                  ${isCurrent ? 'border-brand-500/30 bg-brand-500/[0.04]' : 'hover:border-white/[0.12]'}`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[9px] font-bold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Current Plan
                  </div>
                )}

                <div className="text-center mb-5">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3
                    bg-${meta.color}/10 text-${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="text-lg font-bold text-white">{plan.name}</div>
                  <div className="text-3xl font-bold font-mono text-white mt-1">
                    ${plan.price}<span className="text-sm font-normal text-white/25">/{plan.interval}</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] my-4" />

                <div className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-xs text-white/50">
                      <Check size={13} className="text-accent-green flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-lg text-sm font-medium text-center bg-white/[0.04] text-white/30 border border-white/[0.06]">
                    Active
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                ) : isDowngrade ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="btn-secondary w-full text-sm"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed" disabled>
                    Free Forever
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="card mb-6 border-accent-red/20 bg-accent-red/[0.03]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-accent-red mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">Cancel your subscription?</h3>
              <p className="text-xs text-white/40 mb-4">
                You'll lose access to alerts, insights, and extended history at the end of your billing period.
                You can always resubscribe later.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="btn-danger text-xs flex items-center gap-1.5"
                >
                  {canceling ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Yes, cancel
                </button>
                <button onClick={() => setShowCancelConfirm(false)} className="btn-secondary text-xs">
                  Keep my plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div>
        <h2 className="section-label mb-4">Payment History</h2>
        {loadingHistory ? (
          <div className="card text-center py-8 text-white/20 text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="card text-center py-10">
            <Receipt size={24} className="mx-auto text-white/15 mb-3" />
            <p className="text-sm text-white/30">No payments yet</p>
            <p className="text-xs text-white/15 mt-1">Your payment history will appear here after your first purchase</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date', 'Description', 'Amount', 'Method', 'Status'].map((h) => (
                    <th key={h} className="table-header text-left py-3 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const status = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
                  return (
                    <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 text-xs text-white/40 font-mono">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        }) : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-xs text-white/70">{p.description || `CostLens ${p.plan} plan`}</div>
                      </td>
                      <td className="py-3 px-2 text-sm font-semibold font-mono text-white">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5 text-xs text-white/35">
                          <CreditCard size={11} />
                          {p.card_brand && p.card_last4
                            ? `${p.card_brand} ···${p.card_last4}`
                            : p.payment_method || 'Card'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`badge ${status.class}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
