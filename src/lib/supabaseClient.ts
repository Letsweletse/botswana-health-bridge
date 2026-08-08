import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://kcgsxxwgzrmsnnxvpkvi.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZ3N4eHdnenJtc25ueHZwa3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Njc4NjcsImV4cCI6MjA5NDI0Mzg2N30.k7YPpQozgvFxATCgs61YOe_jyMTreifxNydOWgX_ZqM";
export const STOCK_TRANSACTION_URL = `${SUPABASE_URL}/functions/v1/stock-transaction`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const invokeStockTransaction = async (payload: Record<string, any>) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(STOCK_TRANSACTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return { data: json };
};
