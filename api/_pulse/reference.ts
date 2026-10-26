/* ChekaMeds Pulse – reference data: medicine signal groups and Botswana towns. */

export type Group = {
  id: string;
  label: string;
  /** Lower-case keywords / regex fragments matched against the search text. */
  match: RegExp;
  /** What a rise in this group may indicate. */
  signal: string;
  /** Proportionate preventive action and the role responsible for it. */
  action: string;
  owner: string;
  /** Weather sensitivity used to explain an alert. */
  climate?: 'rain' | 'heat' | 'cold';
};

export const GROUPS: Group[] = [
  {
    id: 'malaria', label: 'Antimalarials', climate: 'rain',
    match: /(coartem|artemether|lumefantrine|artesunate|quinine|malar|primaquine|chloroquine|doxycycline.*malar|malanil|atovaquone)/,
    signal: 'Possible rise in malaria cases or travel to malaria areas',
    action: 'Alert the district malaria focal person; check rapid test and ACT stock at clinics and pharmacies in the area.',
    owner: 'District Health Management Team (DHMT)',
  },
  {
    id: 'diarrhoea', label: 'ORS & diarrhoea', climate: 'heat',
    match: /(\bors\b|oral rehydration|rehydrat|electrolyte|dioralyte|zinc|loperamide|imodium|diarr|metronidazole|flagyl|entero)/,
    signal: 'Possible diarrhoeal disease cluster or water-quality problem',
    action: 'Notify environmental health to check water and sanitation; make sure ORS and zinc are stocked locally.',
    owner: 'DHMT Environmental Health',
  },
  {
    id: 'respiratory', label: 'Cough, cold & flu', climate: 'cold',
    match: /(cough|cold|flu|influenza|corenza|med-?lemon|sinus|decongest|bronch|throat|strepsil|lozenge|pseudoephedrine|phenylephrine|benylin|actifed|sinutab|mucolyt|bisolvon|ambroxol|bromhexine)/,
    signal: 'Possible respiratory illness wave (flu or other viral infection)',
    action: 'Share prevention messages; check flu-season staffing and stock of symptomatic medicines.',
    owner: 'DHMT Disease Surveillance',
  },
  {
    id: 'fever_pain', label: 'Fever & pain relief',
    match: /(paracetamol|panado|acetaminophen|ibuprofen|brufen|nurofen|aspirin|disprin|mefenamic|ponstan|diclofenac|voltaren|grand-?pa|myprodol|stopayne|naproxen|fever|headache|head pain|head paining|\bibu\b|painamol|genpayne|payne|pain ?kill|migraine)/,
    signal: 'General rise in fever or pain, often an early non-specific sign of infection',
    action: 'Watch together with malaria and respiratory signals; confirm with clinic attendance data.',
    owner: 'DHMT Disease Surveillance',
  },
  {
    id: 'antibiotics', label: 'Antibiotics',
    match: /(amoxicillin|augmentin|amoxyclav|azithromycin|zithromax|ciprofloxacin|cipro|doxycycline|cephalexin|cefuroxime|ceftriaxone|clarithromycin|erythromycin|flucloxacillin|penicillin|co-?trimoxazole|bactrim|nitrofurantoin|antibiotic)/,
    signal: 'Rising demand for antibiotics: bacterial infections, or misuse without prescriptions',
    action: 'Remind pharmacies about prescription-only rules; check stock of first-line antibiotics.',
    owner: 'BOMRA and pharmacies',
  },
  {
    id: 'allergy_asthma', label: 'Allergy & asthma', climate: 'heat',
    match: /(antihistamine|loratadine|clarityne|cetirizine|zyrtec|allergex|chlorphen|promethazine|phenergan|fexofenadine|telfast|salbutamol|ventolin|asthavent|inhaler|budesonide|beclomethasone|montelukast|asthma|allerg|allegex|aspelone|prednisolone|wheez)/,
    signal: 'Possible air-quality, dust or pollen problem',
    action: 'Check air-quality and dust readings; advise people with asthma; make sure inhalers are in stock.',
    owner: 'DHMT and Department of Meteorological Services',
  },
  {
    id: 'chronic', label: 'Chronic care (BP, diabetes, HIV)',
    match: /(metformin|glucophage|insulin|gliclazide|glibenclamide|amlodipine|enalapril|lisinopril|hydrochlorothiazide|losartan|atenolol|nifedipine|simvastatin|atorvastatin|captopril|furosemide|spironolactone|carvedilol|tamsulosin|warfarin|levothyrox|eltroxin|tenofovir|dolutegravir|efavirenz|lamivudine|\barv\b|tld|tle)/,
    signal: 'Patients struggling to find chronic medicines: a supply problem, not an outbreak',
    action: 'Flag to the supplier and Central Medical Stores; contact patients to avoid missed doses.',
    owner: 'Central Medical Stores (CMS) and pharmacies',
  },
  {
    id: 'skin_eye', label: 'Skin & eye infections', climate: 'heat',
    match: /(eye drop|chloramphenicol|conjunctiv|tobramycin|fucidin|fusidic|clotrimazole|canesten|miconazole|daktarin|hydrocortisone|betamethasone|calamine|scabies|benzyl benzoate|permethrin|acyclovir|aciclovir|rash|zam-?buk|acne|acnetane|isotretinoin|combigan|timolol|latanoprost|eczema|fungal)/,
    signal: 'Possible skin or eye infection cluster (e.g. conjunctivitis, scabies)',
    action: 'Alert school and clinic health teams in the area; check stock of eye drops and topical treatments.',
    owner: 'DHMT and school health',
  },
];

export const OTHER_GROUP = 'other';

export function groupFor(text: string): string {
  const t = (text || '').toLowerCase();
  for (const g of GROUPS) if (g.match.test(t)) return g.id;
  return OTHER_GROUP;
}

export type Town = { id: string; name: string; lat: number; lng: number; district: string; pop: number; north?: boolean; aliases?: string[] };

/* Suburbs and nearby villages fold into their main town so small numbers are pooled. */
export const TOWNS: Town[] = [
  { id: 'gaborone', name: 'Greater Gaborone', lat: -24.6282, lng: 25.9231, district: 'South-East', pop: 520000, aliases: ['gaborone', 'gabs', 'mogoditshane', 'tlokweng', 'gabane', 'mmopane', 'phakalane', 'broadhurst', 'g-west', 'game city', 'riverwalk', 'kgale', 'bontleng', 'naledi', 'white city', 'airport junction', 'sebele', 'mmamashia', 'oodi', 'metsimotlhabe', 'mmokolodi', 'kopong', 'tsholofelo', 'fairgrounds', 'fairground', 'block 10', 'block 8', 'block 9', 'block 6', 'extension'] },
  { id: 'francistown', name: 'Francistown', lat: -21.17, lng: 27.5078, district: 'North-East', pop: 105000, aliases: ['francistown', 'f/town', 'ftown', 'tonota', 'tati'] },
  { id: 'maun', name: 'Maun', lat: -19.9833, lng: 23.4167, district: 'Ngamiland', pop: 85000, north: true, aliases: ['maun', 'shakawe', 'gumare', 'sehithwa'] },
  { id: 'molepolole', name: 'Molepolole', lat: -24.4066, lng: 25.4951, district: 'Kweneng', pop: 75000, aliases: ['molepolole', 'thamaga', 'letlhakeng'] },
  { id: 'serowe', name: 'Serowe', lat: -22.3875, lng: 26.7108, district: 'Central', pop: 55000, aliases: ['serowe'] },
  { id: 'palapye', name: 'Palapye', lat: -22.5464, lng: 27.1251, district: 'Central', pop: 45000, aliases: ['palapye'] },
  { id: 'mahalapye', name: 'Mahalapye', lat: -23.1041, lng: 26.8142, district: 'Central', pop: 50000, aliases: ['mahalapye'] },
  { id: 'phikwe', name: 'Selebi-Phikwe', lat: -21.9786, lng: 27.8433, district: 'Central', pop: 55000, aliases: ['phikwe', 'selebi'] },
  { id: 'bobonong', name: 'Bobonong', lat: -21.9667, lng: 28.4333, district: 'Central', pop: 20000, aliases: ['bobonong'] },
  { id: 'kanye', name: 'Kanye', lat: -24.9667, lng: 25.3328, district: 'Southern', pop: 60000, aliases: ['kanye', 'moshupa'] },
  { id: 'goodhope', name: 'Goodhope', lat: -25.4667, lng: 25.4333, district: 'Southern', pop: 8000, aliases: ['goodhope', 'good hope'] },
  { id: 'jwaneng', name: 'Jwaneng', lat: -24.6017, lng: 24.7281, district: 'Southern', pop: 18000, aliases: ['jwaneng', 'sese'] },
  { id: 'lobatse', name: 'Lobatse', lat: -25.2244, lng: 25.6745, district: 'South-East', pop: 40000, aliases: ['lobatse', 'ramotswa', 'otse'] },
  { id: 'mochudi', name: 'Mochudi', lat: -24.4167, lng: 26.15, district: 'Kgatleng', pop: 50000, aliases: ['mochudi', 'pilane', 'bokaa'] },
  { id: 'kasane', name: 'Kasane', lat: -17.8167, lng: 25.15, district: 'Chobe', pop: 20000, north: true, aliases: ['kasane', 'kazungula', 'chobe'] },
  { id: 'letlhakane', name: 'Letlhakane & Orapa', lat: -21.4167, lng: 25.5833, district: 'Central', pop: 35000, aliases: ['letlhakane', 'orapa'] },
  { id: 'ghanzi', name: 'Ghanzi', lat: -21.6981, lng: 21.6458, district: 'Ghanzi', pop: 25000, aliases: ['ghanzi'] },
  { id: 'tsabong', name: 'Tsabong', lat: -26.05, lng: 22.45, district: 'Kgalagadi', pop: 15000, aliases: ['tsabong', 'hukuntsi'] },
];

export function townFor(location: string | null | undefined, lat?: number | null, lng?: number | null): string | null {
  const t = (location || '').toLowerCase();
  if (t) {
    for (const town of TOWNS) if ((town.aliases || [town.id]).some((a) => t.includes(a))) return town.id;
  }
  if (lat != null && lng != null && Math.abs(lat) > 1) {
    let best: Town | null = null; let bd = Infinity;
    for (const town of TOWNS) {
      const d = (town.lat - lat) ** 2 + ((town.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
      if (d < bd) { bd = d; best = town; }
    }
    if (best && Math.sqrt(bd) * 111 < 60) return best.id; // within ~60 km
  }
  return null;
}

/** Town of a stock listing. Chains often put head-office addresses on every branch's stock,
    so the branch name ("Pulse Pharmacy Maun") wins over the address. */
export function stockTownFor(clinicName: string | null | undefined, location: string | null | undefined): string | null {
  return townFor(clinicName) || townFor(location);
}

/** Town named inside free text (e.g. "panado jwaneng"), matched on whole words only,
    so "statin" never matches "tati" and "disease" never matches "sese". */
const TOWN_RX: [RegExp, string][] = TOWNS.flatMap((t) => (t.aliases || [t.id]).map((a) => [new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`), t.id] as [RegExp, string]));
export function textTownFor(text: string | null | undefined): string | null {
  const t = (text || '').toLowerCase();
  if (!t) return null;
  for (const [rx, id] of TOWN_RX) if (rx.test(t)) return id;
  return null;
}
