import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Toast } from '../components/ui/toast';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';

const emailSchema = z.string().email('Enter a valid email');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(1, 'Name is required').max(120, 'At most 120 characters');

export default function ProfilePage() {
  const { user, role } = useAuth();

  const initialName = useMemo(() => {
    const n = (user?.user_metadata as { full_name?: unknown } | undefined)?.full_name;
    return typeof n === 'string' ? n : '';
  }, [user?.user_metadata]);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const nameTouched = useRef(false);
  const emailTouched = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (!nameTouched.current) {
      const n = (user.user_metadata as { full_name?: unknown } | undefined)?.full_name;
      setName(typeof n === 'string' ? n : '');
    }
    if (!emailTouched.current) {
      setEmail(user.email ?? '');
    }
  }, [user]);

  function toFriendlyAuthError(e: unknown) {
    const msg = (e as Error | undefined)?.message ?? 'Something went wrong';
    const lower = msg.toLowerCase();
    if (lower.includes('requires recent login') || lower.includes('reauth') || lower.includes('recent login')) {
      return 'For security, please log out and log in again, then retry this change.';
    }
    return msg;
  }

  if (!user) return <Navigate to="/login" replace />;

  async function handleUpdateName() {
    setError(null);
    setSuccess(null);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid name');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data } });
      if (error) throw error;
      await supabase.auth.refreshSession();
      setSuccess('Name updated.');
    } catch (e) {
      setError(toFriendlyAuthError(e));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateEmail() {
    setError(null);
    setSuccess(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: parsed.data });
      if (error) throw error;
      await supabase.auth.refreshSession();
      setSuccess('We sent a verification email to your new address. Please verify it to confirm the change.');
    } catch (e) {
      setError(toFriendlyAuthError(e));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdatePassword() {
    setError(null);
    setSuccess(null);
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid password');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      await supabase.auth.refreshSession();
      setNewPassword('');
      setSuccess('Password updated.');
    } catch (e) {
      setError(toFriendlyAuthError(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkspaceLayout
      sidebar={
        <WorkspaceSidebar mode="router" active="account" showAdmin={role === 'admin'} />
      }
    >
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Blog Generator</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create a fully-structured, SEO-ready blog post in minutes.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {error && <Toast variant="error">{error}</Toast>}
        {success && <Toast variant="success">{success}</Toast>}

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          <p className="mt-1 text-sm text-slate-500">Update your name, email, or password.</p>
          <p className="mt-2 text-sm">
            <Link to="/plan" className="font-medium text-indigo-600 hover:text-indigo-500">
              Plan &amp; usage
            </Link>
            {' — view your subscription tier and monthly limits.'}
          </p>
        </div>

        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => {
                nameTouched.current = true;
                setName(e.target.value);
              }}
              placeholder="Your name"
            />
          </Field>
          <Button onClick={() => void handleUpdateName()} disabled={isSaving} size="sm" className="w-fit">
            Save name
          </Button>

          <div className="h-px bg-slate-200" />

          <Field label="Email">
            <Input
              value={email}
              onChange={(e) => {
                emailTouched.current = true;
                setEmail(e.target.value);
              }}
              placeholder="you@example.com"
            />
          </Field>
          <Button onClick={() => void handleUpdateEmail()} disabled={isSaving} size="sm" className="w-fit">
            Change email
          </Button>
          <div className="text-xs text-slate-500 space-y-1">
            <div>
              <span className="font-medium text-slate-600">Current email:</span> {user.email}
            </div>
            {(user as { new_email?: string }).new_email && (
              <div>
                <span className="font-medium text-slate-600">Pending new email:</span>{' '}
                {(user as { new_email?: string }).new_email}
              </div>
            )}
            <div>
              Email changes require verification. The new email won’t be confirmed until you verify it.
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          <Field label="New password">
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              type="password"
            />
          </Field>
          <Button onClick={() => void handleUpdatePassword()} disabled={isSaving} size="sm" className="w-fit">
            Change password
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Powered by Claude AI · Naser Company
        {import.meta.env.VITE_APP_VERSION && (
          <span className="ml-1 text-slate-300">v{import.meta.env.VITE_APP_VERSION}</span>
        )}
      </p>
    </WorkspaceLayout>
  );
}
