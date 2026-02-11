import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { clinics } from '@/data/mockClinicData';

const statusColors: Record<string, string> = {
  stocked: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

const ClinicMap = () => {
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
      <div className="h-[340px]">
        <MapContainer
          center={[-24.6450, 25.9230]}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {clinics.map((clinic) => (
            <CircleMarker
              key={clinic.name}
              center={[clinic.lat, clinic.lng]}
              radius={clinic.status === 'critical' ? 10 : 8}
              pathOptions={{
                fillColor: statusColors[clinic.status],
                color: statusColors[clinic.status],
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.6,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{clinic.name}</p>
                  <p className="capitalize mt-0.5">Status: {clinic.status}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default ClinicMap;
