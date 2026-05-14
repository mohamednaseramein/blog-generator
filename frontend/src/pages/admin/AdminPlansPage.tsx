import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type AdminPlanCreatePayload,
  type AdminPlanPatchPayload,
  type AdminPlanRow,
  archiveAdminPlan,
  createAdminPlan,
  listAdminPlans,
  patchAdminPlan,
  setDefaultAdminPlan,
} from '../../api/admin-api';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Toast } from '../../components/ui/toast';

function fmtLimit(n: number | null): string {
  if (n === null) return 'Unlimited';
  return String(n);
}

function dollarsToCents(s: string): number {
  const t = s.trim();
  if (t === '') return 0;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) throw new Error('Enter a valid price (0 or more)');
  return Math.round(n * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseLimitInput(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error('Limits must be non-negative whole numbers or blank for unlimited');
  return n;
}

type ModalState = null | { mode: 'create' } | { mode: 'edit'; plan: AdminPlanRow };

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [slug, setSlug] = useState('');
  const [blogQuota, setBlogQuota] = useState('');
  const [aiCheckQuota, setAiCheckQuota] = useState('');
  const [authorProfileLimit, setAuthorProfileLimit] = useState('');
  const [referenceQuota, setReferenceQuota] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { plans: rows } = await listAdminPlans();
      setPlans(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setFormError(null);
    setName('');
    setDescription('');
    setPriceDollars('0');
    setCurrency('USD');
    setSlug('');
    setBlogQuota('');
    setAiCheckQuota('');
    setAuthorProfileLimit('');
    setReferenceQuota('');
    setIsPublic(false);
    setModal({ mode: 'create' });
  }

  function openEdit(plan: AdminPlanRow) {
    setFormError(null);
    setName(plan.name);
    setDescription(plan.description);
    setPriceDollars(centsToDollars(plan.priceCents));
    setCurrency(plan.currency);
    setSlug(plan.slug);
    setBlogQuota(plan.limits.blogQuota === null ? '' : String(plan.limits.blogQuota));
    setAiCheckQuota(plan.limits.aiCheckQuota === null ? '' : String(plan.limits.aiCheckQuota));
    setAuthorProfileLimit(plan.limits.authorProfileLimit === null ? '' : String(plan.limits.authorProfileLimit));
    setReferenceQuota(plan.limits.referenceExtractionQuota === null ? '' : String(plan.limits.referenceExtractionQuota));
    setIsPublic(plan.isPublic);
    setModal({ mode: 'edit', plan });
  }

  function buildPayload(): AdminPlanCreatePayload {
    const priceCents = dollarsToCents(priceDollars);
    return {
      name: name.trim(),
      description,
      priceCents,
      currency: currency.toUpperCase(),
      slug: slug.trim() || undefined,
      blogQuota: parseLimitInput(blogQuota),
      aiCheckQuota: parseLimitInput(aiCheckQuota),
      authorProfileLimit: parseLimitInput(authorProfileLimit),
      referenceExtractionQuota: parseLimitInput(referenceQuota),
      isPublic,
    };
  }

  async function handleSubmit() {
    if (!modal) return;
    setFormError(null);
    try {
      const payload = buildPayload();
      if (modal?.mode === 'create') {
        const { plan } = await createAdminPlan(payload);
        setPlans((prev) => [...prev, plan].sort((a, b) => a.sortOrder - b.sortOrder));
      } else if (modal?.mode === 'edit') {
        const patch: AdminPlanPatchPayload = { ...payload };
        delete (patch as { slug?: string }).slug;
        if (slug.trim() && slug.trim() !== modal.plan.slug) {
          (patch as AdminPlanPatchPayload).slug = slug.trim().toLowerCase();
        }
        const { plan } = await patchAdminPlan(modal.plan.id, patch);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleArchive(plan: AdminPlanRow) {
    if (
      !window.confirm(
        `Archive plan "${plan.name}"? It will be hidden from the landing page and cannot be subscribed to.`,
      )
    ) {
      return;
    }
    setBusyId(plan.id);
    setError(null);
    try {
      const { plan: updated } = await archiveAdminPlan(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(plan: AdminPlanRow) {
    if (!window.confirm(`Set "${plan.name}" as the default plan for new signups?`)) return;
    setBusyId(plan.id);
    setError(null);
    try {
      const { plan: updated } = await setDefaultAdminPlan(plan.id);
      setPlans((prev) =>
        prev.map((p) => ({
          ...p,
          isDefault: p.id === updated.id,
        })),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription plans</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and edit tiers, limits, and visibility.{' '}
            <Link to="/admin" className="font-medium text-indigo-600 hover:text-indigo-500">
              Admin home
            </Link>
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          New plan
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Toast variant="error">{error}</Toast>
        </div>
      )}

      {loading && plans.length === 0 ? (
        <p className="text-center text-slate-500">Loading plans…</p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <caption className="sr-only">Subscription plans</caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Limits</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="px-3 py-2">Subscribers</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((p) => {
                  const archived = Boolean(p.archivedAt);
                  const busy = busyId === p.id;
                  return (
                    <tr key={p.id} className={archived ? 'bg-slate-50 text-slate-500' : 'hover:bg-slate-50/80'}>
                      <td className="px-3 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.slug}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {(p.priceCents / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="max-w-[220px] px-3 py-3 text-xs text-slate-600">
                        blogs {fmtLimit(p.limits.blogQuota)}, AI {fmtLimit(p.limits.aiCheckQuota)}, profiles{' '}
                        {fmtLimit(p.limits.authorProfileLimit)}, refs {fmtLimit(p.limits.referenceExtractionQuota)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.isDefault && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                              Default
                            </span>
                          )}
                          {p.isPublic && !archived && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                              Public
                            </span>
                          )}
                          {archived && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                              Archived
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{p.activeSubscriberCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!archived && (
                            <Button variant="ghost" size="sm" type="button" onClick={() => openEdit(p)} disabled={busy}>
                              Edit
                            </Button>
                          )}
                          {!archived && !p.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => void handleSetDefault(p)}
                              disabled={busy}
                            >
                              Set default
                            </Button>
                          )}
                          {!archived && !p.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => void handleArchive(p)}
                              disabled={busy}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-form-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="plan-form-title" className="text-lg font-semibold text-slate-900">
              {modal.mode === 'create' ? 'New plan' : `Edit plan`}
            </h2>
            {formError && (
              <div className="mt-3">
                <Toast variant="error">{formError}</Toast>
              </div>
            )}
            <div className="mt-4 space-y-4">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price (per month, display only)">
                  <Input
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Currency (ISO)">
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
                </Field>
              </div>
              <Field label="Slug (optional — auto from name if empty on create)">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-sm" />
              </Field>
              <p className="text-xs text-slate-500">Leave limits blank for unlimited. Whole numbers only.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Blogs / month">
                  <Input value={blogQuota} onChange={(e) => setBlogQuota(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="AI checks / month">
                  <Input value={aiCheckQuota} onChange={(e) => setAiCheckQuota(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Author profiles (total)">
                  <Input
                    value={authorProfileLimit}
                    onChange={(e) => setAuthorProfileLimit(e.target.value)}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Reference extractions / month">
                  <Input value={referenceQuota} onChange={(e) => setReferenceQuota(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public (shown on landing & self-serve when wired)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSubmit()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
