import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const DIV = "───────────────";
const RESERVATION_HOURS = 3;
const PRIORITY_CLINIC = "pulse pharmacy tati siding";
const KNOWN_LOCATIONS = ["jwaneng","gaborone","francistown","maun","kasane","palapye","serowe","lobatse","kanye","molepolole","tlokweng","mogoditshane","ramotswa","orapa","letlhakane","selebi phikwe","selibe phikwe","ghanzi","tsabong","hukuntsi","shakawe","gumare","masunga","tati siding","tati","tutume"];
const LOCATION_NUMBER_MAP: Record<string,string> = {"1":"jwaneng","2":"gaborone","3":""};
const NON_MEDICINE_WORDS = ["gold plated","regular gold","necklace","bracelet","earring","earrings","perfume","hair piece","hairpiece","body spray","toy","watch"];
const JUNK_SEARCH_WORDS = ["google","facebook","youtube","instagram","tiktok","gmail","whatsapp","website","url","link","login","password"];
const RESERVE_PHRASES = /^(store|pay at store|cash|cash payment|reserve|reserve pickup|reserve pick up|pickup|pick up|collect|pay|reserv|reserb|resrv|reseve|resrve|proceed|i want to reserve|i want to collect|i will collect|i will pick up|pay in store|pay at counter)$/;

type Row = { clinic_name: string; med_name: string; quantity: number; price_bwp: number|null; location?: string|null; directions_link?: string|null; contact?: string|null; strength?: string|null; dosage_form?: string|null; generic_name?: string|null; brand_name?: string|null; search_tokens?: string|null; approved?: boolean|null; };
type SessionOption = { clinic_name: string; med_name: string; quantity: number; price_bwp: number|null; location: string|null; directions_link?: string|null; contact?: string|null; };
type SessionData = { medicine?: string; options?: SessionOption[]; selected?: any; };
type NativeWhatsAppPayload = { type: "text"|"button"|"list"; text?: string; buttons?: Array<{id:string;text:string}>; listTitle?: string; listButtonText?: string; sections?: Array<{title:string;rows:Array<{id:string;title:string;description?:string}>}>; };

function db(){return createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);}
function cleanText(v:string|null|undefined){return String(v||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
function cleanPhone(raw:string){let p=String(raw||"").replace("@c.us","").replace("@s.whatsapp.net","").replace(/^\+/,"").replace(/[^0-9]/g,"");if(p.length===8)p=`267${p}`;if(p.length===10&&p.startsWith("0"))p=`267${p.slice(1)}`;return p;}
function stripSearchNoise(v:string){return cleanText(v).replace(/\b(please|pls|plz|find|search|check|stock|stok|stork|sotir|available|availability|avail|medicine|medication|meds|drug|tablet|tablets|tab|tabs|capsule|capsules|syrup|cream|ointment|price|need|looking|for|do|you|have|where|can|i|get|is|there|near|me)\b/g," ").replace(/\s+/g," ").trim();}

function normalizeMedicine(message:string){
  let text=stripSearchNoise(message);
  const corrections:Record<string,string>={panado:"paracetamol",panadol:"paracetamol",panadoo:"paracetamol",panodo:"paracetamol",panadole:"paracetamol",paracetmol:"paracetamol",parecetamol:"paracetamol",parasetamol:"paracetamol",paracitamol:"paracetamol",paracet:"paracetamol",parecet:"paracetamol",paraml:"paracetamol",parml:"paracetamol",paractml:"paracetamol",brufen:"ibuprofen",ibrufen:"ibuprofen",ibrofen:"ibuprofen",ibuprofin:"ibuprofen",ibuprofane:"ibuprofen",amoxil:"amoxicillin",amoxilin:"amoxicillin",amoxycillin:"amoxicillin",amoxy:"amoxicillin",allergex:"chlorpheniramine",alergex:"chlorpheniramine",allegex:"chlorpheniramine",allejex:"chlorpheniramine",disprin:"aspirin",asprin:"aspirin",cetrezine:"cetirizine",cetrizine:"cetirizine",citrizine:"cetirizine",omperazole:"omeprazole",esomperazole:"esomeprazole",esomep:"esomeprazole",citrosoda:"citro soda",canesten:"clotrimazole",candid:"clotrimazole",gaviscon:"sodium alginate",gavison:"sodium alginate",graviscon:"sodium alginate",metfomin:"metformin",metformine:"metformin",losaten:"losartan",losartin:"losartan",amlodipin:"amlodipine",amlodipene:"amlodipine",atovastatin:"atorvastatin",atorva:"atorvastatin",azitromycin:"azithromycin",zithromax:"azithromycin",cipro:"ciprofloxacin",ciprofloxacine:"ciprofloxacin",doxy:"doxycycline",declofenac:"diclofenac",voltaren:"diclofenac",hydrocordisone:"hydrocortisone",ventolin:"salbutamol",salbutomol:"salbutamol",insuline:"insulin",coartem:"artemether lumefantrine",lumartem:"artemether lumefantrine"};
  if(corrections[text])return corrections[text];
  for(const[w,r]of Object.entries(corrections))text=text.replace(new RegExp(`\\b${w}\\b`,"g"),r);
  return text.replace(/\s+/g," ").trim();
}

function looksLikeJunkSearch(q:string){const t=stripSearchNoise(q);if(!t)return true;if(/^https?:\/\//.test(t))return true;if(JUNK_SEARCH_WORDS.some(b=>t===b||t.includes(b)))return true;if(NON_MEDICINE_WORDS.some(b=>t.includes(b)))return true;if(t.length<=1)return true;return false;}
function extractLocation(m:string){const t=cleanText(m);return KNOWN_LOCATIONS.find(l=>t.includes(l))|| "";}
function removeLocation(m:string,l:string){let t=cleanText(m);if(!l)return t;t=t.replace(new RegExp(`\\b${l}\\b`,"g")," ").replace(/\bnear me\b/g," ").replace(/\bin\b/g," ").replace(/\bat\b/g," ");return t.replace(/\s+/g," ").trim();}
function prettyLocation(l:string){if(!l)return"All Botswana";return l.split(" ").filter(Boolean).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(" ");}
function hasRealLocation(l?:string|null){const v=cleanText(l);return v!==""&&v!=="botswana"&&v!=="unknown"&&v!=="not listed"&&v!=="n a";}
function realDirections(link?:string|null){const v=String(link||"").trim();const lo=v.toLowerCase();if(!/^https:\/\//i.test(v))return"";if(lo.includes("example")||lo.includes("placeholder")||lo.includes("fake")||lo.includes("test"))return"";return v;}
function isNonMedicine(row:Row){return NON_MEDICINE_WORDS.some(b=>cleanText(row.med_name).includes(b));}
function isProductionRow(row:Row){const c=cleanText(row.clinic_name);const m=cleanText(row.med_name);if(!c||!m)return false;if(c.includes("chekameds admin"))return false;if(["demo","test","sample","mock","trial"].some(b=>c.includes(b)))return false;if(row.approved===false)return false;if(isNonMedicine(row))return false;return Number(row.quantity)>0;}
function medicineText(row:Row){return cleanText([row.med_name,row.generic_name,row.brand_name,row.strength,row.dosage_form,row.search_tokens].filter(Boolean).join(" "));}
function locationText(row:Row){return cleanText([row.location,row.clinic_name].filter(Boolean).join(" "));}
function uniqueTerms(values:string[]){const terms=new Set<string>();for(const v of values){const c=stripSearchNoise(v);if(!c)continue;terms.add(c);c.split(" ").filter(p=>p.length>=3).forEach(p=>terms.add(p));}return Array.from(terms).slice(0,60);}
function levenshtein(a:string,b:string){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;const prev=Array.from({length:b.length+1},(_,i)=>i);const curr=Array.from({length:b.length+1},()=>0);for(let i=1;i<=a.length;i++){curr[0]=i;for(let j=1;j<=b.length;j++)curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=curr[j];}return prev[b.length];}
function similarity(a:string,b:string){const l=cleanText(a);const r=cleanText(b);if(!l||!r)return 0;const m=Math.max(l.length,r.length);return m===0?0:1-levenshtein(l,r)/m;}

async function findClosestMedicine(query:string):Promise<string|null>{
  const q=cleanText(query);
  if(q.length<3)return null;
  try{
    const{data}=await db().from("clinic_inventory").select("med_name,generic_name,brand_name").gt("quantity",0).neq("clinic_name","ChekaMeds Admin").limit(3000);
    if(!data?.length)return null;
    const names=new Set<string>();
    for(const row of data){if(row.med_name)names.add(cleanText(row.med_name));if(row.generic_name)names.add(cleanText(row.generic_name));if(row.brand_name)names.add(cleanText(row.brand_name));}
    let bestName="",bestScore=0;
    for(const name of names){
      if(!name||name.length<3)continue;
      let score=similarity(q,name);
      if(name.startsWith(q.slice(0,3)))score+=0.2;
      if(name.includes(q))score+=0.3;
      if(name.startsWith(q))score+=0.4;
      for(const word of name.split(" "))if(word.length>=4&&similarity(q,word)>0.75)score+=0.15;
      if(score>bestScore&&score>=0.55){bestScore=score;bestName=name;}
    }
    if(!bestName)return null;
    return bestName.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
  }catch(_){return null;}
}

async function expandedMedicineTerms(query:string){const normalized=normalizeMedicine(query);const terms=[query,normalized];try{const{data}=await db().from("medicine_aliases").select("alias,canonical_name").limit(2000);const q=cleanText(normalized);for(const item of data||[]){const alias=cleanText((item as any).alias||"");const canonical=cleanText((item as any).canonical_name||"");if(!alias||!canonical)continue;if(alias.includes(q)||canonical.includes(q)||q.includes(alias)||q.includes(canonical)){terms.push(alias,canonical);}}}catch(_){}const s=cleanText(query);if(/\b(flu|cold|fever|temperature|headache|pain)\b/.test(s))terms.push("paracetamol","ibuprofen","cold","flu");if(/\b(heartburn|reflux|acid|ulcer)\b/.test(s))terms.push("omeprazole","esomeprazole","antacid");if(/\b(allergy|allergies|rash|itch|itching)\b/.test(s))terms.push("allergex","cetirizine","chlorpheniramine","loratadine");if(/\b(cough|throat)\b/.test(s))terms.push("cough","syrup","lozenges");if(/\b(diarrhea|diarrhoea|stomach|vomit|nausea)\b/.test(s))terms.push("oral rehydration","diarrhoea","antacid");return uniqueTerms(terms);}
function bestFuzzyMedicineScore(row:Row,terms:string[]){const candidates=[row.med_name,row.generic_name,row.brand_name].filter(Boolean).flatMap(v=>{const c=cleanText(v);return[c,...c.split(" ").filter(p=>p.length>=4)];});let best=0;for(const term of terms.map(cleanText).filter(t=>t.length>=4))for(const c of candidates){const s=similarity(term,c);if(s>best)best=s;}return best;}
function scoreRow(row:Row,terms:string[],wantedLocation:string){const med=cleanText(row.med_name);const searchable=medicineText(row);let score=0;for(const term of terms.map(cleanText).filter(Boolean)){if(med===term)score+=360;if(med.startsWith(term))score+=210;if(searchable.includes(term))score+=140;for(const part of term.split(" ").filter(p=>p.length>=3)){if(searchable.includes(part))score+=28;}}const fuzzy=bestFuzzyMedicineScore(row,terms);if(fuzzy>=0.92)score+=180;else if(fuzzy>=0.84)score+=115;else if(fuzzy>=0.76)score+=65;if(wantedLocation&&locationText(row).includes(wantedLocation))score+=500;if(hasRealLocation(row.location))score+=12;if(realDirections(row.directions_link))score+=8;if(row.price_bwp!=null)score+=8;score+=Math.min(Number(row.quantity)||0,50)/10;return score;}

function diversifyByPharmacy(scoredRows:{row:Row;score:number}[],max=5){
  const buckets=new Map<string,Row[]>();
  const clinicOrder:string[]=[];
  const seen=new Set<string>();

  // Sort scored rows but always put PRIORITY_CLINIC first
  const sorted=[...scoredRows].sort((a,b)=>{
    const ac=cleanText(a.row.clinic_name);
    const bc=cleanText(b.row.clinic_name);
    if(ac===PRIORITY_CLINIC&&bc!==PRIORITY_CLINIC)return -1;
    if(bc===PRIORITY_CLINIC&&ac!==PRIORITY_CLINIC)return 1;
    return b.score-a.score;
  });

  for(const item of sorted){
    const row=item.row;
    const clinic=cleanText(row.clinic_name||"unknown");
    const key=cleanText(`${row.clinic_name}|${row.med_name}|${row.strength||""}|${row.location||""}`);
    if(!clinic||seen.has(key))continue;
    seen.add(key);
    if(!buckets.has(clinic)){buckets.set(clinic,[]);clinicOrder.push(clinic);}
    buckets.get(clinic)!.push(row);
  }
  const output:Row[]=[];
  for(let depth=0;output.length<max;depth++){let added=false;for(const clinic of clinicOrder){const row=buckets.get(clinic)?.[depth];if(row&&output.length<max){output.push(row);added=true;}}if(!added)break;}
  return output;
}

async function loadInventoryRows(){let rows:Row[]=[];try{const{data,error}=await db().from("clinic_inventory").select("clinic_name,med_name,quantity,price_bwp,location,directions_link,contact,strength,dosage_form,generic_name,brand_name,search_tokens").gt("quantity",0).neq("clinic_name","ChekaMeds Admin").limit(5000);if(error)throw error;rows=[...rows,...((data||[])as Row[])];}catch(e){console.error("inventory load failed",e);}return rows;}
async function searchStock(query:string,wantedLocation:string){const terms=await expandedMedicineTerms(query);const rows=await loadInventoryRows();const scored=rows.filter(isProductionRow).filter(row=>!wantedLocation||locationText(row).includes(wantedLocation)).map(row=>({row,score:scoreRow(row,terms,wantedLocation)})).filter(item=>item.score>=45).sort((a,b)=>{if(b.score!==a.score)return b.score-a.score;return String(a.row.clinic_name||"").localeCompare(String(b.row.clinic_name||""));});return{rows:diversifyByPharmacy(scored,5),terms};}
async function getSession(phone:string):Promise<SessionData|null>{try{const{data}=await db().from("whatsapp_sessions").select("*").eq("from_number",cleanPhone(phone)).maybeSingle();if(!data)return null;return{medicine:data.medicine||"",options:Array.isArray(data.options)?data.options:[],selected:data.selected||null};}catch(_){return null;}}
async function saveSession(phone:string,data:SessionData){try{await db().from("whatsapp_sessions").upsert({from_number:cleanPhone(phone),medicine:data.medicine||"",options:(data.options||[])as any,selected:(data.selected||null)as any,updated_at:new Date().toISOString()},{onConflict:"from_number"});}catch(e){console.error("session save failed",e);}}
function price(v:number|null|undefined){return v!=null?`P${Number(v).toFixed(2)}`:`Price unavailable`;}
function toOption(row:Row):SessionOption{return{clinic_name:row.clinic_name,med_name:row.med_name,quantity:Number(row.quantity),price_bwp:row.price_bwp==null?null:Number(row.price_bwp),location:row.location||null,directions_link:realDirections(row.directions_link)||null,contact:row.contact||null};}
function locationFromReply(message:string){const t=cleanText(message);if(LOCATION_NUMBER_MAP[t]!==undefined)return LOCATION_NUMBER_MAP[t];if(t.includes("all botswana")||t==="botswana"||t==="all"||t==="search all botswana")return"";if(t.startsWith("loc_")){const k=t.replace("loc_","");return k==="all"?"":k;}return extractLocation(message);}
function promptForMedicine(message?:string):NativeWhatsAppPayload{const prefix=message?`${message}\n\n`:"";return{type:"button",text:`${prefix}💊 *Search Stock*\n\nType the medicine, brand, or generic name.\n\nExamples:\n*Panado*\n*Paracetamol*\n*Amoxicillin*\n*Esomeprazole*`,buttons:[{id:"video_consult",text:"Consult Doctor"}]};}
function formatWelcomeMenu():NativeWhatsAppPayload{return{type:"button",text:`👋 *Welcome to ChekaMeds*\n\nFind listed medicine availability in pharmacies near you.\n\n${DIV}\n\n📝 *How to search:*\nType the medicine name directly.\n\nExamples:\n*panado*\n*paracetmol*\n*amoxilin gaborone*\n*esomep jwaneng*\n\nChekaMeds will correct common spelling mistakes and show close stock matches.`,buttons:[{id:"find_medicine",text:"Search Stock"},{id:"video_consult",text:"Consult Doctor"}]};}
async function facilityWhatsAppNumber(clinicName:string){try{const{data}=await db().from("chekameds_facilities").select("phone_whatsapp").ilike("facility_name",`%${clinicName.trim()}%`).not("phone_whatsapp","is",null).limit(1).maybeSingle();return cleanPhone(String((data as any)?.phone_whatsapp||""));}catch(_){return"";}}

async function sendPharmacyNotification(pharmacyPhone:string, message:string, pharmacy:string, medicine:string):Promise<{sent:boolean;error:string;response:any}>{
  const instanceId=Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token=Deno.env.get("ULTRAMSG_TOKEN");
  if(!instanceId||!token)return{sent:false,error:"UltraMsg env vars missing",response:null};
  try{
    const r=await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,to:pharmacyPhone,body:message,priority:10})});
    const json=await r.json();
    const sent=json?.sent==="true"||json?.sent===true;
    try{await db().from("pharmacy_notification_logs").insert({pharmacy,pharmacy_phone:pharmacyPhone,medicine,sent,error:sent?null:JSON.stringify(json),ultramsg_response:json});}catch(_){}
    return{sent,error:sent?"":JSON.stringify(json),response:json};
  }catch(e:any){
    const err=e.message||String(e);
    try{await db().from("pharmacy_notification_logs").insert({pharmacy,pharmacy_phone:pharmacyPhone,medicine,sent:false,error:err,ultramsg_response:null});}catch(_){}
    return{sent:false,error:err,response:null};
  }
}

async function reserve(phone:string,selected:SessionOption){
  const customerPhone=cleanPhone(phone);
  let pharmacyPhone=cleanPhone(String(selected.contact||""));
  if(pharmacyPhone.length<11)pharmacyPhone=await facilityWhatsAppNumber(selected.clinic_name);
  // Fallback: check pharmacies table directly
  if(pharmacyPhone.length<11){
    try{const{data}=await db().from("pharmacies").select("contact").ilike("clinic_name",`%${selected.clinic_name}%`).maybeSingle();if(data?.contact)pharmacyPhone=cleanPhone(String(data.contact));}catch(_){}
  }
  const now=new Date();
  const expiresAt=new Date(now.getTime()+RESERVATION_HOURS*60*60*1000);
  const expiresAtISO=expiresAt.toISOString();
  const expiresTime=expiresAt.toLocaleTimeString("en-BW",{hour:"2-digit",minute:"2-digit",hour12:true});
  const expiresDate=expiresAt.toLocaleDateString("en-BW",{weekday:"short",month:"short",day:"numeric"});
  const mapLink=realDirections(selected.directions_link);
  let pharmacyNotified=false;
  let notifyError="";
  if(pharmacyPhone.length>=11&&pharmacyPhone!==customerPhone){
    const notifyMsg=`🔔 *New ChekaMeds Reservation*\n\n💊 Medicine: *${selected.med_name}*\n💰 Price: *${price(selected.price_bwp)}*\n👤 Customer WhatsApp: +${customerPhone}\n🏥 Facility: *${selected.clinic_name}*\n⏰ Reserved for: *${RESERVATION_HOURS} hours*\n🕐 Expires: *${expiresTime} on ${expiresDate}*\n\n${DIV}\nPlease prepare this item. If customer does not collect by ${expiresTime}, the reservation expires and you may release the stock.`;
    const result=await sendPharmacyNotification(pharmacyPhone,notifyMsg,selected.clinic_name,selected.med_name);
    pharmacyNotified=result.sent;
    notifyError=result.error;
  }
  const notifyNote=pharmacyNotified?`Pharmacy notified at ${pharmacyPhone}.`:pharmacyPhone?`Pharmacy notify FAILED [${notifyError}] for ${pharmacyPhone}.`:"No pharmacy WhatsApp on file.";
  try{await db().from("order_requests").insert({from_number:customerPhone,medicine:selected.med_name,pharmacy:selected.clinic_name,pharmacy_phone:pharmacyPhone.length>=11?pharmacyPhone:null,amount:selected.price_bwp==null?null:Number(selected.price_bwp),payment_status:"pending_store_payment",status:"reserved",expires_at:expiresAtISO,notes:`Expires ${expiresTime} ${expiresDate}. ${notifyNote}`});}catch(e){console.error("order insert failed",e);}
  return `🏪 *Reservation Confirmed*\n\n💊 *${selected.med_name}*\n🏥 *${selected.clinic_name}*\n💰 Amount: *${price(selected.price_bwp)}*\n\n⏰ *Reserved for ${RESERVATION_HOURS} hours*\n🕐 Expires: *${expiresTime} on ${expiresDate}*\n\n${pharmacyNotified?"✅ The pharmacy has been notified and is preparing your item.\n":"📞 Please contact the pharmacy directly to confirm.\n"}${mapLink?`🗺️ Directions: ${mapLink}\n`:""}${DIV}\n⚠️ *Please collect before ${expiresTime}.*\nIf you do not collect, your reservation will expire and the stock may be released.\n\nPay at the counter when you collect.`;
}

function payloadToText(payload:NativeWhatsAppPayload):string{if(payload.type==="text")return payload.text||"";if(payload.type==="button"){const hints=(payload.buttons||[]).map(b=>`▪️ *${b.text}*`).join("\n");return`${payload.text||""}${hints?`\n\n👇 Reply with one of:\n${hints}`:""}`;} if(payload.type==="list"){const rows=(payload.sections||[]).flatMap(s=>s.rows);const lines=rows.map((r,i)=>`*${i+1}.* ${r.title}${r.description?`\n    ${r.description}`:""}`).join("\n");return`${payload.text||""}\n\n${lines}\n\n👇 Reply with a number (1-${rows.length}) to select.`;}return payload.text||"";}
async function sendWhatsApp(to:string,payload:NativeWhatsAppPayload){const instanceId=Deno.env.get("ULTRAMSG_INSTANCE_ID");const token=Deno.env.get("ULTRAMSG_TOKEN");if(!instanceId||!token)throw new Error("UltraMsg env vars missing");const response=await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,to:cleanPhone(to),body:payloadToText(payload),priority:10})});const data=await response.json();if(!response.ok||data?.sent==="false"||data?.error)throw new Error(`UltraMsg failure: ${JSON.stringify(data)}`);}
async function logWebhook(entry:any){try{await db().from("whatsapp_webhook_logs").insert(entry);}catch(_){}try{await db().from("whatsapp_webhook_events").insert({provider:"ultramsg",from_phone:entry.from_number||null,message_text:entry.message_body||null,message_type:"chat",raw_payload:entry.raw_payload||{},status:entry.error_message?"error":"received",error:entry.error_message||null});}catch(_){}}
function extractInteractiveMessage(payload:any){return String(payload.body||payload.message||payload.text||payload.list_reply?.id||payload.button_reply?.id||payload.interactive?.list_reply?.id||payload.interactive?.button_reply?.id||payload.data?.list_reply?.id||payload.data?.button_reply?.id||"");}

async function processMessage(message:string,phone:string):Promise<NativeWhatsAppPayload>{
  const text=cleanText(message);
  const session=await getSession(phone);
  const pendingLocation=session?.selected?.status==="awaiting_location";
  if(/^(hi|hello|hey|help|menu|start|dumelang|dumela|0)$/.test(text))return formatWelcomeMenu();
  if(/^(video consult|consult|doctor|consult doctor|online consultation|online consult|video)$/.test(text)||text==="video_consult")return{type:"button",text:`🩺 *Book an Online Video Consultation*\n\nSpeak to a clinician from your phone.\n\n🔗 Start here:\nhttps://www.chekameds.co.bw/consultant`,buttons:[{id:"find_medicine",text:"Search Stock"}]};
  if(text==="confirm_suggestion"||(session?.selected?.status==="awaiting_confirmation"&&/^(yes|yep|ya|yeah|sure|ok|okay|correct|right|yebo|ee|eya|confirm)$/.test(text))){const suggestion=session?.selected?.suggestion||session?.medicine||"";if(suggestion)return await runMedicineSearch(phone,suggestion,"");}
  if(text==="find_medicine"||text==="search"||text==="stock"||text==="search stock")return promptForMedicine();
  if(/^(change location|location|change town|town)$/.test(text)||text==="change_location"){if(!session?.medicine)return promptForMedicine("Please send the medicine name first.");await saveSession(phone,{medicine:session.medicine,options:[],selected:{status:"awaiting_location",medicine:session.medicine}});return{type:"button",text:`📍 *Change Search Area*\n\nMedicine: *${session.medicine}*\n\nChoose a town or type your town directly.`,buttons:[{id:"loc_jwaneng",text:"Jwaneng"},{id:"loc_gaborone",text:"Gaborone"},{id:"loc_all",text:"All Botswana"}]};}
  if(RESERVE_PHRASES.test(text)||text==="store"){if(!session?.selected||session.selected.status==="awaiting_location")return{type:"button",text:`⚠️ To reserve, please search for a medicine first and select it from the results.\n\nWhat medicine are you looking for?`,buttons:[{id:"find_medicine",text:"Search Medicine"}]};return{type:"text",text:await reserve(phone,session.selected as SessionOption)};}
  if(/^(directions|direction|map|where|send location)$/.test(text)){if(!session?.selected||session.selected.status==="awaiting_location")return{type:"text",text:"Please choose an option from your search first."};const selected=session.selected as SessionOption;const maps=realDirections(selected.directions_link);return{type:"text",text:`🧭 *Directions to Pharmacy*\n\n🏥 *${selected.clinic_name}*\n📍 Location: ${hasRealLocation(selected.location)?selected.location:"Listed"}\n\n${maps?`🗺️ View Map: ${maps}`:"Directions link not supplied by pharmacy."}`};}
  let processedInput=message;
  if(text.startsWith("loc_")){const locKey=text.replace("loc_","");processedInput=locKey==="all"?"all botswana":locKey;}
  if(pendingLocation){const medicine=session?.selected?.medicine||session?.medicine||"";const selectedLocation=locationFromReply(processedInput);return await runMedicineSearch(phone,medicine,selectedLocation);}
  if((/^[1-5]$/.test(text)||text.startsWith("item_"))&&session?.options?.length){const indexStr=text.startsWith("item_")?text.replace("item_",""):text;const selected=session.options[Number(indexStr)-1];if(!selected)return{type:"text",text:"Invalid selection. Please pick from the stock list."};await saveSession(phone,{medicine:session.medicine||selected.med_name,options:session.options,selected});const dirLink=realDirections(selected.directions_link);return{type:"button",text:`✅ *Stock Selected*\n\n💊 *${selected.med_name}*\n🏥 Pharmacy: *${selected.clinic_name}*\n💰 Price: *${price(selected.price_bwp)}*\n📍 Area: ${hasRealLocation(selected.location)?selected.location:"Listed"}\n📦 Status: In stock\n\n${dirLink?`📍 Map: ${dirLink}\n`:""}${DIV}\nChoose what you want to do next:`,buttons:[{id:"store",text:"Reserve Pickup"},{id:"change_location",text:"Change Town"}]};}
  const explicitLocation=extractLocation(message);
  const rawMedicine=removeLocation(message,explicitLocation);
  const medicine=normalizeMedicine(rawMedicine||message);
  if(looksLikeJunkSearch(medicine))return promptForMedicine(`I could not identify a medicine name from *${message}*.`);
  return await runMedicineSearch(phone,medicine,explicitLocation);
}

async function runMedicineSearch(phone:string,medicine:string,location:string):Promise<NativeWhatsAppPayload>{
  const normalizedMedicine=normalizeMedicine(medicine);
  const{rows}=await searchStock(normalizedMedicine,location);
  if(!rows.length&&location){const all=await searchStock(normalizedMedicine,"");if(all.rows.length){const options=all.rows.map(toOption);await saveSession(phone,{medicine:normalizedMedicine,options,selected:null});return generateListMenu(normalizedMedicine,"",all.rows,`No stock found in ${prettyLocation(location)}. Showing close matches across Botswana:`);}}
  if(!rows.length){
    try{await db().from("failed_searches").insert({query:normalizedMedicine,source:"whatsapp",user_phone:cleanPhone(phone)});}catch(_){}
    const suggestion=await findClosestMedicine(normalizedMedicine);
    if(suggestion&&suggestion.toLowerCase()!==normalizedMedicine.toLowerCase()){await saveSession(phone,{medicine:suggestion.toLowerCase(),options:[],selected:{status:"awaiting_confirmation",suggestion}});return{type:"button",text:`🤔 *Did you mean...*\n\n💊 *${suggestion}*?\n\nI couldn't find *${normalizedMedicine}* but this is the closest match in our system.\n\nReply *Yes* to search for *${suggestion}* or tap Search Again to try a different name.`,buttons:[{id:"confirm_suggestion",text:`Yes, ${suggestion.split(" ")[0]}`},{id:"find_medicine",text:"Search Again"}]};}
    return{type:"button",text:`🔎 *No Stock Found*\n\nNo listings matched *${normalizedMedicine}*.\n\nTry a brand name, generic name, or shorter spelling.\n\nExamples:\n*panado* · *amoxicillin* · *esomeprazole*`,buttons:[{id:"find_medicine",text:"Search Again"},{id:"video_consult",text:"Consult Doctor"}]};
  }
  const options=rows.map(toOption);
  await saveSession(phone,{medicine:normalizedMedicine,options,selected:null});
  return generateListMenu(normalizedMedicine,location,rows);
}

function generateListMenu(query:string,location:string,rows:Row[],customHeader?:string):NativeWhatsAppPayload{const sectionRows=rows.map((row,i)=>({id:`item_${i+1}`,title:`${row.med_name}`.substring(0,24),description:`${row.clinic_name} • ${price(row.price_bwp)}`.substring(0,72)}));return{type:"list",text:customHeader||`💊 *ChekaMeds Stock Results*\n\nShowing close stock matches for *${query}* in *${prettyLocation(location)}*.\n\n👇 Reply with a number below to choose an item and view details or reserve.`,listTitle:"Select Medication",listButtonText:"View Stock",sections:[{title:"Available Stock",rows:sectionRows}]};}

serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
  const url=new URL(req.url);
  const isTest=url.searchParams.get("test")==="true";
  try{
    if(req.method==="GET"){const query=url.searchParams.get("query");if(!query)return new Response(JSON.stringify({status:"ok",message:"ChekaMeds WhatsApp webhook active"}),{headers:{...corsHeaders,"Content-Type":"application/json"}});const outPayload=await processMessage(query,"GET");return new Response(JSON.stringify({reply:outPayload.text||outPayload}),{headers:{...corsHeaders,"Content-Type":"application/json"}});}
    const raw=await req.text();
    let body:any={};
    try{body=req.headers.get("content-type")?.includes("x-www-form-urlencoded")?Object.fromEntries(new URLSearchParams(raw).entries()):JSON.parse(raw||"{}");}catch(_){body={};}
    const payload=body?.data&&typeof body.data==="object"?body.data:body;
    const from=cleanPhone(String(payload.from||payload.sender||payload.author||payload.chatId||""));
    const messageBody=extractInteractiveMessage(payload);
    if(!from||!messageBody){await logWebhook({source:isTest?"test":"incoming",from_number:from,message_body:messageBody,response_status:200,error_message:"no_message",raw_payload:body});return new Response(JSON.stringify({status:"no_message"}),{headers:{...corsHeaders,"Content-Type":"application/json"}});}
    const replyPayload=await processMessage(messageBody,from);
    let sendError="";
    if(!isTest){try{await sendWhatsApp(from,replyPayload);}catch(e){sendError=e instanceof Error?e.message:String(e);}}
    await logWebhook({source:isTest?"test":"incoming",from_number:from,message_body:messageBody,reply_text:JSON.stringify(replyPayload),response_status:sendError?500:200,error_message:sendError||null,raw_payload:body});
    return new Response(JSON.stringify({status:sendError?"send_failed":"replied",to:from,reply:isTest?replyPayload:undefined,error:sendError||undefined}),{status:sendError?500:200,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }catch(e){const error=e instanceof Error?e.message:String(e);await logWebhook({source:isTest?"test":"incoming",response_status:500,error_message:error});return new Response(JSON.stringify({error}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});}
});
