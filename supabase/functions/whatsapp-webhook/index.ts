import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIV = "───────────────";

const KNOWN_LOCATIONS = [
  "jwaneng",
  "gaborone",
  "francistown",
  "maun",
  "kasane",
  "palapye",
  "serowe",
  "lobatse",
  "kanye",
  "molepolole",
  "tlokweng",
  "mogoditshane",
  "ramotswa",
  "orapa",
  "letlhakane",
  "selebi phikwe",
  "selibe phikwe",
  "ghanzi",
  "tsabong",
  "hukuntsi",
  "shakawe",
  "gumare",
  "masunga",
];

const LOCATION_NUMBER_MAP: Record<string, string> = {
  "1": "jwaneng",
  "2": "gaborone",
  "3": "",
};

const NON_MEDICINE_WORDS = [
  "gold plated",
  "regular gold",
  "necklace",
  "bracelet",
  "earring",
  "earrings",
  "perfume",
  "hair piece",
  "hairpiece",
  "body spray",
  "toy",
  "watch",
];

const JUNK_SEARCH_WORDS = [
  "google",
  "facebook",
  "youtube",
  "instagram",
  "tiktok",
  "gmail",
  "whatsapp",
  "website",
  "url",
  "link",
  "login",
  "password",
];

type Row = {
  clinic_name: string;
  med_name: string;
  quantity: number;
  price_bwp: number | null;
  location?: string | null;
  directions_link?: string | null;
  contact?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  search_tokens?: string | null;
  approved?: boolean | null;
};

type SessionOption = {
  clinic_name: string;
  med_name: string;
  quantity: number;
  price_bwp: number | null;
  location: string | null;
  directions_link?: string | null;
  contact?: string | null;
};

type SessionData = {
  medicine?: string;
  options?: SessionOption[];
  selected?: any;
};

type NativeWhatsAppPayload = {
  type: "text" | "button" | "list";
  text?: string;
  buttons?: Array<{ id: string; text: string }>;
  listTitle?: string;
  listButtonText?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
};

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function cleanText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPhone(raw: string) {
  let phone = String(raw || "")
    .replace("@c.us", "")
    .replace("@s.whatsapp.net", "")
    .replace(/^\+/, "")
    .replace(/[^0-9]/g, "");

  if (phone.length === 8) phone = `267${phone}`;
  if (phone.length === 10 && phone.startsWith("0")) phone = `267${phone.slice(1)}`;

  return phone;
}

function stripSearchNoise(value: string) {
  return cleanText(value)
    .replace(
      /\b(please|pls|plz|find|search|check|stock|stok|stork|sotir|available|availability|avail|medicine|medication|meds|drug|tablet|tablets|tab|tabs|capsule|capsules|syrup|cream|ointment|price|need|looking|for|do|you|have|where|can|i|get|is|there|near|me)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMedicine(message: string) {
  let text = stripSearchNoise(message);

  const corrections: Record<string, string> = {
    panado: "paracetamol",
    panadol: "paracetamol",
    panadoo: "paracetamol",
    panodo: "paracetamol",
    panadole: "paracetamol",
    paracetmol: "paracetamol",
    parecetamol: "paracetamol",
    parasetamol: "paracetamol",
    paracitamol: "paracetamol",
    paracet: "paracetamol",
    parecet: "paracetamol",
    brufen: "ibuprofen",
    ibrufen: "ibuprofen",
    ibrofen: "ibuprofen",
    ibuprofin: "ibuprofen",
    ibuprofane: "ibuprofen",
    amoxil: "amoxicillin",
    amoxilin: "amoxicillin",
    amoxycillin: "amoxicillin",
    amoxy: "amoxicillin",
    allergex: "chlorpheniramine",
    alergex: "chlorpheniramine",
    allegex: "chlorpheniramine",
    allejex: "chlorpheniramine",
    disprin: "aspirin",
    asprin: "aspirin",
    cetrezine: "cetirizine",
    cetrizine: "cetirizine",
    citrizine: "cetirizine",
    omperazole: "omeprazole",
    esomperazole: "esomeprazole",
    esomep: "esomeprazole",
    citrosoda: "citro soda",
    canesten: "clotrimazole",
    candid: "clotrimazole",
    gaviscon: "sodium alginate",
    gavison: "sodium alginate",
    graviscon: "sodium alginate",
    metfomin: "metformin",
    metformine: "metformin",
    losaten: "losartan",
    losartin: "losartan",
    amlodipin: "amlodipine",
    amlodipene: "amlodipine",
    atovastatin: "atorvastatin",
    atorva: "atorvastatin",
    azitromycin: "azithromycin",
    zithromax: "azithromycin",
    cipro: "ciprofloxacin",
    ciprofloxacine: "ciprofloxacin",
    doxy: "doxycycline",
    declofenac: "diclofenac",
    voltaren: "diclofenac",
    hydrocordisone: "hydrocortisone",
    ventolin: "salbutamol",
    salbutomol: "salbutamol",
    insuline: "insulin",
    coartem: "artemether lumefantrine",
    lumartem: "artemether lumefantrine",
  };

  if (corrections[text]) return corrections[text];

  for (const [wrong, right] of Object.entries(corrections)) {
    text = text.replace(new RegExp(`\\b${wrong}\\b`, "g"), right);
  }

  return text.replace(/\s+/g, " ").trim();
}

function looksLikeJunkSearch(query: string) {
  const q = stripSearchNoise(query);
  if (!q) return true;
  if (/^https?:\/\//.test(q)) return true;
  if (JUNK_SEARCH_WORDS.some((bad) => q === bad || q.includes(bad))) return true;
  if (NON_MEDICINE_WORDS.some((bad) => q.includes(bad))) return true;
  if (q.length <= 1) return true;
  return false;
}

function extractLocation(message: string) {
  const text = cleanText(message);
  return KNOWN_LOCATIONS.find((location) => text.includes(location)) || "";
}

function removeLocation(message: string, location: string) {
  let text = cleanText(message);
  if (!location) return text;
  text = text.replace(new RegExp(`\\b${location}\\b`, "g"), " ");
  text = text.replace(/\bnear me\b/g, " ");
  text = text.replace(/\bin\b/g, " ");
  text = text.replace(/\bat\b/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

function prettyLocation(location: string) {
  if (!location) return "All Botswana";
  return location
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasRealLocation(location?: string | null) {
  const value = cleanText(location);
  return value !== "" && value !== "botswana" && value !== "unknown" && value !== "not listed" && value !== "n a";
}

function realDirections(link?: string | null) {
  const value = String(link || "").trim();
  const lower = value.toLowerCase();
  if (!/^https:\/\//i.test(value)) return "";
  if (lower.includes("example") || lower.includes("placeholder") || lower.includes("fake") || lower.includes("test")) return "";
  return value;
}

function isNonMedicine(row: Row) {
  const medicine = cleanText(row.med_name);
  return NON_MEDICINE_WORDS.some((bad) => medicine.includes(bad));
}

function isProductionRow(row: Row) {
  const clinic = cleanText(row.clinic_name);
  const medicine = cleanText(row.med_name);
  if (!clinic || !medicine) return false;
  if (clinic.includes("chekameds admin")) return false;
  if (["demo", "test", "sample", "mock", "trial"].some((bad) => clinic.includes(bad))) return false;
  if (row.approved === false) return false;
  if (isNonMedicine(row)) return false;
  return Number(row.quantity) > 0;
}

function medicineText(row: Row) {
  return cleanText([
    row.med_name,
    row.generic_name,
    row.brand_name,
    row.strength,
    row.dosage_form,
    row.search_tokens,
  ].filter(Boolean).join(" "));
}

function locationText(row: Row) {
  return cleanText([row.location, row.clinic_name].filter(Boolean).join(" "));
}

function uniqueTerms(values: string[]) {
  const terms = new Set<string>();
  for (const value of values) {
    const cleaned = stripSearchNoise(value);
    if (!cleaned) continue;
    terms.add(cleaned);
    cleaned.split(" ").filter((part) => part.length >= 3).forEach((part) => terms.add(part));
  }
  return Array.from(terms).slice(0, 60);
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }

  return previous[b.length];
}

function similarity(a: string, b: string) {
  const left = cleanText(a);
  const right = cleanText(b);
  if (!left || !right) return 0;
  const maxLen = Math.max(left.length, right.length);
  return maxLen === 0 ? 0 : 1 - levenshtein(left, right) / maxLen;
}

async function expandedMedicineTerms(query: string) {
  const normalized = normalizeMedicine(query);
  const terms = [query, normalized];

  try {
    const { data } = await db()
      .from("medicine_aliases")
      .select("alias, canonical_name")
      .limit(2000);

    const q = cleanText(normalized);
    for (const item of data || []) {
      const alias = cleanText((item as any).alias || "");
      const canonical = cleanText((item as any).canonical_name || "");
      if (!alias || !canonical) continue;
      if (alias.includes(q) || canonical.includes(q) || q.includes(alias) || q.includes(canonical)) {
        terms.push(alias, canonical);
      }
    }
  } catch (_) {}

  const symptom = cleanText(query);
  if (/\b(flu|cold|fever|temperature|headache|pain)\b/.test(symptom)) {
    terms.push("paracetamol", "ibuprofen", "cold", "flu");
  }
  if (/\b(heartburn|reflux|acid|ulcer)\b/.test(symptom)) {
    terms.push("omeprazole", "esomeprazole", "antacid");
  }
  if (/\b(allergy|allergies|rash|itch|itching)\b/.test(symptom)) {
    terms.push("allergex", "cetirizine", "chlorpheniramine", "loratadine");
  }
  if (/\b(cough|throat)\b/.test(symptom)) {
    terms.push("cough", "syrup", "lozenges");
  }
  if (/\b(diarrhea|diarrhoea|stomach|vomit|nausea)\b/.test(symptom)) {
    terms.push("oral rehydration", "diarrhoea", "antacid");
  }

  return uniqueTerms(terms);
}

function bestFuzzyMedicineScore(row: Row, terms: string[]) {
  const candidates = [row.med_name, row.generic_name, row.brand_name]
    .filter(Boolean)
    .flatMap((value) => {
      const cleaned = cleanText(value);
      return [cleaned, ...cleaned.split(" ").filter((part) => part.length >= 4)];
    });

  let best = 0;
  for (const term of terms.map(cleanText).filter((t) => t.length >= 4)) {
    for (const candidate of candidates) {
      const sim = similarity(term, candidate);
      if (sim > best) best = sim;
    }
  }

  return best;
}

function scoreRow(row: Row, terms: string[], wantedLocation: string) {
  const med = cleanText(row.med_name);
  const searchable = medicineText(row);
  let score = 0;

  for (const term of terms.map(cleanText).filter(Boolean)) {
    if (med === term) score += 360;
    if (med.startsWith(term)) score += 210;
    if (searchable.includes(term)) score += 140;

    for (const part of term.split(" ").filter((p) => p.length >= 3)) {
      if (searchable.includes(part)) score += 28;
    }
  }

  const fuzzy = bestFuzzyMedicineScore(row, terms);
  if (fuzzy >= 0.92) score += 180;
  else if (fuzzy >= 0.84) score += 115;
  else if (fuzzy >= 0.76) score += 65;

  if (wantedLocation && locationText(row).includes(wantedLocation)) score += 500;
  if (hasRealLocation(row.location)) score += 12;
  if (realDirections(row.directions_link)) score += 8;
  if (row.price_bwp != null) score += 8;
  score += Math.min(Number(row.quantity) || 0, 50) / 10;

  return score;
}

function diversifyByPharmacy(scoredRows: { row: Row; score: number }[], max = 5) {
  const buckets = new Map<string, Row[]>();
  const clinicOrder: string[] = [];
  const seen = new Set<string>();

  for (const item of scoredRows) {
    const row = item.row;
    const clinic = cleanText(row.clinic_name || "unknown");
    const key = cleanText(`${row.clinic_name}|${row.med_name}|${row.strength || ""}|${row.location || ""}`);
    if (!clinic || seen.has(key)) continue;
    seen.add(key);

    if (!buckets.has(clinic)) {
      buckets.set(clinic, []);
      clinicOrder.push(clinic);
    }
    buckets.get(clinic)!.push(row);
  }

  const output: Row[] = [];
  for (let depth = 0; output.length < max; depth++) {
    let added = false;
    for (const clinic of clinicOrder) {
      const row = buckets.get(clinic)?.[depth];
      if (row && output.length < max) {
        output.push(row);
        added = true;
      }
    }
    if (!added) break;
  }
  return output;
}

async function loadInventoryRows() {
  let rows: Row[] = [];

  try {
    const { data, error } = await db()
      .from("active_pharmacy_inventory")
      .select("clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens")
      .gt("quantity", 0)
      .limit(5000);

    if (error) throw error;
    rows = [...rows, ...((data || []) as Row[])];
  } catch (e) {
    console.error("active_pharmacy_inventory load failed", e);
  }

  try {
    const { data, error } = await db()
      .from("clinic_inventory")
      .select("clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens")
      .gt("quantity", 0)
      .neq("clinic_name", "ChekaMeds Admin")
      .limit(5000);

    if (error) throw error;
    rows = [...rows, ...((data || []) as Row[])];
  } catch (e) {
    console.error("clinic_inventory load failed", e);
  }

  return rows;
}

async function searchStock(query: string, wantedLocation: string) {
  const terms = await expandedMedicineTerms(query);
  const rows = await loadInventoryRows();

  const scored = rows
    .filter(isProductionRow)
    .filter((row) => !wantedLocation || locationText(row).includes(wantedLocation))
    .map((row) => ({ row, score: scoreRow(row, terms, wantedLocation) }))
    .filter((item) => item.score >= 45)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.row.clinic_name || "").localeCompare(String(b.row.clinic_name || ""));
    });

  return { rows: diversifyByPharmacy(scored, 5), terms };
}

async function getSession(phone: string): Promise<SessionData | null> {
  try {
    const { data } = await db()
      .from("whatsapp_sessions")
      .select("*")
      .eq("from_number", cleanPhone(phone))
      .maybeSingle();

    if (!data) return null;

    return {
      medicine: data.medicine || "",
      options: Array.isArray(data.options) ? data.options : [],
      selected: data.selected || null,
    };
  } catch (_) {
    return null;
  }
}

async function saveSession(phone: string, data: SessionData) {
  try {
    await db().from("whatsapp_sessions").upsert(
      {
        from_number: cleanPhone(phone),
        medicine: data.medicine || "",
        options: (data.options || []) as any,
        selected: (data.selected || null) as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "from_number" },
    );
  } catch (e) {
    console.error("session save failed", e);
  }
}

function price(value: number | null | undefined) {
  return value != null ? `P${Number(value).toFixed(2)}` : "Price unavailable";
}

function toOption(row: Row): SessionOption {
  return {
    clinic_name: row.clinic_name,
    med_name: row.med_name,
    quantity: Number(row.quantity),
    price_bwp: row.price_bwp == null ? null : Number(row.price_bwp),
    location: row.location || null,
    directions_link: realDirections(row.directions_link) || null,
    contact: row.contact || null,
  };
}

function locationFromReply(message: string) {
  const text = cleanText(message);
  if (LOCATION_NUMBER_MAP[text] !== undefined) return LOCATION_NUMBER_MAP[text];
  if (text.includes("all botswana") || text === "botswana" || text === "all" || text === "search all botswana") return "";
  if (text.startsWith("loc_")) {
    const locKey = text.replace("loc_", "");
    return locKey === "all" ? "" : locKey;
  }
  return extractLocation(message);
}

function promptForMedicine(message?: string): NativeWhatsAppPayload {
  const prefix = message ? `${message}\n\n` : "";
  return {
    type: "button",
    text: `${prefix}💊 *Search Stock*\n\nType the medicine, brand, or generic name.\n\nExamples:\n*Panado*\n*Paracetamol*\n*Amoxicillin*\n*Esomeprazole*`,
    buttons: [
      { id: "video_consult", text: "Consult Doctor" },
    ],
  };
}

function formatWelcomeMenu(): NativeWhatsAppPayload {
  return {
    type: "button",
    text: `👋 *Welcome to ChekaMeds*\n\nFind listed medicine availability in pharmacies near you.\n\n${DIV}\n\n📝 *How to search:*\nType the medicine name directly.\n\nExamples:\n*panado*\n*paracetmol*\n*amoxilin gaborone*\n*esomep jwaneng*\n\nChekaMeds will correct common spelling mistakes and show close stock matches.`,
    buttons: [
      { id: "find_medicine", text: "Search Stock" },
      { id: "video_consult", text: "Consult Doctor" },
    ],
  };
}

async function processMessage(message: string, phone: string): Promise<NativeWhatsAppPayload> {
  const text = cleanText(message);
  const session = await getSession(phone);
  const pendingLocation = session?.selected?.status === "awaiting_location";

  if (/^(hi|hello|hey|help|menu|start|dumelang|dumela|0)$/.test(text)) {
    return formatWelcomeMenu();
  }

  if (/^(video consult|consult|doctor|consult doctor|online consultation|online consult|video)$/.test(text) || text === "video_consult") {
    return {
      type: "button",
      text: `🩺 *Book an Online Video Consultation*\n\nSpeak to a clinician from your phone.\n\n🔗 Start here:\nhttps://www.chekameds.co.bw/consultant`,
      buttons: [
        { id: "find_medicine", text: "Search Stock" },
      ],
    };
  }

  if (text === "find_medicine" || text === "search" || text === "stock" || text === "search stock") {
    return promptForMedicine();
  }

  if (/^(change location|location|change town|town)$/.test(text) || text === "change_location") {
    if (!session?.medicine) {
      return promptForMedicine("Please send the medicine name first.");
    }

    await saveSession(phone, {
      medicine: session.medicine,
      options: [],
      selected: { status: "awaiting_location", medicine: session.medicine },
    });

    return {
      type: "button",
      text: `📍 *Change Search Area*\n\nMedicine: *${session.medicine}*\n\nChoose a town below, search all Botswana, or type your town directly.`,
      buttons: [
        { id: "loc_jwaneng", text: "Jwaneng" },
        { id: "loc_gaborone", text: "Gaborone" },
        { id: "loc_all", text: "All Botswana" },
      ],
    };
  }

  if (/^(store|pay at store|cash|cash payment|reserve|reserve pickup)$/.test(text)) {
    if (!session?.selected || session.selected.status === "awaiting_location") {
      return { type: "text", text: "Please search first and select a stock item." };
    }
    return { type: "text", text: await reserve(phone, session.selected as SessionOption) };
  }

  if (/^(directions|direction|map|where|send location)$/.test(text)) {
    if (!session?.selected || session.selected.status === "awaiting_location") {
      return { type: "text", text: "Please choose an option from your search first." };
    }
    const selected = session.selected as SessionOption;
    const maps = realDirections(selected.directions_link);
    return {
      type: "text",
      text: `🧭 *Directions to Pharmacy*\n\n🏥 *${selected.clinic_name}*\n📍 Location: ${hasRealLocation(selected.location) ? selected.location : "Listed"}\n\n${maps ? `🗺️ View Map: ${maps}` : "Directions link not supplied by pharmacy."}`,
    };
  }

  let processedInput = message;
  if (text.startsWith("loc_")) {
    const locKey = text.replace("loc_", "");
    processedInput = locKey === "all" ? "all botswana" : locKey;
  }

  if (pendingLocation) {
    const medicine = session?.selected?.medicine || session?.medicine || "";
    const selectedLocation = locationFromReply(processedInput);
    return await runMedicineSearch(phone, medicine, selectedLocation);
  }

  if ((/^[1-5]$/.test(text) || text.startsWith("item_")) && session?.options?.length) {
    const indexStr = text.startsWith("item_") ? text.replace("item_", "") : text;
    const selected = session.options[Number(indexStr) - 1];

    if (!selected) {
      return { type: "text", text: "Invalid selection. Please pick from the stock list." };
    }

    await saveSession(phone, {
      medicine: session.medicine || selected.med_name,
      options: session.options,
      selected,
    });

    const dirLink = realDirections(selected.directions_link);

    return {
      type: "button",
      text: `✅ *Stock Selected*\n\n💊 *${selected.med_name}*\n🏥 Pharmacy: *${selected.clinic_name}*\n💰 Price: *${price(selected.price_bwp)}*\n📍 Area: ${hasRealLocation(selected.location) ? selected.location : "Listed"}\n📦 Status: In stock\n\n${dirLink ? `📍 Map: ${dirLink}\n` : ""}${DIV}\nChoose what you want to do next:`,
      buttons: [
        { id: "store", text: "Reserve Pickup" },
        { id: "change_location", text: "Change Town" },
      ],
    };
  }

  const explicitLocation = extractLocation(message);
  const rawMedicine = removeLocation(message, explicitLocation);
  const medicine = normalizeMedicine(rawMedicine || message);

  if (looksLikeJunkSearch(medicine)) {
    return promptForMedicine(`I could not identify a medicine name from *${message}*.`);
  }

  return await runMedicineSearch(phone, medicine, explicitLocation);
}

async function runMedicineSearch(phone: string, medicine: string, location: string): Promise<NativeWhatsAppPayload> {
  const normalizedMedicine = normalizeMedicine(medicine);
  const { rows } = await searchStock(normalizedMedicine, location);

  if (!rows.length && location) {
    const all = await searchStock(normalizedMedicine, "");
    if (all.rows.length) {
      const options = all.rows.map(toOption);
      await saveSession(phone, { medicine: normalizedMedicine, options, selected: null });
      return generateListMenu(normalizedMedicine, "", all.rows, `No stock found in ${prettyLocation(location)}. Showing close matches across Botswana:`);
    }
  }

  if (!rows.length) {
    try {
      await db().from("failed_searches").insert({
        query: normalizedMedicine,
        source: "whatsapp",
        user_phone: cleanPhone(phone),
      });
    } catch (_) {}

    return {
      type: "button",
      text: `🔎 *No Stock Listed Found*\n\nNo active stock listings matched *${normalizedMedicine}*.\n\nTry a brand, generic name, or a shorter spelling.\n\nExamples:\n*panado*\n*paracetamol*\n*esomeprazole*\n*amoxilin*`,
      buttons: [
        { id: "find_medicine", text: "Search Again" },
        { id: "video_consult", text: "Consult Doctor" },
      ],
    };
  }

  const options = rows.map(toOption);
  await saveSession(phone, { medicine: normalizedMedicine, options, selected: null });
  return generateListMenu(normalizedMedicine, location, rows);
}

function generateListMenu(query: string, location: string, rows: Row[], customHeader?: string): NativeWhatsAppPayload {
  const sectionRows = rows.map((row, i) => {
    const itemLabel = `${row.med_name}`.substring(0, 24);
    const locLabel = `${row.clinic_name} • ${price(row.price_bwp)}`.substring(0, 72);
    return {
      id: `item_${i + 1}`,
      title: itemLabel,
      description: locLabel,
    };
  });

  return {
    type: "list",
    text: customHeader || `💊 *ChekaMeds Stock Results*\n\nShowing close stock matches for *${query}* in *${prettyLocation(location)}*.\n\n👇 Reply with a number below to choose an item and view details or reserve.`,
    listTitle: "Select Medication",
    listButtonText: "View Stock",
    sections: [
      {
        title: "Available Stock",
        rows: sectionRows,
      },
    ],
  };
}

async function facilityWhatsAppNumber(clinicName: string) {
  try {
    const { data } = await db()
      .from("chekameds_facilities")
      .select("phone_whatsapp")
      .ilike("facility_name", `%${clinicName.trim()}%`)
      .not("phone_whatsapp", "is", null)
      .limit(1)
      .maybeSingle();
    return cleanPhone(String((data as any)?.phone_whatsapp || ""));
  } catch (_) {
    return "";
  }
}

async function reserve(phone: string, selected: SessionOption) {
  const customerPhone = cleanPhone(phone);

  let pharmacyPhone = cleanPhone(String(selected.contact || ""));
  if (pharmacyPhone.length < 11) {
    pharmacyPhone = await facilityWhatsAppNumber(selected.clinic_name);
  }

  let pharmacyNotified = false;
  if (pharmacyPhone.length >= 11 && pharmacyPhone !== customerPhone) {
    try {
      await sendWhatsApp(pharmacyPhone, {
        type: "text",
        text: `🔔 *New ChekaMeds Reservation*\n\n💊 Medicine: *${selected.med_name}*\n💰 Price: *${price(selected.price_bwp)}*\n👤 Customer WhatsApp: +${customerPhone}\n🏥 Facility: *${selected.clinic_name}*\n\n${DIV}\nThe customer plans to collect and pay at the counter. Please prepare the item and message the customer to confirm availability.`,
      });
      pharmacyNotified = true;
    } catch (e) {
      console.error("pharmacy reservation notify failed", e);
    }
  }

  const notifyNote = pharmacyNotified
    ? `Pharmacy notified on WhatsApp at ${pharmacyPhone}.`
    : pharmacyPhone
      ? `Pharmacy WhatsApp notify FAILED for ${pharmacyPhone}.`
      : "No pharmacy WhatsApp number on file - not notified.";

  try {
    await db().from("order_requests").insert({
      from_number: customerPhone,
      medicine: selected.med_name,
      pharmacy: selected.clinic_name,
      amount: selected.price_bwp == null ? null : Number(selected.price_bwp),
      payment_status: "pending_store_payment",
      status: "reserved",
      notes: `WhatsApp reservation created via interactive menus for ${selected.med_name}. ${notifyNote}`,
    });
  } catch (e) {
    console.error(e);
  }

  const mapLink = realDirections(selected.directions_link);

  return `🏪 *Reservation Recorded*\n\n💊 Item: *${selected.med_name}*\n🏥 Facility: *${selected.clinic_name}*\n💰 Amount: *${price(selected.price_bwp)}*\n\n${mapLink ? `🗺️ Directions: ${mapLink}\n` : ""}${pharmacyNotified ? "✅ The pharmacy has been notified to prepare your item.\n" : ""}Please pay physically at the pharmacy when collecting. Final availability should still be confirmed by the pharmacy.`;
}

function payloadToText(payload: NativeWhatsAppPayload): string {
  if (payload.type === "text") {
    return payload.text || "";
  }

  if (payload.type === "button") {
    const hints = (payload.buttons || [])
      .map((button) => `▪️ *${button.text}*`)
      .join("\n");
    return `${payload.text || ""}${hints ? `\n\n👇 Reply with one of:\n${hints}` : ""}`;
  }

  if (payload.type === "list") {
    const rows = (payload.sections || []).flatMap((section) => section.rows);
    const lines = rows
      .map((row, i) => `*${i + 1}.* ${row.title}${row.description ? `\n    ${row.description}` : ""}`)
      .join("\n");
    return `${payload.text || ""}\n\n${lines}\n\n👇 Reply with a number (1-${rows.length}) to select.`;
  }

  return payload.text || "";
}

async function sendWhatsApp(to: string, payload: NativeWhatsAppPayload) {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  if (!instanceId || !token) throw new Error("UltraMsg configurations missing");

  const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      to: cleanPhone(to),
      body: payloadToText(payload),
      priority: 10,
    }),
  });

  const data = await response.json();
  if (!response.ok || data?.sent === "false" || data?.error) {
    throw new Error(`UltraMsg API transmission failure: ${JSON.stringify(data)}`);
  }
}

async function logWebhook(entry: any) {
  try {
    await db().from("whatsapp_webhook_logs").insert(entry);
  } catch (_) {}

  try {
    await db().from("whatsapp_webhook_events").insert({
      provider: "ultramsg",
      from_phone: entry.from_number || null,
      message_text: entry.message_body || null,
      message_type: "chat",
      raw_payload: entry.raw_payload || {},
      status: entry.error_message ? "error" : "received",
      error: entry.error_message || null,
    });
  } catch (_) {}
}

function extractInteractiveMessage(payload: any) {
  return String(
    payload.body ||
      payload.message ||
      payload.text ||
      payload.list_reply?.id ||
      payload.button_reply?.id ||
      payload.interactive?.list_reply?.id ||
      payload.interactive?.button_reply?.id ||
      payload.data?.list_reply?.id ||
      payload.data?.button_reply?.id ||
      "",
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  try {
    if (req.method === "GET") {
      const query = url.searchParams.get("query");
      if (!query) {
        return new Response(JSON.stringify({ status: "ok", message: "ChekaMeds WhatsApp webhook active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const outPayload = await processMessage(query, "GET");
      return new Response(JSON.stringify({ reply: outPayload.text || outPayload }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.text();
    let body: any = {};

    try {
      body = req.headers.get("content-type")?.includes("x-www-form-urlencoded")
        ? Object.fromEntries(new URLSearchParams(raw).entries())
        : JSON.parse(raw || "{}");
    } catch (_) {
      body = {};
    }

    const payload = body?.data && typeof body.data === "object" ? body.data : body;
    const from = cleanPhone(String(payload.from || payload.sender || payload.author || payload.chatId || ""));
    const messageBody = extractInteractiveMessage(payload);

    if (!from || !messageBody) {
      await logWebhook({
        source: isTest ? "test" : "incoming",
        from_number: from,
        message_body: messageBody,
        response_status: 200,
        error_message: "no_message",
        raw_payload: body,
      });
      return new Response(JSON.stringify({ status: "no_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const replyPayload = await processMessage(messageBody, from);
    let sendError = "";

    if (!isTest) {
      try {
        await sendWhatsApp(from, replyPayload);
      } catch (e) {
        sendError = e instanceof Error ? e.message : String(e);
      }
    }

    await logWebhook({
      source: isTest ? "test" : "incoming",
      from_number: from,
      message_body: messageBody,
      reply_text: JSON.stringify(replyPayload),
      response_status: sendError ? 500 : 200,
      error_message: sendError || null,
      raw_payload: body,
    });

    return new Response(JSON.stringify({ status: sendError ? "send_failed" : "replied", to: from, reply: isTest ? replyPayload : undefined, error: sendError || undefined }), {
      status: sendError ? 500 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logWebhook({ source: isTest ? "test" : "incoming", response_status: 500, error_message: error });
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
