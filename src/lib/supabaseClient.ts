// Re-export the existing app Supabase client so the scanner uses the same session
import { supabase } from "@/integrations/supabase/client";

export { supabase };

export const SUPABASE_URL = "https://kcgsxxwgzrmsnnxvpkvi.supabase.co";
export const STOCK_TRANSACTION_URL = `${SUPABASE_URL}/functions/v1/stock-transaction`;

export const invokeStockTransaction = async (payload: Record<string, any>) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not logged in. Please sign in first.");
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
