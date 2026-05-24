import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ExternalLink, Loader2, MapPin, Phone, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/ChekaMeds_Logo.png';

interface Facility {
  facility_name: string;
  facility_slug: string;
  facility_type: string | null;
  city_town: string | null;
  area: string | null;
  address: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  website: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  listing_status: string | null;
  stock_visibility: boolean | null;
  can_receive_reservations: boolean | null;
  public_note: string | null;
  disclaimer: string | null;
  source: string | null;
  notes: string | null;
  map_import_ready: boolean | null;
  updated_at: string | null;
}

const claimNumber = '26771424486';

const normalize = (value: string) => value.toLowerCase().trim();

const statusCopy = (facility: Facility) => {
  if (facility.stock_visibility || facility.can_receive_reservations || facility.listing_status === 'connected') {
    return {
      label: 'Connected ChekaMeds partner',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }

  return {
    label: 'Directory listing — not yet connected',
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  };
};

const facilityTypeLabel = (type?: string | null) => {
  if (!type) return 'Facility';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const FacilitiesPage = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');

  const { data: facilities = [], isLoading, error } = useQuery<Facility[]>({
    queryKey: ['chekameds-public-facilities-map'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chekameds_public_facilities_map')
        .select('*')
        .order('city_town', { ascending: true })
        .order('facility_name', { ascending: true });

      if (error) throw error;
      return (data || []) as Facility[];
    },
  });

  const filteredFacilities = useMemo(() => {
    const q = normalize(query);
    return facilities.filter((facility) => {
      const matchesType = type === 'all' || normalize(facility.facility_type || '') === type;
      const matchesCity = city === 'all' || normalize(facility.city_town || '') === city;
      const haystack = normalize([
        facility.facility_name,
        facility.facility_type,
        facility.city_town,
        facility.area,
        facility.address,
        facility.notes,
      ].filter(Boolean).join(' '));
      const matchesQuery = !q || haystack.includes(q);
      return matchesType && matchesCity && matchesQuery;
    });
  }, [facilities, query, type, city]);

  const cities = useMemo(() => Array.from(new Set(facilities.map((f) => f.city_town).filter(Boolean).map((c) => normalize(c!)))).sort(), [facilities]);
  const totalReadyForMap = facilities.filter((f) => f.map_import_ready).length;
  const connectedCount = facilities.filter((f) => f.stock_visibility || f.can_receive_reservations || f.listing_status === 'connected').length;

  const claimLink = (facility: Facility) => {
    const message = `Hello ChekaMeds, I want to claim or update this facility listing:%0A%0AFacility: ${facility.facility_name}%0ACity: ${facility.city_town || 'Not listed'}%0AArea: ${facility.area || 'Not listed'}%0A%0APlease assist.`;
    return `https://wa.me/${claimNumber}?text=${message}`;
  };

  return (
    <div className="min-h-screen font-[Gordita,system-ui,sans-serif] antialiased bg-[#020e08] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020e08]/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="ChekaMeds" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/search" className="text-xs font-medium text-white/50 hover:text-white transition-colors flex items-center gap-1">
              Medicine Search <ArrowRight className="h-3 w-3" />
            </Link>
            <Link to="/" className="text-xs font-medium text-white/50 hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4">
        <section className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-xs font-semibold mb-5 border border-emerald-500/20">
              <MapPin className="h-3.5 w-3.5" /> Facility directory and map listings
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">ChekaMeds Facility Directory</h1>
            <p className="text-white/45 max-w-2xl mx-auto text-sm md:text-base">
              Browse healthcare facilities and pharmacies across Botswana. Directory listings are shown for location reference only unless marked as connected ChekaMeds partners.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/[0.04] border border-white/[0.08] p-5">
              <p className="text-xs text-white/35 mb-1">Total facilities</p>
              <p className="text-3xl font-bold text-white">{facilities.length}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] p-5">
              <p className="text-xs text-white/35 mb-1">Ready for map</p>
              <p className="text-3xl font-bold text-emerald-300">{totalReadyForMap}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] p-5">
              <p className="text-xs text-white/35 mb-1">Connected stock partners</p>
              <p className="text-3xl font-bold text-amber-300">{connectedCount}</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 mb-6 flex items-start gap-3 text-left">
            <ShieldAlert className="h-5 w-5 text-amber-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Important distinction</p>
              <p className="text-xs text-amber-100/70 mt-1">
                These facilities are directory/map listings. Stock availability is only shown on medicine search when a connected facility has uploaded real inventory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facility, city, area or address..."
                className="w-full pl-11 pr-4 h-12 bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-12 bg-white/[0.04] border border-white/[0.1] text-white px-3 focus:outline-none focus:border-emerald-500/50">
              <option value="all" className="bg-[#020e08]">All types</option>
              <option value="hospital" className="bg-[#020e08]">Hospitals</option>
              <option value="clinic" className="bg-[#020e08]">Clinics</option>
              <option value="pharmacy" className="bg-[#020e08]">Pharmacies</option>
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 bg-white/[0.04] border border-white/[0.1] text-white px-3 focus:outline-none focus:border-emerald-500/50">
              <option value="all" className="bg-[#020e08]">All cities</option>
              {cities.map((cityName) => (
                <option key={cityName} value={cityName} className="bg-[#020e08]">{cityName}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-white/50 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> Loading facilities...
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 text-center">
              <p className="text-red-300 font-semibold">Could not load facilities.</p>
              <p className="text-xs text-red-200/60 mt-1">Confirm the chekameds_public_facilities_map view exists in Supabase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacilities.map((facility, index) => {
                const status = statusCopy(facility);
                return (
                  <motion.article
                    key={facility.facility_slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.025, 0.3) }}
                    className="bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.055] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-white leading-snug">{facility.facility_name}</h2>
                          <p className="text-[11px] text-white/35 mt-0.5">
                            {facilityTypeLabel(facility.facility_type)} · {[facility.city_town, facility.area].filter(Boolean).join(' · ') || 'Location not listed'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 border font-semibold whitespace-nowrap ${status.className}`}>{status.label}</span>
                    </div>

                    {facility.address && <p className="text-xs text-white/45 mb-2"><MapPin className="inline h-3.5 w-3.5 mr-1 text-emerald-400" />{facility.address}</p>}
                    {facility.phone_whatsapp && <p className="text-xs text-white/45 mb-2"><Phone className="inline h-3.5 w-3.5 mr-1 text-emerald-400" />{facility.phone_whatsapp}</p>}
                    {facility.notes && <p className="text-xs text-white/30 mb-3">{facility.notes}</p>}

                    <p className="text-[11px] text-white/25 border-t border-white/[0.06] pt-3 mb-3">
                      This facility is included for healthcare location reference only. It has not yet connected stock or reservations to ChekaMeds.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {facility.google_maps_url && (
                        <a href={facility.google_maps_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-white hover:border-emerald-500/30 inline-flex items-center gap-1.5">
                          Open map <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <a href={claimLink(facility)} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15 inline-flex items-center gap-1.5">
                        Claim / update listing <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-6 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} ChekaMeds — Facility directory and medicine availability platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default FacilitiesPage;
