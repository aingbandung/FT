import React, { useState } from 'react';
import { Repo } from '../services/repo';

interface CircleScreenProps {
  onDone: (circleId: string) => void;
}

export const CircleScreen: React.FC<CircleScreenProps> = ({ onDone }) => {
  const [circleName, setCircleName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setErr('');
      setLoading(true);
      const circleId = await Repo.createCircle(circleName.trim() || 'Family');
      onDone(circleId);
    } catch (e: any) {
      setErr(e.message || 'Error creating circle');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setErr('');
      setLoading(true);
      const success = await Repo.joinCircle(code);
      if (success) {
        onDone(code.trim().toUpperCase());
      } else {
        setErr('Code not found');
      }
    } catch (e: any) {
      setErr(e.message || 'Error joining circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Create a circle</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Circle name
              </label>
              <input
                type="text"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="Family"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              Create
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium">Or</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Join with an invite code</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Invite code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. FAM789"
                maxLength={8}
                className="w-full uppercase tracking-widest font-mono text-center font-bold px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-base"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              Join
            </button>
          </div>
        </div>

        {err && (
          <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {err}
          </p>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setCode('FAM789');
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Join demo circle (code: FAM789)
          </button>
        </div>
      </div>
    </div>
  );
};
