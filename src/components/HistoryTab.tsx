import React, { useState, useEffect } from 'react';
import { Member, HistoryPoint, hhmm, formatDateLocal } from '../types';
import { MapView } from './MapView';
import { Repo } from '../services/repo';

interface HistoryTabProps {
  members: Member[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ members }) => {
  const todayStr = formatDateLocal(new Date());
  const [selectedUid, setSelectedUid] = useState<string | null>(members[0]?.uid || null);
  const [day, setDay] = useState<string>(todayStr);
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedUid && members.length > 0) {
      setSelectedUid(members[0].uid);
    }
  }, [members, selectedUid]);

  useEffect(() => {
    if (!selectedUid) return;
    let isCancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await Repo.history(selectedUid, day);
        if (!isCancelled) {
          setPoints(data);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
        if (!isCancelled) setPoints([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [selectedUid, day]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Filter Chips for Members (horizontal scroll in Compose) */}
      <div className="p-2 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
        {members.map((m) => {
          const isSelected = selectedUid === m.uid;
          return (
            <button
              key={m.uid}
              onClick={() => setSelectedUid(m.uid)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {/* Date & Info row */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Date:</label>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="text-xs text-slate-600 font-medium">
          {loading ? (
            'Loading…'
          ) : points.length === 0 ? (
            'No data for this day'
          ) : (
            `${points.length} points · ${hhmm(points[0].ts)}–${hhmm(points[points.length - 1].ts)}`
          )}
        </div>
      </div>

      {/* Map with route polyline and start/end markers */}
      <div className="flex-1 relative w-full h-full min-h-[220px]">
        <MapView historyPoints={points} />
      </div>
    </div>
  );
};
