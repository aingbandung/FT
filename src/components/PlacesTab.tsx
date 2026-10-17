import React, { useState } from 'react';
import { Member, Place } from '../types';
import { MapView } from './MapView';
import { Repo } from '../services/repo';

interface PlacesTabProps {
  members: Member[];
  places: Place[];
}

export const PlacesTab: React.FC<PlacesTabProps> = ({ members, places }) => {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('150');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: members[0]?.lat ?? places[0]?.lat ?? 40.7829,
    lng: members[0]?.lng ?? places[0]?.lng ?? -73.9654,
  });
  const [loading, setLoading] = useState(false);

  const handleAddPlace = async () => {
    try {
      setLoading(true);
      const parsedRadius = parseFloat(radius) || 150;
      await Repo.addPlace(name.trim() || 'Place', mapCenter.lat, mapCenter.lng, parsedRadius);
      setName('');
    } catch (e) {
      console.error('Failed to add place:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlace = async (id: string) => {
    try {
      await Repo.deletePlace(id);
    } catch (e) {
      console.error('Failed to delete place:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Map with Red "+" Crosshair at center */}
      <div className="flex-1 relative w-full h-full min-h-[200px]">
        <MapView
          members={members}
          places={places}
          centerCrosshair={true}
          onCenterChange={setMapCenter}
        />
      </div>

      {/* Input controls */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Place name (e.g. Home, Gym, School)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
          <div className="w-28">
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="Radius m"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleAddPlace}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
        >
          <span>Add place at map center (+)</span>
        </button>
      </div>

      {/* Places List (height 110.dp in Compose) */}
      <div className="h-[120px] shrink-0 border-t border-slate-200 bg-white overflow-y-auto px-4 py-1">
        {places.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No places added yet</p>
        ) : (
          places.map((p) => (
            <div
              key={p.id}
              className="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0"
            >
              <div className="text-sm font-medium text-slate-800">
                {p.name} <span className="text-slate-400 font-normal">· {Math.round(p.radius)} m</span>
              </div>
              <button
                onClick={() => handleDeletePlace(p.id)}
                className="text-xs font-semibold text-blue-600 hover:text-red-600 transition-colors px-2 py-1"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
