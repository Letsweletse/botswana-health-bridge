import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clinics } from '@/data/mockClinicData';

const statusColors: Record<string, string> = {
  stocked: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

const ClinicMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView([-24.6450, 25.9230], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    clinics.forEach((clinic) => {
      const color = statusColors[clinic.status] || '#888';
      L.circleMarker([clinic.lat, clinic.lng], {
        radius: clinic.status === 'critical' ? 10 : 8,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      })
        .bindPopup(`<div style="font-size:12px"><strong>${clinic.name}</strong><br/>Status: ${clinic.status}</div>`)
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-display font-semibold text-foreground">Clinic Status Map</h2>
          <p className="text-xs text-muted-foreground">Real-time shelf-level monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: 'Stocked', color: 'bg-success' },
            { label: 'Warning', color: 'bg-warning' },
            { label: 'Critical', color: 'bg-critical' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[340px]" />
    </div>
  );
};

export default ClinicMap;
