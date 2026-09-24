import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const DIV="───────────────";
const RESERVATION_HOURS=3;
const KNOWN_LOCATIONS=["jwaneng","gaborone","francistown","maun","kasane","palapye","serowe","lobatse","kanye","molepolole","tlokweng","mogoditshane","ramotswa","orapa","letlhakane","selebi phikwe","selibe phikwe","ghanzi","tsabong","hukuntsi","shakawe","gumare","masunga","tati siding","tati","tutume","bordergate"];
const NON_MEDICINE=["gold plated","regular gold","necklace","bracelet","earring","earrings","perfume","hair piece","hairpiece","body spray","toy","watch"];
const JUNK=["google","facebook","youtube","instagram","tiktok","gmail","whatsapp","website","url","link","login","password"];
const RESERVE=/^(store|buy|purchase|reserve for pickup|reserve for pick up|reserve pickup|reserve pick up|pay at store|reserve|pickup|pick up|reserv|reserb|resrv|reseve|resrve|proceed|i want to reserve|i want to collect|i will collect|i will pick up|pay in store|pay at counter|yes reserve|confirm reserve)$/;
const CONSULT=/^(video consult|consult|doctor|video|online consult|consult a doctor|video_consult|speak to doctor|talk to doctor)$/;
const OPTOUT=/^(stop|unsubscribe|opt out|optout|no messages|remove me)$/;
const NOTIFY_ME=/^(notify|notify me|alert me|tell me|watch|remind me|yes notify)$/;

const ULTRAMSG_INSTANCE = Deno.env.get("ULTRAMSG_INSTANCE") || "instance114633";
const ULTRAMSG_TOKEN_VAL = Deno.env.get("ULTRAMSG_TOKEN") || "zpivrjhut12tefx6";

const ROW_LIMIT = 100000;
const MAX_TERMS = 16;
const RESULT_SLOTS = 5;
const PER_CLINIC_CAP = 0;
const PULSE_TOP_SLOTS = 2;   // Pulse = slots 1&2 only; 3,4,5 = other pharmacies

const USE_GEMINI = true;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;

// ═════════════════════════════════════════════════════════════════
// GEMINI GUARDRAILS
// Gemini is used ONLY to normalise the user's words into a search term.
// It NEVER produces stock, prices, pharmacy names, or availability.
// Every term it returns is verified against clinic_inventory before use.
// ═════════════════════════════════════════════════════════════════
const GEMINI_SYSTEM = "You are a medicine name extractor for ChekaMeds, a Botswana pharmacy bot. " +
"Given any user message, extract and return ONLY the medicine, health product, or health supply name in English. " +
"STRICT RULES: " +
"1. If the message is a medicine name (even misspelled) — correct and return it. Examples: 'amoxicilin' -> 'amoxicillin', 'panado' -> 'paracetamol', 'brufen' -> 'ibuprofen'. " +
"2. If the message is a brand name — return it as-is. Examples: 'moods', 'durex', 'contempo', 'dynafil', 'viagra'. " +
"3. If the message describes a symptom in ANY language including Setswana — return the most common OTC medicine. Examples: 'my head is paining' -> 'paracetamol', 'ke a lwala' -> 'paracetamol', 'I have a cough' -> 'cough syrup'. " +
"4. If the message mentions condoms or contraceptives — return 'condom'. " +
"5. If the message mentions sexual health products — return the product name or generic. " +
"6. Return ONLY the medicine or product name. No explanation. No sentence. Maximum 6 words. " +
"7. NEVER invent a pharmacy name, price, stock level, or availability. You do not know what is in stock. " +
"8. NEVER give medical advice, dosage, or treatment instructions. " +
"9. If the message has absolutely nothing to do with medicine or health — return exactly: NONE.";

async function geminiExtract(message: string): Promise<string | null> {
  if (!USE_GEMINI || !GEMINI_API_KEY) { console.warn("GEMINI_DISABLED key_present=false"); return null; }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const reqBody = JSON.stringify({
      contents: [{ parts: [{ text: GEMINI_SYSTEM + "\n\nTASK - EXTRACT SEARCH TERM FROM: " + message }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    });
    const res = await fetch(GEMINI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: reqBody });
    let data = await res.json();
    if (data?.error?.code === 503) {
      console.warn("GEMINI_RETRY_503:", message);
      await new Promise(r => setTimeout(r, 600));
      const retryRes = await fetch(GEMINI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: reqBody });
      data = await retryRes.json();
    }
    clearTimeout(timeout);
    if (data?.error) { console.error("GEMINI_API_ERROR:", JSON.stringify(data.error).substring(0,300)); return null; }
    const out = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    console.log("GEMINI_EXTRACT:", message, "->", out);
    if (!out || out.toUpperCase() === "NONE" || out.length < 2) return null;
    const cleaned = out.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    // GUARDRAIL: reject anything that looks like a sentence or invented claim
    if (cleaned.split(" ").length > 6) { console.warn("GEMINI_REJECTED too_long:", cleaned); return null; }
    if (/\b(pharmacy|pula|bwp|price|stock|available|in stock|p[0-9])\b/.test(cleaned)) { console.warn("GEMINI_REJECTED claim_like:", cleaned); return null; }
    return cleaned;
  } catch (e) {
    console.error("GEMINI_EXTRACT_ERROR:", String(e));
    return null;
  }
}

// GUARDRAIL: alternatives are checked against REAL inventory before suggesting.
async function geminiAlternatives(medicine: string): Promise<string[]> {
  if (!USE_GEMINI || !GEMINI_API_KEY) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const prompt = "List up to 4 alternative medicine or brand names that treat the same condition as: " + medicine + ". " +
      "Reply with ONLY a comma-separated list of medicine names. " +
      "No explanation. No numbers. No sentences. No prices. No pharmacy names. No dosages. " +
      "Example format: paracetamol, ibuprofen, aspirin";
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 60 },
      }),
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data?.error) { console.error("GEMINI_ALT_ERROR:", JSON.stringify(data.error).substring(0,300)); return []; }
    const out = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    console.log("GEMINI_ALTERNATIVES:", medicine, "->", out);
    if (!out || out.toUpperCase() === "NONE") return [];
    const raw = out.split(",").map(s => s.trim().toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim())
      .filter(s => s.length >= 2 && s.split(" ").length <= 4).slice(0, 4);
    if (!raw.length) return [];
    // ── HARD GUARDRAIL: only keep names that ACTUALLY EXIST in inventory ──
    const verified: string[] = [];
    for (const cand of raw) {
      try {
        const { data: hit } = await sb().from("clinic_inventory").select("med_name")
          .gt("quantity", 0).neq("clinic_name", "ChekaMeds Admin")
          .or(`med_name.ilike.%${cand}%,generic_name.ilike.%${cand}%,brand_name.ilike.%${cand}%`)
          .limit(1);
        if (hit && hit.length) verified.push(cand);
        else console.log("GEMINI_ALT_DROPPED not_in_inventory:", cand);
      } catch(_) {}
    }
    console.log("GEMINI_ALT_VERIFIED:", verified.join("|"));
    return verified;
  } catch (e) {
    console.error("GEMINI_ALT_EXCEPTION:", String(e));
    return [];
  }
}

type Row={clinic_name:string;med_name:string;quantity:number;price_bwp:number|null;location?:string|null;directions_link?:string|null;contact?:string|null;strength?:string|null;dosage_form?:string|null;generic_name?:string|null;brand_name?:string|null;search_tokens?:string|null;approved?:boolean|null;};
type PInfo={contact:string|null;weekday_hours:string|null;weekend_hours:string|null;address:string|null;lat:number|null;lng:number|null;};
type Opt={clinic_name:string;med_name:string;quantity:number;price_bwp:number|null;location:string|null;directions_link:string|null;contact:string|null;weekday_hours:string|null;weekend_hours:string|null;distance_km:number|null;};
type Session={medicine:string;options:Opt[];selected:Opt|null;state:string;user_lat:number|null;user_lng:number|null;};
type WA={type:"text"|"button"|"list";text?:string;buttons?:{id:string;text:string}[];listTitle?:string;listButtonText?:string;sections?:{title:string;rows:{id:string;title:string;description?:string}[]}[];};

const sb=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ct=(v:string|null|undefined)=>String(v||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const cp=(r:string)=>{let p=String(r||"").replace(/@c\.us|@s\.whatsapp\.net/g,"").replace(/^\+/,"").replace(/\D/g,"");if(p.length===8)p=`267${p}`;if(p.length===10&&p[0]==="0")p=`267${p.slice(1)}`;return p;};
const price=(v:number|null|undefined)=>v!=null?`P${Number(v).toFixed(2)}`:`Price unavailable`;
const realLink=(v?:string|null)=>{const s=String(v||"").trim();if(!/^https:\/\//i.test(s))return"";if(/example|placeholder|fake|test/i.test(s))return"";return s;};
const hasLoc=(v?:string|null)=>{const s=ct(v);return!!(s&&s!=="botswana"&&s!=="unknown"&&s!=="not listed"&&s!=="n a");};
const isPulse=(n:string)=>ct(n).includes("pulse");
const prettyLoc=(l:string)=>l?l.split(" ").map(p=>p[0].toUpperCase()+p.slice(1)).join(" "):"All Botswana";
const RANK=["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];
const uuid=()=>crypto.randomUUID();

function hav(la1:number,lo1:number,la2:number,lo2:number){const R=6371,dL=(la2-la1)*Math.PI/180,dG=(lo2-lo1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
const fmtDist=(k:number)=>k<1?`${Math.round(k*1000)}m away`:`${k.toFixed(1)} km away`;
const fmtTime=(k:number)=>{const m=Math.round((k/40)*60);return m<1?"under 1 min":m===1?"~1 min by car":`~${m} mins by car`;};

// ═══ ANALYTICS — every search recorded, every impression attributed ═══
async function logSearch(o:{
  searchId:string;query:string;normalized:string;resultsCount:number;phone:string;
  location:string|null;found:boolean;matched:string[];geminiUsed:boolean;geminiTerm:string|null;
  lat:number|null;lng:number|null;
}){
  try{
    const{error}=await sb().from("search_logs").insert({
      search_id:o.searchId,query:o.query,normalized_query:o.normalized,
      results_count:o.resultsCount,source:"whatsapp",user_phone:o.phone,
      location:o.location,reserved:false,found:o.found,
      matched_pharmacies:o.matched,gemini_used:o.geminiUsed,gemini_term:o.geminiTerm,
      user_lat:o.lat,user_lng:o.lng,
    });
    if(error)console.error("LOG_SEARCH_ERROR:",error.message);
    else console.log("LOG_SEARCH_OK:",o.normalized,"found=",o.found,"n=",o.resultsCount);
  }catch(e){console.error("LOG_SEARCH_EXCEPTION:",String(e));}
}

async function logImpressions(searchId:string,query:string,opts:Opt[],phone:string,location:string|null){
  if(!opts.length)return;
  try{
    const rows=opts.map((o,i)=>({
      search_id:searchId,pharmacy_name:o.clinic_name,medicine:o.med_name,query,
      position:i+1,price_bwp:o.price_bwp,quantity:o.quantity,distance_km:o.distance_km,
      user_phone:phone,location,source:"whatsapp",selected:false,reserved:false,
    }));
    const{error}=await sb().from("search_impressions").insert(rows);
    if(error)console.error("LOG_IMPRESSION_ERROR:",error.message);
    else console.log("LOG_IMPRESSIONS_OK:",rows.length,"pharmacies");
  }catch(e){console.error("LOG_IMPRESSION_EXCEPTION:",String(e));}
}

async function markImpression(searchId:string|null,pharmacy:string,medicine:string,phone:string,field:"selected"|"reserved"){
  try{
    let q=sb().from("search_impressions").update({[field]:true})
      .eq("pharmacy_name",pharmacy).eq("user_phone",cp(phone));
    if(searchId)q=q.eq("search_id",searchId);
    else q=q.eq("medicine",medicine);
    const{error}=await q;
    if(error)console.error("MARK_IMPRESSION_ERROR:",error.message);
  }catch(e){console.error("MARK_IMPRESSION_EXCEPTION:",String(e));}
}

async function logFailed(normalized:string,query:string,phone:string,location:string|null){
  try{
    await sb().from("failed_searches").insert({
      query,normalized_query:normalized,source:"whatsapp",user_phone:cp(phone),location,notified:false
    });
  }catch(e){console.error("LOG_FAILED_EXCEPTION:",String(e));}
}

async function addToWatchlist(phone:string,medicine:string,location:string|null){
  try{
    await sb().from("stock_watchlist").insert({phone:cp(phone),medicine:ct(medicine),location,notified:false});
    console.log("WATCHLIST_ADDED:",phone,medicine);
    return true;
  }catch(e){console.error("WATCHLIST_ERROR:",String(e));return false;}
}

async function isOptedOut(phone:string):Promise<boolean>{
  try{const{data}=await sb().from("notification_optouts").select("phone").eq("phone",cp(phone)).maybeSingle();return !!data;}catch(_){return false;}
}

// ═══ RANKING: Pulse top 2, slots 3-5 to other pharmacies ═══
function interleaveOpts(pulse:Opt[],others:Opt[],slots=RESULT_SLOTS):Opt[]{
  const out:Opt[]=[];const seenP=new Set<string>();
  for(const p of pulse){if(out.length>=PULSE_TOP_SLOTS)break;const k=ct(p.clinic_name);if(seenP.has(k))continue;seenP.add(k);out.push(p);}
  const seenO=new Set<string>();const leftoverO:Opt[]=[];
  for(const o of others){const k=ct(o.clinic_name);if(seenO.has(k)){leftoverO.push(o);continue;}seenO.add(k);if(out.length<slots)out.push(o);else leftoverO.push(o);}
  for(const o of leftoverO){if(out.length>=slots)break;out.push(o);}
  for(const p of pulse){if(out.length>=slots)break;if(out.indexOf(p)!==-1)continue;out.push(p);}
  return out.slice(0,slots);
}
function interleaveRows(pulse:{r:Row;s:number}[],others:{r:Row;s:number}[],slots=RESULT_SLOTS):Row[]{
  const out:Row[]=[];const seenP=new Set<string>();
  for(const{r}of pulse){if(out.length>=PULSE_TOP_SLOTS)break;const k=ct(r.clinic_name);if(seenP.has(k))continue;seenP.add(k);out.push(r);}
  const seenO=new Set<string>();const leftoverO:Row[]=[];
  for(const{r}of others){const k=ct(r.clinic_name);if(seenO.has(k)){leftoverO.push(r);continue;}seenO.add(k);if(out.length<slots)out.push(r);else leftoverO.push(r);}
  for(const r of leftoverO){if(out.length>=slots)break;out.push(r);}
  for(const{r}of pulse){if(out.length>=slots)break;if(out.indexOf(r)!==-1)continue;out.push(r);}
  return out.slice(0,slots);
}

const pCache=new Map<string,PInfo>();
async function pInfo(name:string):Promise<PInfo>{
  const k=ct(name);if(pCache.has(k))return pCache.get(k)!;
  try{
    const{data}=await sb().from("pharmacies").select("contact,weekday_hours,weekend_hours,address,latitude,longitude").ilike("clinic_name",`%${name.trim()}%`).maybeSingle();
    const r:PInfo={contact:data?.contact||null,weekday_hours:data?.weekday_hours||null,weekend_hours:data?.weekend_hours||null,address:data?.address||null,lat:data?.latitude?Number(data.latitude):null,lng:data?.longitude?Number(data.longitude):null};
    pCache.set(k,r);return r;
  }catch(_){return{contact:null,weekday_hours:null,weekend_hours:null,address:null,lat:null,lng:null};}
}

async function readSession(phone:string):Promise<Session>{
  try{
    const{data}=await sb().from("whatsapp_sessions").select("medicine,options,selected,state,user_lat,user_lng").eq("from_number",cp(phone)).maybeSingle();
    if(!data)return{medicine:"",options:[],selected:null,state:"idle",user_lat:null,user_lng:null};
    return{medicine:data.medicine||"",options:Array.isArray(data.options)?data.options:[],selected:data.selected||null,state:data.state||"idle",user_lat:data.user_lat?Number(data.user_lat):null,user_lng:data.user_lng?Number(data.user_lng):null};
  }catch(_){return{medicine:"",options:[],selected:null,state:"idle",user_lat:null,user_lng:null};}
}
async function writeSession(phone:string,s:Session){
  try{await sb().from("whatsapp_sessions").upsert({from_number:cp(phone),medicine:s.medicine,options:s.options as any,selected:s.selected as any,state:s.state,user_lat:s.user_lat,user_lng:s.user_lng,updated_at:new Date().toISOString()},{onConflict:"from_number"});}catch(e){console.error("writeSession",e);}
}

const ALIASES:Record<string,string>={panado:"paracetamol",panadol:"paracetamol",panadoo:"paracetamol",panodo:"paracetamol",panadole:"paracetamol",paracetmol:"paracetamol",parecetamol:"paracetamol",parasetamol:"paracetamol",paracitamol:"paracetamol",paracet:"paracetamol",parecet:"paracetamol",paraml:"paracetamol",parml:"paracetamol",brufen:"ibuprofen",ibrufen:"ibuprofen",ibrofen:"ibuprofen",ibuprofin:"ibuprofen",ibuprofane:"ibuprofen",amoxil:"amoxicillin",amoxilin:"amoxicillin",amoxycillin:"amoxicillin",amoxy:"amoxicillin",allergex:"chlorpheniramine",alergex:"chlorpheniramine",allegex:"chlorpheniramine",disprin:"aspirin",asprin:"aspirin",cetrezine:"cetirizine",cetrizine:"cetirizine",citrizine:"cetirizine",omperazole:"omeprazole",esomperazole:"esomeprazole",esomep:"esomeprazole",canesten:"clotrimazole",candid:"clotrimazole",gaviscon:"sodium alginate",gavison:"sodium alginate",metfomin:"metformin",metformine:"metformin",losaten:"losartan",losartin:"losartan",amlodipin:"amlodipine",amlodipene:"amlodipine",atovastatin:"atorvastatin",atorva:"atorvastatin",azitromycin:"azithromycin",zithromax:"azithromycin",cipro:"ciprofloxacin",ciprofloxacine:"ciprofloxacin",doxy:"doxycycline",declofenac:"diclofenac",voltaren:"diclofenac",ventolin:"salbutamol",salbutomol:"salbutamol",insuline:"insulin",coartem:"artemether lumefantrine",lumartem:"artemether lumefantrine",urimax:"tamsulosin",flomax:"tamsulosin",brugesic:"ibuprofen",myprodol:"ibuprofen paracetamol codeine",
condom:"condom",condoms:"condom",kondome:"condom",kondom:"condom",
moods:"moods",mood:"moods",
durex:"durex",contempo:"contempo",
viagra:"sildenafil",viagara:"sildenafil",viagr:"sildenafil",
sildenafil:"sildenafil",dynafil:"sildenafil",
"sex pills":"sildenafil","male enhancement":"sildenafil"};

function normMed(msg:string):string{
  const noise=/\b(please|pls|plz|find|search|check|stock|available|avail|medicine|medication|meds|drug|tablet|tablets|tab|tabs|capsule|capsules|syrup|cream|ointment|price|need|looking|for|do|you|have|where|can|i|get|is|there|near|me|want|buy|purchase|get|some|a|the)\b/g;
  let t=ct(msg).replace(noise," ").replace(/\s+/g," ").trim();
  if(ALIASES[t])return ALIASES[t];
  for(const[w,r]of Object.entries(ALIASES))t=t.replace(new RegExp(`\\b${w}\\b`,"g"),r);
  return t.replace(/\s+/g," ").trim();
}
function extractLoc(m:string){const t=ct(m);return KNOWN_LOCATIONS.find(l=>t.includes(l))||""}
function stripLoc(m:string,l:string){if(!l)return ct(m);return ct(m).replace(new RegExp(`\\b${l}\\b`,"g")," ").replace(/\bnear me\b/g," ").replace(/\b(in|at|near)\b/g," ").replace(/\s+/g," ").trim();}

function sim(a:string,b:string):number{const l=ct(a),r=ct(b);if(!l||!r)return 0;if(l===r)return 1;const M=Math.max(l.length,r.length);if(M===0)return 0;const prev=Array.from({length:r.length+1},(_,i)=>i),cur=Array.from({length:r.length+1},()=>0);for(let i=1;i<=l.length;i++){cur[0]=i;for(let j=1;j<=r.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(l[i-1]===r[j-1]?0:1));for(let j=0;j<=r.length;j++)prev[j]=cur[j];}return 1-prev[r.length]/M;}

function scoreRow(row:Row,terms:string[],wantedLoc:string):number{
  const med=ct(row.med_name);
  const searchable=ct([row.med_name,row.generic_name,row.brand_name,row.strength,row.dosage_form,row.search_tokens].filter(Boolean).join(" "));
  const locText=ct([row.location,row.clinic_name].filter(Boolean).join(" "));
  let score=0;
  for(const term of terms.map(ct).filter(Boolean)){
    if(!term)continue;
    if(med===term)score+=400;
    else if(med.startsWith(term+" ")||med.endsWith(" "+term))score+=280;
    else if(med.includes(term))score+=200;
    else if(searchable.includes(term))score+=120;
    for(const part of term.split(" ").filter(p=>p.length>=4)){if(med.includes(part))score+=60;else if(searchable.includes(part))score+=30;}
    for(const word of med.split(" ").filter(w=>w.length>=4)){const s=sim(term,word);if(s>=0.88)score+=90;else if(s>=0.78)score+=50;}
  }
  if(score<80)return 0;
  if(wantedLoc&&locText.includes(wantedLoc))score+=600;
  if(hasLoc(row.location))score+=15;
  if(realLink(row.directions_link))score+=10;
  score+=Math.min(Number(row.quantity)||0,100)/20;
  return score;
}

const SELECT_COLS="clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens";

async function loadRows(termArr:string[]):Promise<Row[]>{
  const safe=termArr.map(t=>t.replace(/[^a-z0-9 ]/gi," ").trim()).filter(t=>t.length>=3).slice(0,MAX_TERMS);
  if(!safe.length)return[];
  const seen=new Set<string>();const out:Row[]=[];
  const queries=safe.map(async t=>{
    try{
      const{data,error}=await sb().from("clinic_inventory").select(SELECT_COLS)
        .gt("quantity",0).neq("clinic_name","ChekaMeds Admin")
        .or(`med_name.ilike.%${t}%,generic_name.ilike.%${t}%,brand_name.ilike.%${t}%,search_tokens.ilike.%${t}%`)
        .limit(ROW_LIMIT);
      if(error)throw error;
      return (data||[]) as Row[];
    }catch(e){console.error("loadRows term",t,e);return [] as Row[];}
  });
  const results=await Promise.all(queries);
  for(const batch of results){
    for(const r of batch){
      const k=ct(`${r.clinic_name}|${r.med_name}|${r.strength||""}`);
      if(seen.has(k))continue;seen.add(k);out.push(r);
    }
  }
  console.log("loadRows matched:",out.length,"terms:",safe.join("|"));
  return out;
}

async function search(query:string,wantedLoc:string):Promise<Opt[]>{
  const nm=normMed(query);const terms=new Set<string>([query,nm]);const s=ct(query);
  if(/\b(flu|cold|fever|headache|pain|temperature)\b/.test(s)){["paracetamol","ibuprofen"].forEach(t=>terms.add(t));}
  if(/\b(heartburn|reflux|acid|ulcer)\b/.test(s)){["omeprazole","esomeprazole"].forEach(t=>terms.add(t));}
  if(/\b(allergy|allergies|rash|itch)\b/.test(s)){["chlorpheniramine","cetirizine","loratadine","allergex"].forEach(t=>terms.add(t));}
  if(/\b(cough|throat)\b/.test(s)){["cough","syrup","pholcodine"].forEach(t=>terms.add(t));}
  if(/\b(diarrhea|diarrhoea|stomach|vomit|nausea)\b/.test(s)){["oral rehydration","loperamide"].forEach(t=>terms.add(t));}
  if(/\b(blood pressure|hypertension|bp|pressure)\b/.test(s)){["amlodipine","enalapril","losartan","bisoprolol"].forEach(t=>terms.add(t));}
  if(/\b(sugar|diabetes|diabetic)\b/.test(s)){["metformin","glibenclamide","insulin","gliclazide"].forEach(t=>terms.add(t));}
  if(/\b(cholesterol|statin)\b/.test(s)){["atorvastatin","simvastatin","rosuvastatin"].forEach(t=>terms.add(t));}
  try{const{data}=await sb().from("medicine_aliases").select("alias,canonical_name").limit(ROW_LIMIT);for(const a of data||[]){const al=ct((a as any).alias||""),can=ct((a as any).canonical_name||"");if(al&&can&&(al.includes(nm)||can.includes(nm)||nm.includes(al)||nm.includes(can))){terms.add(al);terms.add(can);}}}catch(_){}
  const termArr=Array.from(terms).filter(t=>t.length>=2).slice(0,MAX_TERMS*3);
  let rows=await loadRows(termArr);
  rows=rows.filter(r=>{const c=ct(r.clinic_name),m=ct(r.med_name);if(!c||!m)return false;if(c.includes("chekameds admin")||["demo","test","sample","mock"].some(b=>c.includes(b)))return false;if(NON_MEDICINE.some(b=>m.includes(b)))return false;if(r.approved===false)return false;if(!wantedLoc)return true;return ct([r.location,r.clinic_name].join(" ")).includes(wantedLoc);});
  const scored=rows.map(r=>({r,s:scoreRow(r,termArr,wantedLoc)})).filter(x=>x.s>0);
  if(!scored.length)return[];
  scored.sort((a,b)=>b.s-a.s);
  const pulseAll=scored.filter(x=>isPulse(x.r.clinic_name));
  const nonPulse=scored.filter(x=>!isPulse(x.r.clinic_name));
  const top=interleaveRows(pulseAll,nonPulse,RESULT_SLOTS);
  console.log("SEARCH_RESULTS:",top.map(t=>t.clinic_name).join(" | "),"| pulse_pool:",pulseAll.length,"other_pool:",nonPulse.length);
  return Promise.all(top.map(async r=>{
    const info=await pInfo(r.clinic_name);
    return{clinic_name:r.clinic_name,med_name:r.med_name,quantity:Number(r.quantity),price_bwp:r.price_bwp==null?null:Number(r.price_bwp),location:r.location||null,directions_link:realLink(r.directions_link)||null,contact:info.contact||r.contact||null,weekday_hours:info.weekday_hours||null,weekend_hours:info.weekend_hours||null,distance_km:null} as Opt;
  }));
}

function pulseFirst(list:Opt[]):Opt[]{
  const p=list.filter(o=>isPulse(o.clinic_name));
  const n=list.filter(o=>!isPulse(o.clinic_name));
  return interleaveOpts(p,n,RESULT_SLOTS);
}
function sortByDistance(list:Opt[]):Opt[]{
  const p=list.filter(o=>isPulse(o.clinic_name)).sort((a,b)=>(a.distance_km??9999)-(b.distance_km??9999));
  const n=list.filter(o=>!isPulse(o.clinic_name)).sort((a,b)=>(a.distance_km??9999)-(b.distance_km??9999));
  return interleaveOpts(p,n,RESULT_SLOTS);
}

async function withDistance(opts:Opt[],lat:number|null,lng:number|null):Promise<Opt[]>{
  if(!lat||!lng)return opts;
  return Promise.all(opts.map(async o=>{
    const info=await pInfo(o.clinic_name);
    const dist=(info.lat&&info.lng)?hav(lat,lng,info.lat,info.lng):null;
    return{...o,distance_km:dist};
  }));
}

async function findSuggestion(query:string):Promise<string|null>{
  try{
    const q=ct(query);if(q.length<3)return null;
    const{data}=await sb().from("clinic_inventory").select("med_name").gt("quantity",0).neq("clinic_name","ChekaMeds Admin")
      .ilike("med_name",`%${q.slice(0,4)}%`).limit(ROW_LIMIT);
    if(!data?.length)return null;
    const names=[...new Set(data.map((r:any)=>ct(r.med_name)).filter(n=>n.length>=3))];
    let best="",bestS=0;
    for(const name of names){let s=sim(q,name);if(name.includes(q))s+=0.3;if(name.startsWith(q.slice(0,3)))s+=0.15;if(s>bestS&&s>=0.6){bestS=s;best=name;}}
    if(!best)return null;
    return best.split(" ").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ");
  }catch(_){return null;}
}

async function notifyPharmacy(phone:string,msg:string,pharmacy:string,medicine:string):Promise<boolean>{
  if(!ULTRAMSG_INSTANCE||!ULTRAMSG_TOKEN_VAL)return false;
  try{
    const r=await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:ULTRAMSG_TOKEN_VAL,to:phone,body:msg,priority:10})});
    const j=await r.json();const ok=j?.sent==="true"||j?.sent===true;
    try{await sb().from("pharmacy_notification_logs").insert({pharmacy,pharmacy_phone:phone,medicine,sent:ok,error:ok?null:JSON.stringify(j),ultramsg_response:j});}catch(_){}
    return ok;
  }catch(e:any){
    try{await sb().from("pharmacy_notification_logs").insert({pharmacy,pharmacy_phone:phone,medicine,sent:false,error:String(e?.message||e),ultramsg_response:null});}catch(_){}
    return false;
  }
}

async function doReserve(phone:string,sel:Opt):Promise<string>{
  const cPhone=cp(phone);
  const info=await pInfo(sel.clinic_name);
  let pPhone=cp(String(info.contact||sel.contact||""));
  if(pPhone.length<11){
    try{const{data}=await sb().from("chekameds_facilities").select("phone_whatsapp").ilike("facility_name",`%${sel.clinic_name.trim()}%`).not("phone_whatsapp","is",null).limit(1).maybeSingle();if(data?.phone_whatsapp)pPhone=cp(String(data.phone_whatsapp));}catch(_){}
  }
  const exp=new Date(Date.now()+RESERVATION_HOURS*3600000);
  const expTime=exp.toLocaleTimeString("en-BW",{hour:"2-digit",minute:"2-digit",hour12:true});
  const expDate=exp.toLocaleDateString("en-BW",{weekday:"short",month:"short",day:"numeric"});
  let notified=false;
  if(pPhone.length>=11&&pPhone!==cPhone){
    notified=await notifyPharmacy(pPhone,`🔔 *New Reservation — ChekaMeds*\n${DIV}\n💊 *${sel.med_name}*\n🏥 ${sel.clinic_name}\n👤 Customer: +${cPhone}\n💰 ${price(sel.price_bwp)}\n⏱️ Hold ${RESERVATION_HOURS}hrs · Expires ${expTime}, ${expDate}\n${DIV}\n📦 Please prepare the item.\n♻️ Release if not collected by ${expTime}.`,sel.clinic_name,sel.med_name);
  }
  try{await sb().from("order_requests").insert({from_number:cPhone,medicine:sel.med_name,pharmacy:sel.clinic_name,pharmacy_phone:pPhone.length>=11?pPhone:null,amount:sel.price_bwp,payment_status:"pending_store_payment",status:"reserved",expires_at:exp.toISOString(),notes:`Notified:${notified}`});}catch(e){console.error("order insert",e);}
  // analytics: mark reserved on both tables
  sb().from("search_logs").update({reserved:true}).eq("user_phone",cPhone).eq("normalized_query",ct(sel.med_name)).order("created_at",{ascending:false}).limit(1).then(()=>{}).catch(()=>{});
  await markImpression(null,sel.clinic_name,sel.med_name,cPhone,"reserved");
  const hours=info.weekday_hours?`${info.weekday_hours}${info.weekend_hours?` | ${info.weekend_hours}`:""}`:null;
  const lines=[
    `💊  *${sel.med_name}*`,
    `🏥  ${sel.clinic_name}`,
    sel.location&&hasLoc(sel.location)?`📍  ${sel.location}`:null,
    sel.distance_km!=null?`🚗  ${fmtDist(sel.distance_km)} · ${fmtTime(sel.distance_km)}`:null,
    pPhone.length>=11?`📞  +${pPhone}`:null,
    hours?`⏰  ${hours}`:null,
    realLink(sel.directions_link)?`🗺️  ${realLink(sel.directions_link)}`:null,
    `💰  ${price(sel.price_bwp)}`,
  ].filter(Boolean).join("\n");
  return `✅ *Reservation Confirmed* 🎉\n${DIV}\n${lines}\n${DIV}\n🔔 The pharmacy has been notified and is preparing your item.\n⏱️ Collect before *${expTime}* on ${expDate}\n\n💳 Pay at the counter when you collect.`;
}

function waText(p:WA):string{
  if(p.type==="list"){const rows=(p.sections||[]).flatMap(s=>s.rows);return`${p.text||""}\n\n${rows.map((r,i)=>`${RANK[i]||`*${i+1}.*`}  ${r.title}${r.description?`\n      ${r.description}`:""}`).join("\n\n")}\n\n${DIV}\n💬 Reply with a number (1–${rows.length}) to select.`;}
  return p.text||"";
}
async function sendWA(to:string,p:WA){
  if(!ULTRAMSG_INSTANCE||!ULTRAMSG_TOKEN_VAL)throw new Error("UltraMsg env missing");
  const r=await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:ULTRAMSG_TOKEN_VAL,to:cp(to),body:waText(p),priority:10})});
  const d=await r.json();
  if(!r.ok||d?.sent==="false"||d?.error)throw new Error(`UltraMsg: ${JSON.stringify(d)}`);
}
async function logEntry(entry:any){
  try{await sb().from("whatsapp_webhook_logs").insert(entry);}catch(_){}
  try{await sb().from("whatsapp_webhook_events").insert({provider:"ultramsg",from_phone:entry.from_number||null,message_text:entry.message_body||null,message_type:"chat",raw_payload:entry.raw_payload||{},status:entry.error_message?"error":"received",error:entry.error_message||null});}catch(_){}
}
function extractMsg(payload:any):string{return String(payload.body||payload.message||payload.text||payload.list_reply?.id||payload.button_reply?.id||payload.interactive?.list_reply?.id||payload.interactive?.button_reply?.id||payload.data?.list_reply?.id||payload.data?.button_reply?.id||"");}

function welcome():WA{return{type:"button",text:`*ChekaMeds* 💊\n${DIV}\n🇧🇼 Real-time medicine availability across Botswana.\n\n🔍 Send a medicine name to search anytime.\n\n_Panado · Amoxicillin · Ventolin · Metformin · Allergex_\n\n📍 *Share your location* to see how far each pharmacy is — tap 📎 → Location.`,buttons:[{id:"find_medicine",text:"🔍 Search Medicine"},{id:"video_consult",text:"🩺 Consult a Doctor"}]};}
function consultPage():WA{return{type:"button",text:`*Online Consultation* 🩺\n${DIV}\n👨‍⚕️ Speak to a licensed clinician from your phone — no travel needed.\n\n🔗 www.chekameds.co.bw/consultant\n\n👆 Tap the link above or visit the website to book your session.`,buttons:[{id:"find_medicine",text:"🔍 Search Medicine"}]};}
function askMed(msg?:string):WA{return{type:"button",text:`${msg?msg+"\n\n":""}*Search Medicine* 🔍\n${DIV}\n💬 Send the name of the medicine, brand, or describe what you need.\n\n_Examples: Panado · Amoxicillin · Esomeprazole · blood pressure pills_\n\n📍 Tip: share your location for nearest results.`,buttons:[{id:"video_consult",text:"🩺 Consult a Doctor"}]};}

function resultsList(query:string,loc:string,opts:Opt[],header?:string,hasUserLoc=false):WA{
  const cap=(s:string)=>s?s[0].toUpperCase()+s.slice(1):s;
  const h=header||`*${cap(query)} — Stock Found* 💊\n${DIV}\n📍 ${prettyLoc(loc)}${hasUserLoc?" · 🚗 sorted by nearest":`\n\n📍 _Share your location (📎 → Location) to see distances_`}\n\n👇 Select a number to view details and reserve.`;
  const rows=opts.map((o,i)=>({id:`item_${i+1}`,title:o.med_name.substring(0,24),description:`🏥 ${o.clinic_name}${o.distance_km!=null?` · 🚗 ${fmtDist(o.distance_km)}`:""} · 💰 ${price(o.price_bwp)}`.substring(0,72)}));
  return{type:"list",text:h,listTitle:"Select a result",listButtonText:"View Stock",sections:[{title:"Available Stock",rows}]};
}

function stockCard(o:Opt,info:{weekday_hours:string|null;weekend_hours:string|null;contact:string|null}):WA{
  const hours=info.weekday_hours?`${info.weekday_hours}${info.weekend_hours?` | ${info.weekend_hours}`:""}`:o.weekday_hours?`${o.weekday_hours}${o.weekend_hours?` | ${o.weekend_hours}`:""}`:null;
  const contact=info.contact?`+${cp(info.contact)}`:o.contact||null;
  const lines=[
    `💊  *${o.med_name}*`,
    `🏥  ${o.clinic_name}`,
    o.location&&hasLoc(o.location)?`📍  ${o.location}`:null,
    o.distance_km!=null?`🚗  ${fmtDist(o.distance_km)} · ${fmtTime(o.distance_km)}`:null,
    contact?`📞  ${contact}`:null,
    hours?`⏰  ${hours}`:null,
    realLink(o.directions_link)?`🗺️  ${realLink(o.directions_link)}`:null,
    `💰  ${price(o.price_bwp)}`,
    `✅  In stock — ready to reserve`,
  ].filter(Boolean).join("\n");
  return{type:"button",
    text:`*Stock Confirmed* ✅\n${DIV}\n${lines}\n${DIV}\n*What would you like to do?* 🤔\n\n👇 Tap a button below or type:\n📦 *Reserve* — hold this item for pickup\n📍 *Change Town* — search a different area\n🩺 *Consult* — speak with a doctor`,
    buttons:[{id:"store",text:"📦 Reserve for Pickup"},{id:"change_location",text:"📍 Change Town"}]
  };
}

async function handle(message:string,phone:string,rawPayload:any):Promise<WA>{
  const txt=ct(message);
  const sess=await readSession(phone);

  // ── OPT-OUT (legal requirement for bulk messaging) ──
  if(OPTOUT.test(txt)){
    try{await sb().from("notification_optouts").upsert({phone:cp(phone),reason:"user_request"},{onConflict:"phone"});}catch(_){}
    return{type:"text",text:`✅ *You've been unsubscribed*\n${DIV}\n🔕 You will no longer receive ChekaMeds announcements or stock alerts.\n\n🔍 You can still search for medicine anytime — just send a medicine name.`};
  }

  // ── LOCATION CAPTURE (all payload shapes) ──
  const locMsg=rawPayload?.location||rawPayload?.data?.location||rawPayload?.message?.location||null;
  const rawLat=locMsg?.latitude??locMsg?.lat??rawPayload?.latitude??rawPayload?.lat??null;
  const rawLng=locMsg?.longitude??locMsg?.lng??locMsg?.lon??rawPayload?.longitude??rawPayload?.lng??null;
  if(rawLat!=null&&rawLng!=null&&!isNaN(Number(rawLat))&&!isNaN(Number(rawLng))){
    const lat=Number(rawLat),lng=Number(rawLng);
    console.log("LOCATION_RECEIVED:",lat,lng);
    const newSess={...sess,user_lat:lat,user_lng:lng};
    await writeSession(phone,newSess);
    if(sess.medicine){
      const searchId=uuid();
      const opts=await search(sess.medicine,"");
      const withDist=await withDistance(opts,lat,lng);
      const sorted=sortByDistance(withDist);
      await writeSession(phone,{...newSess,options:sorted,selected:null,state:"has_results"});
      await logSearch({searchId,query:sess.medicine,normalized:normMed(sess.medicine),resultsCount:sorted.length,phone:cp(phone),location:null,found:sorted.length>0,matched:sorted.map(o=>o.clinic_name),geminiUsed:false,geminiTerm:null,lat,lng});
      await logImpressions(searchId,sess.medicine,sorted,cp(phone),null);
      return resultsList(sess.medicine,"",sorted,undefined,true);
    }
    return{type:"button",text:`📍 *Location saved!* ✅\n${DIV}\n🎯 Now send a medicine name and I'll show you the *nearest* pharmacies with distances and drive times.`,buttons:[{id:"find_medicine",text:"🔍 Search Medicine"}]};
  }

  if(/^(hi|hello|hey|help|menu|start|dumelang|dumela|0)$/.test(txt))return welcome();
  if(CONSULT.test(txt)||txt==="video_consult"||txt.includes("consult"))return consultPage();

  // ── WATCHLIST: notify me when back in stock ──
  if(NOTIFY_ME.test(txt)||txt==="notify_me"){
    if(!sess.medicine)return askMed("💬 Search for a medicine first, then tap *Notify Me*.");
    const opted=await isOptedOut(phone);
    if(opted){try{await sb().from("notification_optouts").delete().eq("phone",cp(phone));}catch(_){}}
    await addToWatchlist(phone,sess.medicine,null);
    return{type:"button",text:`🔔 *You're on the list!*\n${DIV}\n💊 We'll message you the moment *${sess.medicine}* is back in stock at any pharmacy near you.\n\n🔍 Meanwhile, try searching something else.\n\n_Reply STOP anytime to unsubscribe._`,buttons:[{id:"find_medicine",text:"🔍 Search Again"}]};
  }

  if((sess.state==="suggest"&&/^(yes|yep|ya|yeah|sure|ok|okay|correct|right|yebo|ee|eya|confirm)$/.test(txt))||txt==="confirm_suggestion"){
    const suggestion=(sess.selected as any)?.suggestion||sess.medicine;
    if(suggestion){
      await writeSession(phone,{...sess,state:"idle",selected:null});
      return await doSearch(phone,{...sess,state:"idle",selected:null},normMed(suggestion),"",false,null);
    }
  }
  if(/^(change location|change town|location|town|change_location)$/.test(txt)){
    if(!sess.medicine)return askMed("💬 Please send the medicine name first.");
    await writeSession(phone,{...sess,state:"awaiting_location"});
    return{type:"button",text:`*Change Search Area* 📍\n${DIV}\n💊 Medicine: *${sess.medicine}*\n\n🏙️ Choose a town below or type your town name.`,buttons:[{id:"loc_jwaneng",text:"Jwaneng"},{id:"loc_gaborone",text:"Gaborone"},{id:"loc_all",text:"🇧🇼 All Botswana"}]};
  }
  if(RESERVE.test(txt)){
    if(sess.state!=="has_selected"||!sess.selected)return{type:"button",text:`💬 Please search for a medicine first, then select a result, then type *Reserve*.`,buttons:[{id:"find_medicine",text:"🔍 Search Medicine"}]};
    const result=await doReserve(phone,sess.selected);
    await writeSession(phone,{...sess,state:"reserved",selected:null});
    return{type:"text",text:result};
  }
  if(/^(directions|direction|map|where)$/.test(txt)){
    if(sess.state!=="has_selected"||!sess.selected)return{type:"text",text:"💬 Select a medicine result first, then type *directions*."};
    const sel=sess.selected;
    const link=realLink(sel.directions_link);
    const dist=sel.distance_km!=null?`\n🚗 ${fmtDist(sel.distance_km)} · ${fmtTime(sel.distance_km)}`:""
    return{type:"text",text:`*Directions* 🗺️\n${DIV}\n🏥  ${sel.clinic_name}\n📍  ${hasLoc(sel.location)?sel.location:"Contact pharmacy for address"}${dist}\n\n${link?`🗺️  ${link}`:"ℹ️ No directions link on file yet."}`};
  }
  if(sess.state==="awaiting_location"){
    let loc="";
    if(txt.startsWith("loc_"))loc=txt.replace("loc_","").replace("all","").trim();
    else if(txt==="all"||txt.includes("all botswana"))loc="";
    else loc=extractLoc(message);
    return await doSearch(phone,sess,sess.medicine,loc,false,null);
  }
  if(txt.startsWith("loc_")){
    const loc=txt.replace("loc_","");
    if(sess.medicine)return await doSearch(phone,sess,sess.medicine,loc==="all"?"":loc,false,null);
  }
  if(/^[1-5]$/.test(txt)&&sess.state==="has_results"&&sess.options.length){
    const idx=Number(txt)-1;
    const opt=sess.options[idx];
    if(!opt)return{type:"text",text:"⚠️ Invalid choice. Reply with a number from the list."};
    const info=await pInfo(opt.clinic_name);
    const enriched:Opt={...opt,contact:info.contact||opt.contact,weekday_hours:info.weekday_hours||opt.weekday_hours,weekend_hours:info.weekend_hours||opt.weekend_hours};
    await writeSession(phone,{...sess,selected:enriched,state:"has_selected"});
    await markImpression(null,opt.clinic_name,opt.med_name,cp(phone),"selected");
    return stockCard(enriched,info);
  }
  if(txt.startsWith("item_")&&sess.options.length){
    const idx=Number(txt.replace("item_",""))-1;
    const opt=sess.options[idx];
    if(!opt)return{type:"text",text:"⚠️ Invalid choice."};
    const info=await pInfo(opt.clinic_name);
    const enriched:Opt={...opt,contact:info.contact||opt.contact,weekday_hours:info.weekday_hours||opt.weekday_hours,weekend_hours:info.weekend_hours||opt.weekend_hours};
    await writeSession(phone,{...sess,selected:enriched,state:"has_selected"});
    await markImpression(null,opt.clinic_name,opt.med_name,cp(phone),"selected");
    return stockCard(enriched,info);
  }
  if(txt==="find_medicine"||txt==="search")return askMed();

  const explLoc=extractLoc(message);
  const rawMed=explLoc?stripLoc(message,explLoc):ct(message);

  // FIX: a bare location reply to an existing search (e.g. "Am in Gaborone", "I'm in Gaborone")
  // was being sent whole into Gemini/local matching as if it were a fresh medicine query,
  // which correctly found nothing and dead-ended the conversation. If nothing but filler words
  // are left after stripping the town name and we already have a medicine in session, treat it
  // as a location answer and re-run that search instead.
  const FILLER_ONLY=/^((am|is|it|im|i|this|now|here|there|please|pls|and|the|a)\s*)*$/;
  if(explLoc&&sess.medicine&&FILLER_ONLY.test(rawMed)){
    console.log("LOCATION_ONLY_REPLY_ROUTED:", message, "->", sess.medicine, explLoc);
    return await doSearch(phone,sess,sess.medicine,explLoc,false,null);
  }

  const med=normMed(rawMed||message);

  if(!med||med.length<2||/^https?:\/\//.test(med)||JUNK.some(b=>med===b||med.includes(b))){
    // Still record it — junk searches are analytics too
    await logSearch({searchId:uuid(),query:message,normalized:med||ct(message),resultsCount:0,phone:cp(phone),location:explLoc||null,found:false,matched:[],geminiUsed:false,geminiTerm:null,lat:sess.user_lat,lng:sess.user_lng});
    return askMed(`🤔 Could not find a medicine in "${message}".\n\n💬 Send the medicine or brand name.`);
  }

  if(USE_GEMINI&&GEMINI_API_KEY){
    const gemMed=await geminiExtract(message);
    if(gemMed&&gemMed!=="none"&&gemMed.length>=2){
      console.log("GEMINI_ROUTED:", message, "->", gemMed);
      return await doSearch(phone,sess,gemMed,explLoc,true,gemMed);
    }
  }

  return await doSearch(phone,sess,med,explLoc,false,null);
}

async function doSearch(phone:string,sess:Session,medicine:string,location:string,geminiUsed=false,geminiTerm:string|null=null):Promise<WA>{
  const nm=normMed(medicine);
  const searchId=uuid();
  const cPhone=cp(phone);

  let opts=await search(nm,location);

  // Fallback: widen to all Botswana if town-scoped search came back empty
  if(!opts.length&&location){
    opts=await search(nm,"");
    if(opts.length){
      const withDist=await withDistance(opts,sess.user_lat,sess.user_lng);
      const sorted=sess.user_lat?sortByDistance(withDist):pulseFirst(withDist);
      await writeSession(phone,{...sess,medicine:nm,options:sorted,selected:null,state:"has_results"});
      await logSearch({searchId,query:medicine,normalized:nm,resultsCount:sorted.length,phone:cPhone,location:location||null,found:true,matched:sorted.map(o=>o.clinic_name),geminiUsed,geminiTerm,lat:sess.user_lat,lng:sess.user_lng});
      await logImpressions(searchId,medicine,sorted,cPhone,location||null);
      return resultsList(nm,"",sorted,`ℹ️ No stock in ${prettyLoc(location)}.\n\n🇧🇼 Showing results across Botswana:`,sess.user_lat!=null);
    }
  }

  if(!opts.length){
    // ── RECORD THE FAILURE in BOTH tables ──
    await logSearch({searchId,query:medicine,normalized:nm,resultsCount:0,phone:cPhone,location:location||null,found:false,matched:[],geminiUsed,geminiTerm,lat:sess.user_lat,lng:sess.user_lng});
    await logFailed(nm,medicine,cPhone,location||null);

    // GUARDRAIL: suggestion comes from REAL inventory only
    const sug=await findSuggestion(nm);
    if(sug&&ct(sug)!==ct(nm)){
      await writeSession(phone,{...sess,medicine:ct(sug),options:[],selected:{suggestion:sug} as any,state:"suggest"});
      return{type:"button",text:`*Did you mean ${sug}?* 🤔\n${DIV}\n🔍 No results for "${nm}" — this is the closest match *currently in stock*.\n\n✅ Reply *Yes* to search for *${sug}*.`,buttons:[{id:"confirm_suggestion",text:`✅ Yes — ${sug.split(" ")[0]}`},{id:"find_medicine",text:"🔍 Search Again"}]};
    }

    // GUARDRAIL: alternatives are inventory-verified inside geminiAlternatives()
    const alternatives=await geminiAlternatives(nm);
    for(const alt of alternatives){
      if(ct(alt)===ct(nm))continue;
      const altOpts=await search(alt,"");
      if(altOpts.length){
        const altId=uuid();
        const withDist=await withDistance(altOpts,sess.user_lat,sess.user_lng);
        const sorted=sess.user_lat?sortByDistance(withDist):pulseFirst(withDist);
        await writeSession(phone,{...sess,medicine:alt,options:sorted,selected:null,state:"has_results"});
        await logSearch({searchId:altId,query:medicine,normalized:alt,resultsCount:sorted.length,phone:cPhone,location:location||null,found:true,matched:sorted.map(o=>o.clinic_name),geminiUsed:true,geminiTerm:alt,lat:sess.user_lat,lng:sess.user_lng});
        await logImpressions(altId,alt,sorted,cPhone,location||null);
        return resultsList(alt,location,sorted,`💡 "${nm}" is not in stock.\n\n✅ *${alt}* is available and treats the same thing:`,sess.user_lat!=null);
      }
    }

    // Honest empty state + watchlist offer. NO invented stock.
    await writeSession(phone,{...sess,medicine:nm,options:[],selected:null,state:"no_results"});
    return{type:"button",text:`*Not In Stock* ❌\n${DIV}\n😔 No pharmacy on ChekaMeds currently has *"${nm}"*.\n\n🔔 Tap *Notify Me* and we'll message you the moment it arrives.\n\n💡 Or try a brand name or different spelling.`,buttons:[{id:"notify_me",text:"🔔 Notify Me"},{id:"find_medicine",text:"🔍 Try Again"}]};
  }

  const withDist=await withDistance(opts,sess.user_lat,sess.user_lng);
  const sorted=sess.user_lat?sortByDistance(withDist):pulseFirst(withDist);
  await writeSession(phone,{...sess,medicine:nm,options:sorted,selected:null,state:"has_results"});
  await logSearch({searchId,query:medicine,normalized:nm,resultsCount:sorted.length,phone:cPhone,location:location||null,found:true,matched:sorted.map(o=>o.clinic_name),geminiUsed,geminiTerm,lat:sess.user_lat,lng:sess.user_lng});
  await logImpressions(searchId,medicine,sorted,cPhone,location||null);
  return resultsList(nm,location,sorted,undefined,sess.user_lat!=null);
}

serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  const url=new URL(req.url);const isTest=url.searchParams.get("test")==="true";
  try{
    if(req.method==="GET"){
      const q=url.searchParams.get("query");
      if(!q)return new Response(JSON.stringify({status:"ok",version:"v119",features:{pulse_top_slots:PULSE_TOP_SLOTS,result_slots:RESULT_SLOTS,gemini_enabled:!!GEMINI_API_KEY,gemini_guardrails:"inventory_verified",analytics:"full_attribution",watchlist:true,optout:true}}),{headers:{...cors,"Content-Type":"application/json"}});
      const r=await handle(q,"GET",{});
      return new Response(JSON.stringify({reply:r}),{headers:{...cors,"Content-Type":"application/json"}});
    }
    const raw=await req.text();
    let body:any={};
    try{body=req.headers.get("content-type")?.includes("x-www-form-urlencoded")?Object.fromEntries(new URLSearchParams(raw).entries()):JSON.parse(raw||"{}");}catch(_){body={};}
    console.log("RAW_PAYLOAD", JSON.stringify(body).substring(0,500));
    const payload=body?.data&&typeof body.data==="object"?body.data:body;
    const from=cp(String(payload.from||payload.sender||payload.author||payload.chatId||""));
    const msgBody=extractMsg(payload);
    const hasLocMsg=!!(payload.location?.latitude||payload.data?.location?.latitude||payload.latitude||payload.location?.lat);
    if(!from||(!msgBody&&!hasLocMsg)){
      await logEntry({source:isTest?"test":"incoming",from_number:from,message_body:msgBody,response_status:200,error_message:"no_message",raw_payload:body});
      return new Response(JSON.stringify({status:"no_message"}),{headers:{...cors,"Content-Type":"application/json"}});
    }
    const reply=await handle(msgBody||"[location]",from,payload);
    let sendErr="";
    if(!isTest){try{await sendWA(from,reply);}catch(e){sendErr=e instanceof Error?e.message:String(e);}}
    await logEntry({source:isTest?"test":"incoming",from_number:from,message_body:msgBody||"[location]",reply_text:JSON.stringify(reply),response_status:sendErr?500:200,error_message:sendErr||null,raw_payload:body});
    return new Response(JSON.stringify({status:sendErr?"send_failed":"replied",to:from,reply:isTest?reply:undefined,error:sendErr||undefined}),{status:sendErr?500:200,headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){
    const err=e instanceof Error?e.message:String(e);
    await logEntry({source:"incoming",response_status:500,error_message:err});
    return new Response(JSON.stringify({error:err}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  }
});