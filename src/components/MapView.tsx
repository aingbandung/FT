import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Member, Place, HistoryPoint, hhmm, ago } from '../types';

interface MapViewProps {
  members?: Member[];
  places?: Place[];
  historyPoints?: HistoryPoint[];
  centerCrosshair?: boolean;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  interactive?: boolean;
  initialZoom?: number;
}

export const MapView: React.FC<MapViewProps> = ({
  members = [],
  places = [],
  historyPoints = [],
  centerCrosshair = false,
  onCenterChange,
  initialZoom = 15,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const hasAutoCentered = useRef(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center (NYC / Central Park)
    const defaultLat = 40.7829;
    const defaultLng = -73.9654;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([defaultLat, defaultLng], initialZoom);

    // OpenStreetMap tile layer (matching osmdroid from Android)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersRef.current = layerGroup;
    mapRef.current = map;

    // Map move listener for center crosshair
    const handleMove = () => {
      if (onCenterChange) {
        const c = map.getCenter();
        onCenterChange({ lat: c.lat, lng: c.lng });
      }
    };
    map.on('move', handleMove);

    // Trigger initial center callback
    handleMove();

    // Resize observer to ensure full container rendering
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('move', handleMove);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Overlays: Places, Members, History
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layersRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Places (Geofence Circles)
    places.forEach((p) => {
      const circle = L.circle([p.lat, p.lng], {
        radius: p.radius,
        color: '#0077CC',
        weight: 2,
        fillColor: '#00AAFF',
        fillOpacity: 0.15,
      });

      circle.bindTooltip(`<b>${p.name}</b><br/>${Math.round(p.radius)} m radius`, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
      });

      layerGroup.addLayer(circle);

      // Center point icon for place
      const placeCenterIcon = L.divIcon({
        className: 'custom-place-center',
        html: `
          <div style="background-color: #0284c7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const placeMarker = L.marker([p.lat, p.lng], { icon: placeCenterIcon });
      placeMarker.bindPopup(`<b>${p.name}</b><br/>Geofence zone (${Math.round(p.radius)} m)`);
      layerGroup.addLayer(placeMarker);
    });

    // 2. Draw Members
    members.forEach((m) => {
      const isSos = m.sos;
      const markerColor = isSos ? '#DC2626' : '#2563EB';
      const initial = m.name.charAt(0).toUpperCase() || 'M';

      const customIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            ${
              isSos
                ? `<div style="position: absolute; -top: 10px; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(220, 38, 38, 0.4);"></div>`
                : ''
            }
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${markerColor};
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              color: white;
              font-weight: bold;
              font-size: 13px;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10;
            ">
              ${initial}
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.85);
              color: white;
              font-size: 11px;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 9999px;
              margin-top: 2px;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.25);
            ">
              ${isSos ? '🚨 SOS! ' : ''}${m.name}
            </div>
          </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 16],
      });

      const marker = L.marker([m.lat, m.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="padding: 4px;">
          <h3 style="font-weight: bold; margin: 0; color: ${isSos ? '#dc2626' : '#1e293b'}">
            ${isSos ? '⚠️ SOS ALERT - ' : ''}${m.name}
          </h3>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Last seen: ${ago(m.ts)}</p>
          <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">Coords: ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}</p>
        </div>
      `);
      layerGroup.addLayer(marker);
    });

    // 3. Draw History (Polyline + Start/End Markers)
    if (historyPoints.length > 0) {
      const latLngs = historyPoints.map((p) => [p.lat, p.lng] as [number, number]);

      if (latLngs.length >= 2) {
        const polyline = L.polyline(latLngs, {
          color: '#1E66F5',
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
        });
        layerGroup.addLayer(polyline);
      }

      // Start Marker
      const first = historyPoints[0];
      const startIcon = L.divIcon({
        className: 'history-start-marker',
        html: `
          <div style="background-color: #16a34a; color: white; font-weight: bold; font-size: 11px; padding: 3px 7px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
            ▶ Start ${hhmm(first.ts)}
          </div>
        `,
        iconSize: [70, 26],
        iconAnchor: [35, 13],
      });
      const startMarker = L.marker([first.lat, first.lng], { icon: startIcon });
      startMarker.bindPopup(`<b>Start</b> at ${hhmm(first.ts)}`);
      layerGroup.addLayer(startMarker);

      // End Marker (if more than 1 point)
      if (historyPoints.length >= 2) {
        const last = historyPoints[historyPoints.length - 1];
        const endIcon = L.divIcon({
          className: 'history-end-marker',
          html: `
            <div style="background-color: #dc2626; color: white; font-weight: bold; font-size: 11px; padding: 3px 7px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
              ⏹ End ${hhmm(last.ts)}
            </div>
          `,
          iconSize: [70, 26],
          iconAnchor: [35, 13],
        });
        const endMarker = L.marker([last.lat, last.lng], { icon: endIcon });
        endMarker.bindPopup(`<b>End</b> at ${hhmm(last.ts)}`);
        layerGroup.addLayer(endMarker);

        // Auto zoom to bounding box (matches Android map.zoomToBoundingBox)
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      } else {
        map.setView([first.lat, first.lng], 17);
      }
    }

    // Auto-center on first load if we have members or places and no history
    if (!hasAutoCentered.current && historyPoints.length === 0) {
      if (members.length > 0) {
        map.setView([members[0].lat, members[0].lng], initialZoom);
        hasAutoCentered.current = true;
      } else if (places.length > 0) {
        map.setView([places[0].lat, places[0].lng], initialZoom);
        hasAutoCentered.current = true;
      }
    }
  }, [members, places, historyPoints, initialZoom]);

  return (
    <div className="relative w-full h-full min-h-[260px] overflow-hidden">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Red crosshair indicator for PlacesTab */}
      {centerCrosshair && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex items-center justify-center">
            {/* Red plus crosshair matching Compose: Text("+", color = Color.Red, fontSize: headlineLarge) */}
            <span className="text-red-600 text-4xl font-light select-none drop-shadow-md leading-none">
              +
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
