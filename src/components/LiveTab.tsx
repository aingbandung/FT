import React from 'react';
import { Member, Place, ago } from '../types';
import { MapView } from './MapView';
import { LocationTracker } from '../services/locationTracker';
import { Repo } from '../services/repo';

interface LiveTabProps {
  circleId: string;
  members: Member[];
  places: Place[];
  sharing: boolean;
  sos: boolean;
  onSharing: (sharing: boolean) => void;
  onSos: (sos: boolean) => void;
}

export const LiveTab: React.FC<LiveTabProps> = ({
  circleId,
  members,
  places,
  sharing,
  sos,
  onSharing,
  onSos,
}) => {
  const handleToggleSharing = () => {
    if (sharing) {
      LocationTracker.stop();
      onSharing(false);
    } else {
      LocationTracker.start(circleId);
      onSharing(true);
    }
  };

  const handleToggleSos = async () => {
    const nextSos = !sos;
    onSos(nextSos);
    try {
      await Repo.setSos(nextSos);
    } catch (e) {
      console.error('Failed to set SOS state:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Map View */}
      <div className="flex-1 relative w-full h-full min-h-[220px]">
        <MapView members={members} places={places} />
      </div>

      {/* Member status list (LazyColumn in Android with height 110.dp) */}
      <div className="h-[120px] shrink-0 border-t border-slate-200 bg-white overflow-y-auto px-4 py-2">
        {members.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No members online yet</p>
        ) : (
          members.map((m) => (
            <div
              key={m.uid}
              className={`py-1 text-sm font-medium flex items-center justify-between ${
                m.sos ? 'text-red-600 font-bold' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {m.sos && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wide">SOS</span>}
                <span>{m.name}</span>
                <span className="text-slate-400 font-normal">· {ago(m.ts)}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="p-3 bg-white border-t border-slate-200 flex gap-3 shrink-0">
        <button
          onClick={handleToggleSharing}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm ${
            sharing
              ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {sharing ? 'Stop sharing' : 'Share my location'}
        </button>

        <button
          onClick={handleToggleSos}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-sm ${
            sos
              ? 'bg-slate-800 hover:bg-slate-900 border-2 border-red-500'
              : 'bg-[#D32F2F] hover:bg-red-700'
          }`}
        >
          {sos ? 'Cancel SOS' : 'SOS'}
        </button>
      </div>
    </div>
  );
};
