import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function VerifyPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically handles the hash token on load and signs the user in
    // We just wait for the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      }
    });

    // Timeout if nothing happens
    const timer = setTimeout(() => {
      if (status === 'verifying') {
        setStatus('error');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, status]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
        {status === 'verifying' && <p>Verifying your email...</p>}
        {status === 'success' && <p className="text-green-600">Email verified! Redirecting to dashboard...</p>}
        {status === 'error' && <p className="text-red-600">Verification failed or expired. Try logging in or request a new link.</p>}
      </div>
    </div>
  );
}
