import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const finish = (next: 'success' | 'error') => {
      if (done) return;
      done = true;
      setStatus(next);
    };

    const timer = setTimeout(() => finish('error'), 12000);

    // Force token parsing from the URL (hash/query) and then rely on auth events.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) return;
      if (data.session) finish('success');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        finish('success');
      }
      if (event === 'SIGNED_OUT') {
        // If the callback returns but we never get a session, treat as error after timeout.
        setStatus('verifying');
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => navigate('/', { replace: true }), 800);
    return () => clearTimeout(t);
  }, [navigate, status]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
        {status === 'verifying' && <p>Finishing sign-in…</p>}
        {status === 'success' && <p className="text-green-600">Signed in! Redirecting…</p>}
        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-red-600">Google sign-in failed or expired.</p>
            <Link className="underline text-indigo-600 hover:text-indigo-500" to="/login">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

