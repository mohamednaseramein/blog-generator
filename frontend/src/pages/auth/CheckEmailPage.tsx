import { Link } from 'react-router-dom';

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 mb-4">
            <span className="text-indigo-600 text-xl">✉️</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 mb-6">
            We've sent a verification link to your email address. Please verify your email to start creating blogs.
          </p>
          <div className="text-sm">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
