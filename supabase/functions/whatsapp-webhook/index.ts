import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = {
  clinic_name: string;
  med_name: string;
  quantity: number;
  price_bwp: number | null;
  location?: string | null;
  directions_link?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  search_tokens?: string | null;
  approved?: boolean | null;
  contact?: string | null;
};

type SessionOption = {
  clinic_name: string;
  location: string | null;
  price_bwp: number | null;
  quantity: number;
  med_name: string;
  directions_link?: string | null;
  contact?: string | null;
};

const cache = new Map<string, { rows: Row[]; terms: string[]; ts: number }>();
const DIV = "────────────────";

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function cleanText(v: string) {
  return (v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeMedicineInput(message: string) {
  let msg = cleanText(message);

  const corrections: Record<string, string> = {
    panadoo: "panado",
    panodo: "panado",
    "panodo tabs": "panado",
    panadol: "panado",
    panadole: "panado",
    "panado tabs": "panado",
    "panado tablet": "panado",
    paracetmol: "paracetamol",
    parecetamol: "paracetamol",
    parasetamol: "paracetamol",
    paracitamol: "paracetamol",
    ibuprofane: "ibuprofen",
    brufen: "ibuprofen",
    amoxilin: "amoxicillin",
    amoxycillin: "amoxicillin",
    amoxil: "amoxicillin",
    asprin: "aspirin",
    disprin: "aspirin",
    cetrezine: "cetirizine",
    cetrizine: "cetirizine",
    allegex: "allergex",
    allejex: "allergex",
    allergex: "chlorpheniramine",
  };

  if (corrections[msg]) return corrections[msg];

  for (const [wrong, correct] of Object.entries(corrections)) {
    msg = msg.replace(new RegExp(`\\b${wrong}\\b`, "g"), correct);
  }

  return msg;
}

function isSymptomMessage(message: string) {
  return /\b(i have|i feel|symptom|sick|not well|flu|cold|fever|headache|cough|pain|stomach|diarrhea|diarrhoea|allergy|rash|vomit|nausea)\b/i.test(message);
}

function symptomTerms(message: string) {
  const msg = cleanText(message);
  const terms = new Set<string>();

  if (/\b(flu|cold|fever|temperature)\b/.test(msg)) {
    ["paracetamol", "cold", "flu"].forEach((x) => terms.add(x));
  }

  if (/\b(headache|pain|body pain|toothache)\b/.test(msg)) {
    ["paracetamol", "ibuprofen", "pain"].forEach((x) => terms.add(x));
  }

  if (/\b(cough|throat)\b/.test(msg)) {
    ["cough", "syrup", "lozenges"].forEach((x) => terms.add(x));
  }

  if (/\b(stomach|diarrhea|diarrhoea|vomit|nausea)\b/.test(msg)) {
    ["oral rehydration", "diarrhoea", "antacid"].forEach((x) => terms.add(x));
  }

  if (/\b(allergy|allergies|rash|itch)\b/.test(msg)) {
    ["cetirizine", "loratadine", "allergy"].forEach((x) => terms.add(x));
  }

  return Array.from(terms);
}

function cleanPhone(raw: string) {
  let p = (raw || "")
    .replace("@c.us", "")
    .replace("@s.whatsapp.net", "")
    .replace(/^\+/, "")
    .replace(/[^0-9]/g, "");

  if (p.length === 8) p = `267${p}`;
  if (p.length === 10 && p.startsWith("0")) p = `267${p.slice(1)}`;

  return p;
}

function hasRealLocation(location?: string | null) {
  if (!location) return false;
  const value = cleanText(location);
  return (
    value !== "" &&
    value !== "n a" &&
    value !== "botswana" &&
    value !== "unknown" &&
    value !== "not listed"
  );
}

function realDirections(link?: string | null) {
  if (!link) return "";
  const value = link.trim();
  const lower = value.toLowerCase();

  if (!value) return "";
  if (!/^https:\/\//i.test(value)) return "";
  if (lower.includes("example")) return "";
  if (lower.includes("placeholder")) return "";
  if (lower.includes("fake")) return "";
  if (lower.includes("test")) return "";

  return value;
}

function isProductionRow(row: Row) {
  const clinic = cleanText(row.clinic_name || "");
  const medicine = cleanText(row.med_name || "");

  if (!clinic || !medicine) return false;
  if (clinic.includes("chekameds admin")) return false;
  if (["demo", "test", "sample", "mock", "trial"].some((bad) => clinic.includes(bad))) return false;
  if (row.approved === false) return false;

  return Number(row.quantity) > 0;
}

async function getAliases(q: string) {
  try {
    const { data } = await db()
      .from("medicine_aliases")
      .select("alias, canonical_name")
      .or(`alias.ilike.%${q}%,canonical_name.ilike.%${q}%`)
      .limit(12);

    return data || [];
  } catch {
    return [];
  }
}

async function saveSession(
  phone: string,
  medicine: string,
  options: SessionOption[],
  selected?: SessionOption
) {
  try {
    await db().from("whatsapp_sessions").upsert({
      from_number: cleanPhone(phone),
      medicine,
      options: options as any,
      selected: (selected || null) as any,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("session save failed", e);
  }
}

async function getSession(phone: string) {
  try {
    const { data } = await db()
      .from("whatsapp_sessions")
      .select("*")
      .eq("from_number", cleanPhone(phone))
      .maybeSingle();

    if (!data) return null;

    return data as {
      medicine: string;
      options: SessionOption[];
      selected?: SessionOption;
    };
  } catch {
    return null;
  }
}

function score(r: Row, terms: string[]) {
  const h = cleanText(
    [
      r.med_name,
      r.generic_name,
      r.brand_name,
      r.strength,
      r.dosage_form,
      r.search_tokens,
    ]
      .filter(Boolean)
      .join(" ")
  );

  let s = 0;

  for (const t of terms.map(cleanText).filter(Boolean)) {
    const m = cleanText(r.med_name);

    if (m === t) s += 150;
    if (m.startsWith(t)) s += 100;
    if (h.includes(t)) s += 60;

    for (const p of t.split(" ")) {
      if (p.length > 2 && h.includes(p)) s += 12;
    }
  }

  if (hasRealLocation(r.location)) s += 12;
  if (r.price_bwp != null) s += 8;

  s += Math.min(Number(r.quantity) || 0, 50) / 10;

  return s;
}

function dedupeInventoryItems(rows: Row[]) {
  const seen = new Set<string>();
  const out: Row[] = [];

  for (const row of rows) {
    const key = cleanText(
      `${row.med_name}|${row.clinic_name}|${row.location || ""}|${row.price_bwp ?? ""}`
    );

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(row);
  }

  return out;
}

async function searchStock(q: string, phone: string, forcedTerms: string[] = []) {
  const key = cleanText([q, ...forcedTerms].join(" "));
  const hit = cache.get(key);

  if (hit && Date.now() - hit.ts < 60000) return hit;

  const aliases = await getAliases(cleanText(q));

  const terms = Array.from(
    new Set(
      [
        cleanText(q),
        ...forcedTerms.map(cleanText),
        ...aliases.map((a: any) => cleanText(a.alias)),
        ...aliases.map((a: any) => cleanText(a.canonical_name)),
      ].filter(Boolean)
    )
  );

  const activeOrFilter = terms
    .flatMap((t) => [
      `med_name.ilike.%${t}%`,
      `generic_name.ilike.%${t}%`,
      `brand_name.ilike.%${t}%`,
      `search_tokens.ilike.%${t}%`,
    ])
    .join(",");

  const clinicOrFilter = terms
    .flatMap((t) => [
      `med_name.ilike.%${t}%`,
      `generic_name.ilike.%${t}%`,
      `brand_name.ilike.%${t}%`,
      `search_tokens.ilike.%${t}%`,
    ])
    .join(",");

  let activeRows: Row[] = [];
  let clinicRows: Row[] = [];

  try {
    const { data, error } = await db()
      .from("active_pharmacy_inventory")
      .select(
        "clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens"
      )
      .or(activeOrFilter)
      .gt("quantity", 0)
      .limit(100);

    if (error) throw error;

    activeRows = data || [];
  } catch (e) {
    console.error("active_pharmacy_inventory search failed", e);
  }

  try {
    const { data, error } = await db()
      .from("clinic_inventory")
      .select(
        "clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens"
      )
      .or(clinicOrFilter)
      .gt("quantity", 0)
      .neq("clinic_name", "ChekaMeds Admin")
      .limit(100);

    if (error) throw error;

    clinicRows = data || [];
  } catch (e) {
    console.error("clinic_inventory search failed", e);
  }

  const rows = dedupeInventoryItems(
    [...activeRows, ...clinicRows]
      .filter(isProductionRow)
      .sort((a, b) => score(b, terms) - score(a, terms))
  ).slice(0, 5);

  if (!rows.length) {
    try {
      await db().from("failed_searches").insert({
        query: q,
        source: "whatsapp",
        user_phone: cleanPhone(phone),
      });
    } catch {}
  }

  const result = { rows, terms, ts: Date.now() };
  cache.set(key, result);

  return result;
}

function realLocation(location?: string | null) {
  return hasRealLocation(location);
}

function link(value?: string | null) {
  return realDirections(value);
}

function price(value: number | null | undefined) {
  return value != null ? `P${Number(value).toFixed(2)}` : "Price unavailable";
}

function formatPrice(priceValue: number | null | undefined) {
  return price(priceValue);
}

function item(row: Row | SessionOption, i: number) {
  const map = link(row.directions_link);

  const out = `*${i}. ${row.med_name}*
🏥 Pharmacy: ${row.clinic_name}
📍 Location: ${realLocation(row.location) ? row.location : "Location not listed by pharmacy"}
📦 Availability: In stock
💰 Price: ${price(row.price_bwp)}
🧭 Directions: ${map || "Not listed by pharmacy"}`;

  return out;
}

function selection(row: Row | SessionOption) {
  const map = link(row.directions_link);

  return `✅ *Selected Medicine*

💊 *${row.med_name}*
🏥 Pharmacy: ${row.clinic_name}
📍 Location: ${realLocation(row.location) ? row.location : "Location not listed by pharmacy"}
📦 Availability: In stock
💰 Price: ${price(row.price_bwp)}
🧭 Directions: ${map || "Not listed by pharmacy"}

${DIV}

*Next step*
Reply *STORE* to reserve for collection and pay at the pharmacy.
Reply *DIRECTIONS* to see the map link again.
Reply *VIDEO CONSULT* for online consultation.

Final availability must still be confirmed by the pharmacy before collection.`;
}

function formatInventoryItem(row: Row | SessionOption, index: number) {
  return item(row, index);
}

async function reserve(phone: string, selected: SessionOption) {
  let inserted = false;
  let notificationSent = false;

  try {
    await db().from("order_requests").insert({
      from_number: cleanPhone(phone),
      medicine: selected.med_name,
      pharmacy: selected.clinic_name,
      amount: selected.price_bwp == null ? null : Number(selected.price_bwp),
      payment_status: "pending_store_payment",
      status: "reserved",
      notes: `WhatsApp reservation created for ${selected.med_name} at ${selected.clinic_name}`,
    });
    inserted = true;
  } catch (e) {
    console.error("reservation insert failed", e);
  }

  if (!inserted) {
    return `⚠️ *Reservation Not Recorded*

💊 Medicine: ${selected.med_name}
🏥 Pharmacy: ${selected.clinic_name}
💰 Amount: ${price(selected.price_bwp)}

The reservation could not be saved right now. Please try again or contact the pharmacy directly.`;
  }

  if (inserted && selected.contact) {
    try {
      await sendWhatsApp(
        selected.contact,
        `🔔 ChekaMeds Reservation
Customer: +${cleanPhone(phone)}
Medicine: ${selected.med_name}
Pharmacy: ${selected.clinic_name}
Amount: ${price(selected.price_bwp)}
Please confirm stock and pickup readiness.`
      );
      notificationSent = true;
    } catch (e) {
      console.error("pharmacy reservation notification failed", e);
    }
  }

  const map = link(selected.directions_link);

  return `🏪 *Reservation Recorded*

💊 Medicine: ${selected.med_name}
🏥 Pharmacy: ${selected.clinic_name}
📍 Location: ${realLocation(selected.location) ? selected.location : "Location not listed by pharmacy"}
💰 Amount: ${price(selected.price_bwp)}
🧭 Directions: ${map || "Not listed by pharmacy"}
🔔 Pharmacy notification: ${notificationSent ? "Sent" : selected.contact ? "Failed to send" : "No pharmacy contact listed"}

Please pay physically at the pharmacy on collection.
Final availability may be confirmed by the pharmacy before pickup.`;
}

type FacilityResult = {
  facility_name: string;
  facility_type: string;
  location: string | null;
  directions_link?: string | null;
  contact?: string | null;
};

function facilitySearchTerms(message: string) {
  const msg = cleanText(message);
  const terms = new Set<string>([msg]);

  msg.split(" ").filter((term) => term.length > 2).forEach((term) => terms.add(term));

  if (/\bdaraja\b/.test(msg)) {
    terms.add("daraja");
  }

  if (/\bj\s*mecca\b|\bjmecca\b/.test(msg)) {
    ["jmecca", "j mecca", "j-mecca", "mecca"].forEach((term) => terms.add(term));
  }

  if (/\bsouth\s*west\b|\bsouthwest\b/.test(msg)) {
    ["south west", "southwest"].forEach((term) => terms.add(term));
  }

  return Array.from(terms).filter(Boolean);
}

function isFacilitySearch(message: string) {
  const msg = cleanText(message);

  return (
    /\b(daraja|jmecca|j mecca|j mecca pharmacy|south west|southwest|pharmacy|clinic|facility|hospital)\b/.test(msg) ||
    message.toLowerCase().includes("j-mecca")
  );
}

function facilityLocation(row: any) {
  return row.city_town || row.area || row.address || row.location || null;
}

function formatFacilityResults(query: string, rows: FacilityResult[]) {
  if (!rows.length) {
    return `No facility listing found for "${query}".\n\nTry another pharmacy, clinic, town, or area name.`;
  }

  let reply = `🏥 *ChekaMeds Facility Search*\n\nSearch: *${query}*\n\n${DIV}\n\n`;

  rows.forEach((row, i) => {
    const map = link(row.directions_link);

    reply += `*${i + 1}. ${row.facility_name}*\nType: ${row.facility_type || "facility"}\nLocation: ${realLocation(row.location) ? row.location : "Location not listed by pharmacy"}\nDirections: ${map || "Not listed by pharmacy"}\n\n`;
  });

  return reply.trim();
}

async function facilities(message: string) {
  const terms = facilitySearchTerms(message);
  const mapOrFilter = terms
    .flatMap((term) => [
      `facility_name.ilike.%${term}%`,
      `facility_type.ilike.%${term}%`,
      `city_town.ilike.%${term}%`,
      `area.ilike.%${term}%`,
      `address.ilike.%${term}%`,
      `notes.ilike.%${term}%`,
    ])
    .join(",");
  const inventoryOrFilter = terms
    .flatMap((term) => [`clinic_name.ilike.%${term}%`, `location.ilike.%${term}%`])
    .join(",");

  let mappedFacilities: FacilityResult[] = [];
  let inventoryFacilities: FacilityResult[] = [];

  try {
    const { data, error } = await db()
      .from("chekameds_public_facilities_map")
      .select("facility_name,facility_type,city_town,area,address,phone_whatsapp,google_maps_url")
      .or(mapOrFilter)
      .limit(20);

    if (error) throw error;

    mappedFacilities = (data || []).map((row: any) => ({
      facility_name: row.facility_name,
      facility_type: row.facility_type || "facility",
      location: facilityLocation(row),
      directions_link: row.google_maps_url || null,
      contact: row.phone_whatsapp || null,
    }));
  } catch (e) {
    console.error("facility map search failed", e);
  }

  try {
    const { data, error } = await db()
      .from("clinic_inventory")
      .select("clinic_name,location,contact,directions_link")
      .or(inventoryOrFilter)
      .neq("clinic_name", "ChekaMeds Admin")
      .limit(100);

    if (error) throw error;

    const seen = new Set<string>();

    inventoryFacilities = (data || [])
      .map((row: any) => ({
        facility_name: row.clinic_name,
        facility_type: "pharmacy",
        location: row.location || null,
        directions_link: row.directions_link || null,
        contact: row.contact || null,
      }))
      .filter((row: FacilityResult) => {
        const key = cleanText(`${row.facility_name}|${row.location || ""}`);
        if (!row.facility_name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (e) {
    console.error("clinic_inventory facility search failed", e);
  }

  const seen = new Set<string>();
  const rows = [...mappedFacilities, ...inventoryFacilities]
    .filter((row) => {
      const key = cleanText(`${row.facility_name}|${row.location || ""}`);
      if (!row.facility_name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);

  return formatFacilityResults(message, rows);
}

function formatPaymentChoice(selected: SessionOption) {
  return `✅ *Reservation request received*

Medicine: ${selected.med_name}
Pharmacy: ${selected.clinic_name}
Location: ${hasRealLocation(selected.location) ? selected.location : "Location unavailable"}
Amount: ${formatPrice(selected.price_bwp)}

Choose payment method:

⚡ Reply *CPAY*
Pay with ChekaPay
Instant confirmation • Priority pickup • Digital receipt

🏪 Reply *STORE*
Reserve now and pay physically on collection.`;
}

function formatMedicineResults(query: string, rows: Row[]) {
  let reply = `💊 *ChekaMeds Stock Search*

Search: *${query}*

${DIV}

`;

  rows.forEach((row, i) => {
    reply += `${formatInventoryItem(row, i + 1)}

`;
  });

  reply += `Reply with the item number to reserve.
Example: Reply *1*`;

  return reply;
}

function formatSymptomResults(query: string, rows: Row[]) {
  let reply = `🩺 *ChekaMeds Symptom Guidance*

You searched: *${query}*

This is not a diagnosis or prescription. ChekaMeds can only help you find commonly searched medicine categories and listed stock.

For severe symptoms, pregnancy, children under 2, chest pain, breathing difficulty, allergic swelling, or persistent fever, please seek medical care immediately.

${DIV}

`;

  rows.forEach((row, i) => {
    reply += `${formatInventoryItem(row, i + 1)}

`;
  });

  reply += `Reply with the item number to reserve.
Example: Reply *1*`;

  return reply;
}

async function processMessage(message: string, phone: string) {
  const msg = cleanText(message);
  const session = await getSession(phone);

  if (/^(hi|hello|hey|help|dumelang|dumela)$/.test(msg)) {
    return `ChekaMeds Botswana

Send a medicine name or symptom.

Examples:
Panado
Flu
Headache and fever
Wound care
BP tablets

Website: chekameds.co.bw
WhatsApp: +267 71 424 486`;
  }

  if (/^(video consult|consult|doctor|online consultation|online consult)$/.test(msg)) {
    return "https://www.chekameds.co.bw/consultant";
  }

  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const selected = session.options[Number(msg) - 1];

    if (selected) {
      await saveSession(phone, session.medicine || selected.med_name, session.options, selected);
      return selection(selected);
    }

    return `Invalid selection. Reply with 1-${session.options.length}.`;
  }

  if (/^(cpay|chekapay|pay with chekapay)$/.test(msg)) {
    if (!session?.selected) {
      return "Please search first, reply with an item number to reserve, then reply CPAY.";
    }

    const selected = session.selected;

    if (selected.price_bwp == null || Number(selected.price_bwp) <= 0) {
      return `⚠️ *ChekaPay needs a listed price*

Medicine: ${selected.med_name}
Pharmacy: ${selected.clinic_name}
Amount: Price unavailable

This item cannot be paid through ChekaPay until the pharmacy lists a price.

Reply *STORE* to reserve and pay physically on collection.`;
    }

    let reservationId = "";

    try {
      const { data, error } = await db()
        .from("order_requests")
        .insert({
          from_number: cleanPhone(phone),
          medicine: selected.med_name,
          pharmacy: selected.clinic_name,
          amount: Number(selected.price_bwp),
          payment_status: "chekapay_pending",
          status: "reserved",
          notes: `WhatsApp ChekaPay checkout created for ${selected.med_name} at ${selected.clinic_name}`,
        })
        .select("id")
        .single();

      if (error) throw error;

      reservationId = data?.id || "";
    } catch (e) {
      console.error("order_requests insert failed", e);

      return `⚠️ ChekaPay checkout could not be created right now.

Medicine: ${selected.med_name}
Pharmacy: ${selected.clinic_name}
Amount: ${formatPrice(selected.price_bwp)}

Reply *STORE* to reserve and pay physically on collection.`;
    }

    const checkoutUrl = `https://chekapay.co.bw/checkout?reservation=${reservationId}`;

    return `⚡ *ChekaPay Checkout*

Medicine: ${selected.med_name}
Pharmacy: ${selected.clinic_name}
Amount: ${formatPrice(selected.price_bwp)}

✅ Instant confirmation
✅ Faster pickup
✅ Digital receipt
✅ Secure wallet payment

👉 Complete Payment:
${checkoutUrl}`;
  }

  if (/^(store|pay at store|cash|cash payment)$/.test(msg)) {
    if (!session?.selected) {
      return "Please search first, reply with an item number to reserve, then reply STORE.";
    }

    const selected = session.selected;

    return reserve(phone, selected);
  }

  if (/^(directions|direction|map|location|where|where is it|send location)$/.test(msg)) {
    if (!session?.selected) {
      return "Please search first, reply with an item number, then reply DIRECTIONS.";
    }

    const selected = session.selected;
    const map = link(selected.directions_link);

    return `🧭 *Directions*

🏥 Pharmacy: ${selected.clinic_name}
📍 Location: ${realLocation(selected.location) ? selected.location : "Location not listed by pharmacy"}

${map || "Directions are not listed by the pharmacy yet."}`;
  }

  const payMatch = msg.match(/^pay(?:\s+([1-5]))?$/);

  if (payMatch) {
    if (!session?.options?.length) {
      return "Please search first, then reply with the item number to reserve, for example 1.";
    }

    const selected = payMatch[1]
      ? session.options[Number(payMatch[1]) - 1]
      : session.selected;

    if (!selected) {
      return `Please choose an item first. Reply with 1-${session.options.length}.`;
    }

    await saveSession(phone, session.medicine, session.options, selected);

    return formatPaymentChoice(selected);
  }

  if (/\b(wrong|not what i want|not correct|bad result|not this|no this)\b/.test(msg)) {
    return `No problem. Please choose what you want to do next:

*1* Search Medicine Availability
*2* Find Pharmacy / Clinic
*3* Video Consultation

Or type another medicine name.`;
  }

  if (isFacilitySearch(message)) {
    return facilities(message);
  }

  const symptom = isSymptomMessage(message);
  const query = symptom ? message : normalizeMedicineInput(message);
  const terms = symptom ? symptomTerms(message) : undefined;
  const { rows } = await searchStock(query, phone, terms);
  const options = rows.slice(0, 5);

  if (!options.length) {
    return symptom
      ? `No listed stock found for "${message}".

This is not a diagnosis. If symptoms are severe, unusual, or persistent, please speak to a pharmacist or clinician.`
      : `No listed stock found for "${message}".

Try another name, brand, or generic medicine.
For urgent symptoms, consult a healthcare professional.`;
  }

  const sessionOptions: SessionOption[] = options.map((r) => ({
    clinic_name: r.clinic_name,
    location: r.location || null,
    price_bwp: r.price_bwp == null ? null : Number(r.price_bwp),
    quantity: Number(r.quantity),
    med_name: r.med_name,
    directions_link: realDirections(r.directions_link) || null,
    contact: r.contact || null,
  }));

  await saveSession(phone, options[0].med_name, sessionOptions);

  return symptom ? formatSymptomResults(message, options) : formatMedicineResults(query, options);
}

async function sendWhatsApp(to: string, message: string) {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");

  if (!instanceId || !token) {
    throw new Error("UltraMsg secrets missing");
  }

  const recipient = cleanPhone(to);

  const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      to: recipient,
      body: message,
      priority: 10,
    }),
  });

  const data = await res.json();

  if (!res.ok || data?.sent === "false") {
    throw new Error(`UltraMsg API failed: ${JSON.stringify(data)}`);
  }
}

async function logWebhook(entry: any) {
  try {
    await db().from("whatsapp_webhook_logs").insert(entry);
  } catch (e) {
    console.error("log failed", e);
  }

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
  } catch (e) {
    console.error("event log failed", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  try {
    if (req.method === "GET") {
      const query = url.searchParams.get("query");

      if (!query) {
        return new Response(
          JSON.stringify({
            status: "ok",
            message: "ChekaMeds WhatsApp webhook active",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const reply = await processMessage(query, "GET");

      return new Response(JSON.stringify({ reply }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const raw = await req.text();

    let body: any = {};

    try {
      body = req.headers.get("content-type")?.includes("x-www-form-urlencoded")
        ? Object.fromEntries(new URLSearchParams(raw).entries())
        : JSON.parse(raw || "{}");
    } catch {
      body = {};
    }

    const payload = body?.data && typeof body.data === "object" ? body.data : body;

    const from = cleanPhone(
      String(payload.from || payload.sender || payload.author || payload.chatId || "")
    );

    const messageBody = String(payload.body || payload.message || payload.text || "");

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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const reply = await processMessage(messageBody, from);

    let sendError = "";

    if (!isTest) {
      try {
        await sendWhatsApp(from, reply);
      } catch (e) {
        sendError = e instanceof Error ? e.message : String(e);
      }
    }

    await logWebhook({
      source: isTest ? "test" : "incoming",
      from_number: from,
      message_body: messageBody,
      reply_text: reply,
      response_status: sendError ? 500 : 200,
      error_message: sendError || null,
      raw_payload: body,
    });

    if (sendError) {
      return new Response(JSON.stringify({ error: sendError, reply }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(
      JSON.stringify({
        status: isTest ? "tested" : "replied",
        to: from,
        reply,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);

    await logWebhook({
      source: isTest ? "test" : "incoming",
      response_status: 500,
      error_message: error,
    });

    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
