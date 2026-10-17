import React from 'react';
import { Event, dayMonth, eventText } from '../types';

interface AlertsTabProps {
  events: Event[];
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400 font-medium text-sm">
        No place alerts yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
      {events.map((e) => {
        const isEnter = e.type === 'enter';
        return (
          <div
            key={e.id}
            className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isEnter ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isEnter ? '📍' : '🚪'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {eventText(e)}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {dayMonth(e.ts)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
