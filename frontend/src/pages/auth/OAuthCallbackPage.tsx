import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles parsing OAuth tokens from the URL fragment when the client initializes.
    // We still call getSession() to force token parsing and then wait for SIGNED_IN.
    const timer = setTimeout(() => {
      setStatus('error');
    }, 7000);

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    };

    void init().catch(() => {
      // Let the auth-state-change subscription decide the final outcome.
      setStatus('verifying');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1000);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
        {status === 'verifying' && <p>Finishing sign-in…</p>}
        {status === 'success' && (
          <p className="text-green-600">Signed in! Redirecting to dashboard…</p>
        )}
        {status === 'error' && (
          <p className="text-red-600">
            OAuth sign-in failed. You can try again by going back to <a href="/login" className="underline">Login</a>.
          </p>
        )}
      </div>
    </div>
  );
}

