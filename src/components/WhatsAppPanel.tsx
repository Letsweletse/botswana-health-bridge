import { useState } from 'react';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const WhatsAppPanel = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: '🏥 *ChekaMeds — Medicine Stock Checker*\n\nDumelang! 👋 I can help you check medicine availability.\n\nSend me:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine name (e.g. "Metformin")\n📊 "status" for a full summary\n🆘 "critical" for urgent shortages',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook?query=${encodeURIComponent(userMsg.text)}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const result = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: result.reply || 'No response received.',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: '⚠️ Could not reach the server. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-success/10 to-success/5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-success/20">
            <MessageCircle className="h-4 w-4 text-success" />
          </div>
          <div>
            <h2 className="text-sm font-display font-semibold text-foreground">WhatsApp Stock Checker</h2>
            <p className="text-[11px] text-muted-foreground">Test medicine queries here — same logic as WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px] bg-muted/20">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="p-1.5 rounded-full bg-success/10 h-fit mt-1">
                  <Bot className="h-3 w-3 text-success" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />
              {msg.sender === 'user' && (
                <div className="p-1.5 rounded-full bg-primary/10 h-fit mt-1">
                  <User className="h-3 w-3 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-2">
            <div className="p-1.5 rounded-full bg-success/10 h-fit">
              <Bot className="h-3 w-3 text-success" />
            </div>
            <div className="bg-card border border-border rounded-xl px-3 py-2 rounded-bl-sm">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: 'critical' or 'Princess Marina'..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppPanel;
