import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Session state persisted in DB so replies survive cold starts.
type SessionOption = {
  clinic_name: string;
  location: string | null;
  price_bwp: number | null;
  quantity: number;
  med_name: string;
  directions_link?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  pack_size?: string | null;
  category?: string | null;
};
type Session = { medicine: string | null; options: SessionOption[]; selected?: SessionOption; language?: 'en' | 'tn' };

function sessionClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function setSession(from: string, s: Session) {
  if (!from) return;
  try {
    await sessionClient().from('whatsapp_sessions').upsert({
      from_number: from,
      medicine: s.medicine,
      options: s.options as any,
      selected: (s.selected ?? null) as any,
      language: s.language ?? 'en',
      updated_at: new Date().toISOString(),
    });
  } catch (e) { console.error('setSession error', e); }
}

async function updateSession(from: string, patch: Partial<Session>) {
  const current = await getSession(from);
  await setSession(from, {
    medicine: patch.medicine ?? current?.medicine ?? null,
    options: patch.options ?? current?.options ?? [],
    selected: patch.selected ?? current?.selected,
    language: patch.language ?? current?.language ?? 'en',
  });
}

async function getSession(from: string): Promise<Session | undefined> {
  try {
    const { data } = await sessionClient()
      .from('whatsapp_sessions').select('*').eq('from_number', from).maybeSingle();
    if (!data) return undefined;
    if (Date.now() - new Date(data.updated_at).getTime() > 30 * 60 * 1000) return undefined;
    return { medicine: data.medicine, options: (data.options || []) as SessionOption[], selected: data.selected || undefined, language: data.language || 'en' };
  } catch { return undefined; }
}

function getLang(session?: Session): 'en' | 'tn' {
  return session?.language || 'en';
}

const tn: Record<string, string> = {
  greeting: '🏥 *ChekaMeds — Tlhatlhobo ya Ditlhare*\n\nDumelang! 👋 Ke ka go thusa go bona ditlhare.\n\nRomela:\n📍 Leina la kliniiki (jk. "Princess Marina")\n💊 Leina la setlhare (jk. "Metformin")\n📊 "status" go bona kakaretso\n🆘 "critical" go bona tlhaelo e kgolo\n💊 "prescription: Med1, Med2" go bona kliniiki e e nang le tsotlhe',
  no_critical: '✅ Ga go na tlhaelo e kgolo ga jaana! Dikliniiki tsotlhe di na le ditlhare.',
  critical_header: '🚨 *TLHAELO E KGOLO',
  status_header: '📊 *Kakaretso ya ChekaMeds*',
  not_found: '🤔 Ga ke a bona sepe ka',
  lang_switch: '🇧🇼 Puo e fetoletswe go Setswana! Romela molaetsa ope.',
  lang_en: '🇬🇧 Language switched to English! Send any message.',
  prescription_header: '💊 *Prescription Matching*',
  prescription_full: '✅ *FULL MATCH*',
  prescription_partial: '⚠️ *PARTIAL MATCH*',
};

// ===== Performance: in-memory caches (per warm instance) =====
const INVENTORY_TTL_MS = 60_000;
const SEARCH_TTL_MS = 60_000;
const MAX_SEARCH_RESULTS = 5;
const PRICE_ON_REQUEST = 'Available on request';
const SELECTION_HEADER = '✅ Selected';
const RESERVATION_HEADER = '✅ Reservation Request Received';
const COLLECTION_INSTRUCTIONS = 'Please contact or visit the pharmacy for collection.';
const CHEKAPAY_COMING_SOON = '💳 Online payment activation is coming soon with ChekaPay.';
let inventoryCache: { data: any[]; ts: number } | null = null;
const searchCache = new Map<string, { data: any[]; ts: number }>();

function cachedSupabase() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

function cleanPhone(value: string): string {
  return value.replace('@c.us', '').trim();
}

function isAllowedPharmacyName(name: string | null | undefined): boolean {
  const normalized = (name || '').toLowerCase().trim();
  if (!normalized || normalized.includes('gaborone community clinic')) return false;
  return normalized.includes('south west pharma') || normalized === 'chekameds demo pharmacy';
}

function isValidLocation(location: string | null | undefined): boolean {
  const normalized = (location || '').trim();
  if (!normalized) return false;
  return !/^(n\/?a|na|none|null|botswana)$/i.test(normalized);
}

function getDirectionsLink(pharmacy: { directions_link?: string | null }): string | null {
  const configured = pharmacy.directions_link?.trim();
  return configured && /^https?:\/\//i.test(configured) ? configured : null;
}

function formatPrice(price: number | null | undefined): string {
  return price != null ? `P${Number(price).toFixed(2)}` : PRICE_ON_REQUEST;
}

function formatAvailability(quantity: number | null | undefined): string {
  return Number(quantity || 0) < 20 ? 'Low Stock' : 'In Stock';
}

function hasRealDirections(pharmacy: { directions_link?: string | null }): boolean {
  return getDirectionsLink(pharmacy) !== null;
}

function isVisibleSearchRow(row: any): boolean {
  if (!isAllowedPharmacyName(row?.clinic_name)) return false;
  if (!String(row?.med_name || '').trim()) return false;
  if ('approved' in row && row.approved === false) return false;
  return Number(row?.quantity ?? 0) > 0;
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function medicineVariantLabel(item: any): string {
  const parts = [item.med_name, item.strength, item.dosage_form, item.pack_size]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' ');
}

function variantContainsAllTokens(row: any, key: string): boolean {
  const tokens = key.split(/\s+/).filter(Boolean);
  const variant = normalizeSearchText(medicineVariantLabel(row));
  return tokens.length > 0 && tokens.every((token) => variant.includes(token));
}


const medicineAliases: Record<string, string[]> = {
  panado: ['paracetamol', 'acetaminophen'],
  paracetamol: ['panado', 'acetaminophen'],
  acetaminophen: ['paracetamol', 'panado'],
  brufen: ['ibuprofen'],
  ibuprofen: ['brufen'],
  disprin: ['aspirin'],
  aspirin: ['disprin'],
  voltaren: ['diclofenac'],
  diclofenac: ['voltaren'],
  flagyl: ['metronidazole'],
  metronidazole: ['flagyl'],
  amoxil: ['amoxicillin'],
  amoxicillin: ['amoxil'],
  augmentin: ['amoxicillin clavulanate', 'co amoxiclav'],
  ventolin: ['salbutamol'],
  salbutamol: ['ventolin'],
  zyrtec: ['cetirizine'],
  cetirizine: ['zyrtec'],
  claritin: ['loratadine'],
  loratadine: ['claritin'],
  imodium: ['loperamide'],
  loperamide: ['imodium'],
  ors: ['oral rehydration salts', 'oral rehydration'],
};

function expandedMedicineSearchTerms(key: string): string[] {
  const terms = new Set<string>([key]);
  key.split(/\s+/).filter((token) => token.length >= 3).forEach((token) => terms.add(token));
  Object.entries(medicineAliases).forEach(([alias, matches]) => {
    if (key.includes(alias)) matches.forEach((match) => terms.add(normalizeSearchText(match)));
  });
  return Array.from(terms).filter(Boolean).slice(0, 8);
}

function dedupeAndRank(rows: any[]): any[] {
  const byPharmacyAndVariant = new Map<string, any>();
  rows
    .filter((row) => Number(row.quantity) > 0 && isVisibleSearchRow(row))
    .sort(resultRank)
    .forEach((row) => {
      const key = [row.clinic_name, normalizeSearchText(medicineVariantLabel(row))].join('|');
      if (!byPharmacyAndVariant.has(key)) byPharmacyAndVariant.set(key, row);
    });
  return Array.from(byPharmacyAndVariant.values()).sort(resultRank);
}

function resultRank(a: any, b: any): number {
  const ae = a.__exact ? 1 : 0;
  const be = b.__exact ? 1 : 0;
  if (ae !== be) return be - ae;

  const ad = hasRealDirections(a) ? 1 : 0;
  const bd = hasRealDirections(b) ? 1 : 0;
  if (ad !== bd) return bd - ad;

  const al = isValidLocation(a.location) ? 1 : 0;
  const bl = isValidLocation(b.location) ? 1 : 0;
  if (al !== bl) return bl - al;

  const ap = a.price_bwp != null ? Number(a.price_bwp) : Infinity;
  const bp = b.price_bwp != null ? Number(b.price_bwp) : Infinity;
  if (ap !== bp) return ap - bp;

  return Number(b.quantity || 0) - Number(a.quantity || 0);
}

function formatPharmacyLine(option: { clinic_name: string; location?: string | null }): string {
  return `📍 ${option.clinic_name}${isValidLocation(option.location) ? ` — ${String(option.location).trim()}` : ''}`;
}

function formatDirectionsBlock(option: { directions_link?: string | null }): string {
  const link = getDirectionsLink(option);
  return link ? `
🗺️ Directions:
${link}` : '';
}

function formatDirectionsInline(option: { directions_link?: string | null }): string {
  const link = getDirectionsLink(option);
  return link ? `
🗺️ ${link}` : '';
}

function formatResultItem(option: SessionOption, index: number): string {
  return `${index + 1}. *${option.med_name}*
${formatPharmacyLine(option)}
💰 Price: ${formatPrice(option.price_bwp)}
📦 Availability: ${formatAvailability(option.quantity)}${formatDirectionsBlock(option)}`;
}

function helpReply(): string {
  return `💊 *ChekaMeds Search*

Send a medicine name, brand, or symptom.

Examples:
• Panado
• Paracetamol
• Flu symptoms
• Headache

ChekaMeds helps find listed stock. It does not diagnose.`;
}

function noResultReply(query: string): string {
  return `No listed stock found for “${query.trim()}”.

Try another spelling, brand name, or generic medicine.

For urgent symptoms, please consult a pharmacist or healthcare professional.`;
}

function manualCollectionReply(selected: SessionOption): string {
  return `${RESERVATION_HEADER}

Selected Item:
${selected.med_name}

${formatPharmacyLine(selected)}${formatDirectionsInline(selected)}

${COLLECTION_INSTRUCTIONS}

${CHEKAPAY_COMING_SOON}`;
}

function buildSelectionReply(choice: SessionOption): string {
  return `${SELECTION_HEADER}

${choice.med_name}
${formatPharmacyLine(choice)}
💰 Price: ${formatPrice(choice.price_bwp)}
📦 Availability: ${formatAvailability(choice.quantity)}${formatDirectionsBlock(choice)}

Reply PAY to continue.`;
}

function buildMedicineSearchReply(_medicine: string, options: SessionOption[]): string {
  let reply = `💊 *ChekaMeds Search Results*

`;
  reply += options.map((option, index) => formatResultItem(option, index)).join('

');
  reply += `

Reply with the option number to continue.
You may search another medicine at any time.`;
  return reply;
}

function buildSymptomSearchReply(label: string, options: SessionOption[]): string {
  let reply = `💊 *ChekaMeds Search Results*

`;
  reply += `For ${label}-related care, these listed items may be relevant:

`;
  reply += options.map((option, index) => formatResultItem(option, index)).join('

');
  reply += `

Reply with the option number to continue.

ChekaMeds helps find listed stock. It does not diagnose.`;
  return reply;
}

async function recordOrderRequest(from: string, selected: SessionOption) {
  try {
    await cachedSupabase().from('order_requests').insert({
      from_number: from || null,
      pharmacy_name: selected.clinic_name,
      medicine: selected.med_name,
      price_bwp: selected.price_bwp,
      payment_status: 'manual_collection_pending',
      request_source: 'whatsapp',
      notes: 'PAY fallback: ChekaPay online checkout not active',
    });
  } catch (e) {
    console.error('recordOrderRequest error', e);
  }
}

async function recordFailedSearch(from: string, query: string) {
  if (!query) return;
  try {
    await cachedSupabase().from('failed_searches').insert({
      from_number: from || null,
      query,
      source: 'whatsapp',
    });
  } catch (e) {
    console.error('recordFailedSearch error', e);
  }
}

async function getInventoryData() {
  if (inventoryCache && Date.now() - inventoryCache.ts < INVENTORY_TTL_MS) {
    return inventoryCache.data;
  }
  const { data, error } = await cachedSupabase()
    .from('active_pharmacy_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location,trend,category,directions_link,strength,dosage_form,pack_size')
    .order('clinic_name');
  if (error) { console.error('DB query error:', error); return []; }
  inventoryCache = { data: (data || []).filter((row: any) => Number(row.quantity) > 0 && isVisibleSearchRow(row)), ts: Date.now() };
  return inventoryCache.data;
}

const symptomOtcMappings = [
  { label: 'pain or fever', patterns: [/\b(headache|pain|ache|fever|temperature|migraine|toothache|period pain)\b/], categories: ['analgesic', 'pain', 'fever'], medicines: ['paracetamol', 'ibuprofen', 'aspirin'] },
  { label: 'flu', patterns: [/\b(cough|flu|cold|blocked nose|runny nose|sore throat|congestion)\b/], categories: ['cough', 'cold', 'respiratory', 'antihistamine'], medicines: ['cough syrup', 'loratadine', 'cetirizine', 'saline'] },
  { label: 'allergy', patterns: [/\b(allergy|allergies|hay fever|itchy|sneezing|rash)\b/], categories: ['antihistamine', 'allergy'], medicines: ['loratadine', 'cetirizine', 'chlorpheniramine'] },
  { label: 'stomach symptoms', patterns: [/\b(stomach|heartburn|indigestion|diarrhoea|diarrhea|nausea|vomit|constipation)\b/], categories: ['gastrointestinal', 'antacid', 'anti diarrhoeal', 'laxative'], medicines: ['oral rehydration', 'loperamide', 'antacid', 'omeprazole'] },
  { label: 'skin symptoms', patterns: [/\b(skin|rash|itch|burn|wound|cut|fungal|athlete)\b/], categories: ['dermatological', 'antifungal', 'antiseptic'], medicines: ['hydrocortisone', 'clotrimazole', 'antiseptic'] },
];

function symptomMappingFor(term: string) {
  return symptomOtcMappings.find((mapping) => mapping.patterns.some((pattern) => pattern.test(term)));
}

function markExactMedicineMatches(rows: any[], terms: string[]): any[] {
  return rows.map((row) => {
    const med = normalizeSearchText(row.med_name);
    const variant = normalizeSearchText(medicineVariantLabel(row));
    const exact = terms.some((term) => {
      const normalizedTerm = normalizeSearchText(term);
      return med === normalizedTerm || variant === normalizedTerm || med.startsWith(`${normalizedTerm} `) || variantContainsAllTokens(row, normalizedTerm);
    });
    return { ...row, __exact: exact };
  });
}

/** Fast targeted medicine search — exact inventory variants first, then close medicine-name matches. */
async function searchMedicine(term: string) {
  const key = normalizeSearchText(term);
  const cacheKey = `medicine:${key}`;
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < SEARCH_TTL_MS) return hit.data;

  const terms = expandedMedicineSearchTerms(key);
  const filters = terms.map((term) => `med_name.ilike.%${term}%`).join(',');
  const { data, error } = await cachedSupabase()
    .from('active_pharmacy_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location,directions_link,strength,dosage_form,pack_size,category')
    .or(filters)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(100);
  if (error) { console.error('searchMedicine error:', error); return []; }
  const rows = dedupeAndRank(markExactMedicineMatches(data || [], terms));
  searchCache.set(cacheKey, { data: rows, ts: Date.now() });
  if (searchCache.size > 200) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  return rows;
}

async function searchSymptomOtcInventory(term: string) {
  const mapping = symptomMappingFor(term);
  if (!mapping) return { mapping: null, rows: [] as any[] };

  const cacheKey = `symptom:${mapping.label}`;
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < SEARCH_TTL_MS) return { mapping, rows: hit.data };

  const filters = [
    ...mapping.categories.map((category) => `category.ilike.%${category}%`),
    ...mapping.medicines.map((medicine) => `med_name.ilike.%${medicine}%`),
  ].join(',');

  const { data, error } = await cachedSupabase()
    .from('active_pharmacy_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location,directions_link,strength,dosage_form,pack_size,category')
    .or(filters)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(100);
  if (error) { console.error('searchSymptomOtcInventory error:', error); return { mapping, rows: [] as any[] }; }
  const rows = dedupeAndRank(data || []);
  searchCache.set(cacheKey, { data: rows, ts: Date.now() });
  return { mapping, rows };
}

async function processQuery(message: string, from: string = ''): Promise<string> {
  const msg = message.toLowerCase().trim();
  const session = await getSession(from);
  const lang = getLang(session);

  // Language switching
  if (/^setswana$/.test(msg)) {
    await updateSession(from, { language: 'tn' });
    return tn.lang_switch;
  }
  if (/^english$/.test(msg)) {
    await updateSession(from, { language: 'en' });
    return tn.lang_en;
  }

  // Greeting
  if (/^(hi|hello|hey|dumelang|dumela|thobela|lotsha)/.test(msg)) {
    if (lang === 'tn') return tn.greeting;
    return `🏥 *ChekaMeds — Medicine Stock Checker*\n\nDumelang! 👋 I can help you check medicine availability.\n\nSend me:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine name (e.g. "Metformin")\n📊 "status" for a full summary\n🆘 "critical" for urgent shortages\n💊 "prescription: Med1, Med2" to find a clinic with all meds\n🇧🇼 "setswana" to switch language`;
  }

  if (/^(test|testing|ok|yes|no|thanks|thank you)$/i.test(msg)) {
    return helpReply();
  }

  // ===== Session-based selection / payment handlers (must run BEFORE inventory fetch) =====
  // PAY flow supports either PAY after selection or PAY 1/PAY 2 directly from results.
  const payMatch = msg.match(/^pay(?:\s+([1-5]))?$/i);
  if (payMatch) {
    const idx = payMatch[1] ? parseInt(payMatch[1], 10) - 1 : -1;
    const selected = idx >= 0 ? session?.options?.[idx] : session?.selected;
    if (selected) {
      await setSession(from, { medicine: session?.medicine ?? null, options: session?.options ?? [], selected, language: lang });
      await recordOrderRequest(from, selected);
      return manualCollectionReply(selected);
    }
    return `💳 Please search for a medicine first, then reply with the item number or *PAY 1*.`;
  }

  // Numeric option selection (1-5 for search results)
  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const idx = parseInt(msg, 10) - 1;
    if (idx < 0 || idx >= session.options.length) {
      return `❌ Invalid selection.

Please reply with:
${session.options.map((_, i) => i + 1).join(' or ')}`;
    }
    const choice = session.options[idx];
    await setSession(from, { medicine: session.medicine, options: session.options, selected: choice, language: lang });
    return buildSelectionReply(choice);
  }

  // Lazy-load full inventory only for aggregate queries below
  const needsFullInventory = /^prescription[:\s]|critical|urgent|shortage|emergency|low|tlhaelo|status|summary|overview|report|kakaretso/.test(msg);
  const inventoryData: any[] = needsFullInventory ? await getInventoryData() : [];

  // Prescription matching
  if (/^prescription[:\s]/.test(msg)) {
    const rxPart = msg.replace(/^prescription[:\s]+/, '');
    const medicines = rxPart.split(/[,;]+/).map(m => m.trim()).filter(Boolean);
    
    if (medicines.length === 0) {
      return lang === 'tn' 
        ? '💊 Romela lenaane la ditlhare: "prescription: Metformin, Paracetamol"'
        : '💊 Send your list like: "prescription: Metformin, Paracetamol"';
    }

    // Group inventory by clinic
    const clinicMap: Record<string, any[]> = {};
    inventoryData.forEach((item: any) => {
      if (!clinicMap[item.clinic_name]) clinicMap[item.clinic_name] = [];
      clinicMap[item.clinic_name].push(item);
    });

    const results: { clinic: string; matched: string[]; missing: string[]; pct: number }[] = [];
    
    for (const [clinic, meds] of Object.entries(clinicMap)) {
      const matched: string[] = [];
      const missing: string[] = [];
      medicines.forEach(rx => {
        const found = meds.some(m => m.med_name.toLowerCase().includes(rx) && m.quantity > 0);
        if (found) matched.push(rx);
        else missing.push(rx);
      });
      if (matched.length > 0) {
        results.push({ clinic, matched, missing, pct: Math.round((matched.length / medicines.length) * 100) });
      }
    }

    results.sort((a, b) => b.pct - a.pct);

    if (results.length === 0) {
      return lang === 'tn'
        ? '😞 Ga go na kliniiki e e nang le ditlhare tseo.'
        : '😞 No clinic has any of those medicines in stock right now.';
    }

    let reply = lang === 'tn' ? `${tn.prescription_header}\n\n` : `💊 *Prescription Matching Results*\n\n`;
    reply += `🔍 Searched: ${medicines.join(', ')}\n\n`;

    results.slice(0, 5).forEach(r => {
      const icon = r.pct === 100 ? '✅' : '⚠️';
      reply += `${icon} *${r.clinic}* — ${r.pct}% match\n`;
      reply += `  ✓ Has: ${r.matched.join(', ')}\n`;
      if (r.missing.length > 0) reply += `  ✗ Missing: ${r.missing.join(', ')}\n`;
      reply += `\n`;
    });

    const fullMatch = results.find(r => r.pct === 100);
    if (fullMatch) {
      reply += `🎯 *Best option: ${fullMatch.clinic}* has ALL your medicines!`;
    } else {
      reply += `⚠️ No single clinic has everything. ${results[0].clinic} is the closest match.`;
    }

    return reply;
  }

  // Critical shortages
  if (/critical|urgent|shortage|emergency|low|tlhaelo/.test(msg)) {
    const critical = inventoryData.filter((i: any) => i.quantity < 20).sort((a: any, b: any) => a.quantity - b.quantity);
    if (critical.length === 0) return lang === 'tn' ? tn.no_critical : "✅ No critical shortages right now! All clinics are well-stocked.";
    let reply = lang === 'tn' 
      ? `${tn.critical_header} (${critical.length})*\n\n`
      : `🚨 *CRITICAL SHORTAGES (${critical.length} items)*\n\n`;
    critical.forEach((item: any) => {
      reply += `⚠️ *${item.med_name}* — ${item.quantity} units\n   📍 ${item.clinic_name}\n\n`;
    });
    reply += lang === 'tn' ? `_Data ya sebele go tswa mo database_` : `_Updated in real-time from database_`;
    return reply;
  }

  // Full status
  if (/status|summary|overview|report|kakaretso/.test(msg)) {
    const total = inventoryData.length;
    const critical = inventoryData.filter((i: any) => i.quantity < 20).length;
    const healthy = inventoryData.filter((i: any) => i.quantity >= 100).length;
    const depleting = inventoryData.filter((i: any) => i.trend === 'Depleting Fast').length;
    
    if (lang === 'tn') {
      return `${tn.status_header}*\n\n💊 Ditlhare tse di latedisiwang: ${total}\n✅ Setoko se se siameng (100+): ${healthy}\n⚠️ Tlhaelo e kgolo (<20): ${critical}\n📉 Di a fela ka bonako: ${depleting}\n\n_Romela leina la kliniiki kgotsa setlhare go bona dintlha._`;
    }
    return `📊 *ChekaMeds Stock Summary*\n\n💊 Medicines tracked: ${total}\n✅ Healthy stock (100+): ${healthy}\n⚠️ Critical (<20 units): ${critical}\n📉 Depleting fast: ${depleting}\n\n_Send a clinic or medicine name for details._`;
  }

  // Symptom query — map common symptoms to OTC categories, then search approved inventory.
  const symptomResults = await searchSymptomOtcInventory(msg);
  if (symptomResults.mapping && symptomResults.rows.length > 0) {
    const top = symptomResults.rows.slice(0, MAX_SEARCH_RESULTS).map((p: any) => ({
      clinic_name: p.clinic_name,
      location: isValidLocation(p.location) ? p.location.trim() : null,
      price_bwp: p.price_bwp != null ? Number(p.price_bwp) : null,
      quantity: Number(p.quantity),
      med_name: medicineVariantLabel(p) || p.med_name,
      directions_link: getDirectionsLink(p),
      strength: p.strength,
      dosage_form: p.dosage_form,
      pack_size: p.pack_size,
      category: p.category,
    }));
    await setSession(from, { medicine: message.trim(), options: top, language: lang });
    return buildSymptomSearchReply(symptomResults.mapping.label, top);
  }

  // Product search — targeted, cached query (no full-table scan, no AI)
  const medMatchesRaw = await searchMedicine(msg);

  if (medMatchesRaw.length > 0) {
    const unique = dedupeAndRank(medMatchesRaw);

    if (unique.length === 0) {
      return noResultReply(message);
    }

    const top = unique.slice(0, MAX_SEARCH_RESULTS).map((p: any) => ({
      clinic_name: p.clinic_name,
      location: isValidLocation(p.location) ? p.location.trim() : null,
      price_bwp: p.price_bwp != null ? Number(p.price_bwp) : null,
      quantity: Number(p.quantity),
      med_name: medicineVariantLabel(p) || p.med_name,
      directions_link: getDirectionsLink(p),
      strength: p.strength,
      dosage_form: p.dosage_form,
      pack_size: p.pack_size,
      category: p.category,
    }));

    await setSession(from, { medicine: message.trim(), options: top, language: lang });
    return buildMedicineSearchReply(message.trim(), top);
  }

  // Search by clinic name (targeted query), but still return inventory items.
  const { data: clinicRows } = await cachedSupabase()
    .from('active_pharmacy_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location,directions_link,strength,dosage_form,pack_size,category')
    .ilike('clinic_name', `%${msg}%`)
    .gt('quantity', 0)
    .limit(25);
  const clinicMatches = dedupeAndRank(clinicRows || []);
  if (clinicMatches.length > 0) {
    const top = clinicMatches.slice(0, MAX_SEARCH_RESULTS).map((p: any) => ({
      clinic_name: p.clinic_name,
      location: isValidLocation(p.location) ? p.location.trim() : null,
      price_bwp: p.price_bwp != null ? Number(p.price_bwp) : null,
      quantity: Number(p.quantity),
      med_name: medicineVariantLabel(p) || p.med_name,
      directions_link: getDirectionsLink(p),
      strength: p.strength,
      dosage_form: p.dosage_form,
      pack_size: p.pack_size,
      category: p.category,
    }));
    await setSession(from, { medicine: message.trim(), options: top, language: lang });
    return buildMedicineSearchReply(message.trim(), top);
  }

  await recordFailedSearch(from, message.trim());
  return noResultReply(message);
}

async function sendWhatsAppReply(to: string, message: string) {
  const instanceId = Deno.env.get('ULTRAMSG_INSTANCE_ID');
  const token = Deno.env.get('ULTRAMSG_TOKEN');

  if (!instanceId) throw new Error('ULTRAMSG_INSTANCE_ID is not configured');
  if (!token) throw new Error('ULTRAMSG_TOKEN is not configured');

  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, body: message }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`UltraMsg API failed [${response.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function logWebhook(entry: {
  source: string;
  from_number?: string;
  message_body?: string;
  reply_text?: string;
  response_status?: number;
  error_message?: string;
  raw_payload?: unknown;
}) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await supabase.from('whatsapp_webhook_logs').insert(entry);
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isTest = url.searchParams.get('test') === 'true';

  try {
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      let body: Record<string, any> = {};
      let rawText = '';

      if (contentType.includes('application/x-www-form-urlencoded')) {
        rawText = await req.text();
        const params = new URLSearchParams(rawText);
        body = Object.fromEntries(params.entries());
      } else {
        try {
          rawText = await req.text();
          body = rawText ? JSON.parse(rawText) : {};
        } catch {
          body = {};
        }
      }

      // UltraMsg can send either a flat body or a nested { data } payload.
      const payload = body?.data && typeof body.data === "object" ? body.data : body;
      const from = cleanPhone(String(payload.from || ""));
      const messageBody = String(payload.body || "");
      const source = isTest ? 'test' : 'incoming';

      console.log('Incoming WhatsApp message:', { from, messageBody, isTest });

      if (!from || !messageBody) {
        await logWebhook({
          source,
          from_number: from,
          message_body: messageBody,
          response_status: 200,
          error_message: 'no_message: missing from or body',
          raw_payload: body,
        });
        return new Response(JSON.stringify({ status: 'no_message' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Race the query against a 1s timer — if slow, send an interim "checking..." ping.
      const queryPromise = processQuery(messageBody, from);
      let interimSent = false;
      if (!isTest) {
        const interimTimer = setTimeout(() => {
          interimSent = true;
          sendWhatsAppReply(from, '🔎 Checking nearby pharmacies...').catch(
            (e) => console.error('interim send failed', e)
          );
        }, 1000);
        queryPromise.finally(() => clearTimeout(interimTimer));
      }
      const reply = await queryPromise;

      let sendError: string | undefined;
      if (!isTest) {
        try {
          await sendWhatsAppReply(from, reply);
        } catch (e) {
          sendError = e instanceof Error ? e.message : String(e);
        }
      }

      await logWebhook({
        source,
        from_number: from,
        message_body: messageBody,
        reply_text: reply,
        response_status: sendError ? 500 : 200,
        error_message: sendError,
        raw_payload: body,
      });

      if (sendError) {
        return new Response(JSON.stringify({ error: sendError, reply }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ status: isTest ? 'tested' : 'replied', to: from, reply }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const query = url.searchParams.get('query');
      const from = url.searchParams.get('from') || 'GET';
      if (query) {
        const reply = await processQuery(query, from);
        await logWebhook({
          source: 'test',
          from_number: from,
          message_body: query,
          reply_text: reply,
          response_status: 200,
        });
        return new Response(JSON.stringify({ reply }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ status: 'ok', message: 'ChekaMeds WhatsApp Webhook is active' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook({
      source: isTest ? 'test' : 'incoming',
      response_status: 500,
      error_message: errorMessage,
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
