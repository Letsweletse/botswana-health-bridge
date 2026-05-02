import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WebhookLog {
  id: string;
  source: string;
  from_number: string | null;
  message_body: string | null;
  reply_text: string | null;
  response_status: number | null;
  error_message: string | null;
  raw_payload: unknown;
  created_at: string;
}

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

export default function WhatsAppWebhookAdmin() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testFrom, setTestFrom] = useState("+26771234567");
  const [testMessage, setTestMessage] = useState("status");
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return false;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) {
      toast.error("Admin access required");
      navigate("/dashboard");
      return false;
    }
    setIsAdmin(true);
    return true;
  };

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Failed to load logs: " + error.message);
    } else {
      setLogs((data as WebhookLog[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const ok = await checkAdmin();
      if (ok) await loadLogs();
    })();

    const channel = supabase
      .channel("webhook-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_webhook_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as WebhookLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendTest = async (live = false) => {
    setTesting(true);
    try {
      const url = live ? WEBHOOK_URL : `${WEBHOOK_URL}?test=true`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: testFrom, body: testMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(live ? "Live test sent via WhatsApp" : "Test processed (no WhatsApp send)");
        console.log("Webhook test response:", data);
      } else {
        toast.error("Test failed: " + (data.error || res.statusText));
      }
      await loadLogs();
    } catch (e) {
      toast.error("Request failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setTesting(false);
  };

  const clearLogs = async () => {
    if (!confirm("Delete all webhook logs?")) return;
    const { error } = await supabase
      .from("whatsapp_webhook_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success("Logs cleared");
      setLogs([]);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Webhook</h1>
            <p className="text-muted-foreground text-sm mt-1 break-all">
              Endpoint: <code className="text-primary">{WEBHOOK_URL}</code>
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Test the webhook</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From (phone)</label>
              <Input value={testFrom} onChange={(e) => setTestFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Message</label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="status, critical, Princess Marina, Metformin..."
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => sendTest(false)} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Dry-run test
            </Button>
            <Button variant="secondary" onClick={() => sendTest(true)} disabled={testing}>
              <Send className="w-4 h-4 mr-2" />
              Live test (sends WhatsApp)
            </Button>
            <Button variant="ghost" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="destructive" onClick={clearLogs} className="ml-auto">
              <Trash2 className="w-4 h-4 mr-2" /> Clear logs
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent requests ({logs.length})</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No webhook activity yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const ok = log.response_status && log.response_status < 400;
                return (
                  <div key={log.id} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={ok ? "default" : "destructive"}>
                          {log.response_status ?? "—"}
                        </Badge>
                        <Badge variant="outline">{log.source}</Badge>
                        <span className="text-sm font-mono">{log.from_number || "—"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.message_body && (
                      <div>
                        <div className="text-xs text-muted-foreground">Message</div>
                        <div className="text-sm">{log.message_body}</div>
                      </div>
                    )}
                    {log.reply_text && (
                      <div>
                        <div className="text-xs text-muted-foreground">Reply</div>
                        <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-2 rounded">
                          {log.reply_text}
                        </pre>
                      </div>
                    )}
                    {log.error_message && (
                      <div>
                        <div className="text-xs text-destructive">Error</div>
                        <div className="text-xs text-destructive">{log.error_message}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
