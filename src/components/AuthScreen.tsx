import React, { useState } from 'react';
import { Repo } from '../services/repo';

interface AuthScreenProps {
  onDone: (uid: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onDone }) => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setErr('');
      setLoading(true);
      const uid = await Repo.signIn(email.trim(), pw);
      onDone(uid);
    } catch (e: any) {
      setErr(e.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setErr('');
      setLoading(true);
      const uid = await Repo.signUp(email.trim(), pw, name.trim() || 'Me');
      onDone(uid);
    } catch (e: any) {
      setErr(e.message || 'Error signing up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Family Locator</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Your name (sign up only)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
            />
          </div>

          {err && (
            <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {err}
            </p>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              {loading ? 'Please wait...' : 'Sign in'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-600 font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              Sign up
            </button>
          </div>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2">Or test immediately with demo family:</p>
            <button
              type="button"
              onClick={() => {
                setEmail('alex@example.com');
                setPw('password');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Use demo account (Alex)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
