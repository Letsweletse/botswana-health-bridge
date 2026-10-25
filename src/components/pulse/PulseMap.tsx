import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* Botswana map for ChekaMeds Pulse: one circle per monitored town,
   sized by population and coloured by its highest current status. */

export type MapTown = { id: string; name: string; lat: number; lng: number; pop: number; level: 'none' | 'watch' | 'alert'; note?: string };

const COLOR = { alert: '#f87171', watch: '#fbbf5a', none: '#5eeaa8' } as const;

/* Label placement for the crowded south-east, so names don't sit on top of each other.
   side: which side of the dot the name goes; dy: vertical nudge in pixels. */
const LABEL: Record<string, { side: 'l' | 'r'; dy?: number }> = {
  gaborone: { side: 'r', dy: 2 }, molepolole: { side: 'l', dy: -4 }, mochudi: { side: 'r', dy: -12 },
  kanye: { side: 'l', dy: 4 }, lobatse: { side: 'r', dy: 8 }, palapye: { side: 'r', dy: -2 }, serowe: { side: 'l', dy: -2 },
  phikwe: { side: 'r', dy: 6 }, mahalapye: { side: 'l', dy: 2 },
};

/* Simplified Botswana border [lat, lng], drawn locally so the map needs no tile provider or API key. */
const BORDER: [number, number][] = [
  [-17.79, 25.26], [-17.89, 24.2], [-18.0, 23.3], [-18.32, 21.0], [-22.0, 21.0], [-22.0, 20.0], [-24.76, 20.0],
  [-26.83, 20.86], [-26.73, 21.6], [-26.0, 22.6], [-25.27, 23.3], [-25.67, 24.2], [-25.75, 25.0], [-25.49, 25.66],
  [-24.7, 25.95], [-24.6, 26.5], [-24.24, 26.85], [-23.6, 27.6], [-22.83, 28.0], [-22.4, 29.0], [-22.19, 29.37],
  [-21.65, 28.8], [-21.5, 28.0], [-20.85, 27.7], [-20.5, 27.72], [-20.48, 27.3], [-19.29, 26.17], [-18.71, 25.85],
  [-18.53, 25.65], [-17.79, 25.26],
];

export default function PulseMap({ towns, selected, onSelect }: { towns: MapTown[]; selected?: string | null; onSelect?: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(5.5);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, zoomSnap: 0.25, maxZoom: 9, minZoom: 4 }).setView([-22.3, 24.7], 5.5);
    L.polygon(BORDER, { color: 'rgba(255,255,255,0.32)', weight: 1.2, fillColor: '#141a33', fillOpacity: 1, interactive: false }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.fitBounds([[-26.9, 19.9], [-17.7, 29.4]], { padding: [10, 10] });
    mapRef.current = map; layerRef.current = L.layerGroup().addTo(map);
    setZoom(map.getZoom()); map.on('zoomend', () => setZoom(map.getZoom()));
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const layer = layerRef.current; if (!layer) return;
    layer.clearLayers();
    const order = { none: 0, watch: 1, alert: 2 };
    [...towns].sort((a, b) => order[a.level] - order[b.level]).forEach((t) => {
      const r = 6 + Math.sqrt(t.pop / 1000) * 0.9;
      const c = COLOR[t.level];
      if (t.level !== 'none') {
        L.circleMarker([t.lat, t.lng], { radius: r + 9, color: c, weight: 1, opacity: 0.35, fillOpacity: 0.08, interactive: false, className: 'pulse-ring' }).addTo(layer);
      }
      const m = L.circleMarker([t.lat, t.lng], {
        radius: r, color: selected === t.id ? '#ffffff' : c, weight: selected === t.id ? 2.5 : 1.2,
        fillColor: c, fillOpacity: t.level === 'none' ? 0.28 : 0.75,
      }).addTo(layer);
      m.bindTooltip(`<b>${t.name}</b>${t.note ? `<br/>${t.note}` : ''}`, { direction: 'top', offset: [0, -r], className: 'pulse-tip' });
      if (onSelect) m.on('click', () => onSelect(t.id));
      const show = t.level !== 'none' || t.pop > 70000 || selected === t.id || zoom >= 6.75;
      if (show) {
        const p = LABEL[t.id] || { side: 'r' as const };
        const name = t.name.replace('Greater ', '');
        L.marker([t.lat, t.lng], {
          interactive: false,
          icon: L.divIcon({
            className: `pulse-label ${p.side}${t.level !== 'none' ? ' hot' : ''}${selected === t.id ? ' sel' : ''}`,
            html: `<span style="${p.side === 'l' ? `right:${r + 4}px` : `left:${r + 4}px`};top:${(p.dy || 0) - 8}px">${name}</span>`,
            iconSize: [0, 0], iconAnchor: [0, 0],
          }),
        }).addTo(layer);
      }
    });
  }, [towns, selected, onSelect, zoom]);

  return <div ref={ref} className="pulse-map" role="img" aria-label="Map of Botswana showing the current status of each monitored town" />;
}
