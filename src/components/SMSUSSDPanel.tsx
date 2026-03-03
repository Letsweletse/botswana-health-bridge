import { motion } from 'framer-motion';
import { Phone, Smartphone, MessageSquare, Hash, Signal, Plug, Globe, ArrowRight } from 'lucide-react';

const ussdFlow = [
  { step: '1', action: 'Dial *123#', response: 'Welcome to ChekaMeds. Select:\n1. Find Medicine\n2. Clinic Stock\n3. Critical Alerts' },
  { step: '2', action: 'Press 1 (Find Medicine)', response: 'Enter medicine name:' },
  { step: '3', action: 'Type "Paracetamol"', response: 'Paracetamol available at:\n1. Princess Marina: 120 units\n2. Bontleng Clinic: 45 units\n3. Extension 2: 8 units ⚠️' },
];

const SMSUSSDPanel = () => {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-primary/5 border border-accent/15 rounded-2xl p-6 card-premium">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent/15 border border-accent/20">
            <Phone className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-foreground">SMS/USSD Fallback Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Not all Batswana have smartphones. With USSD (*123#), ChekaMeds becomes accessible to 
              100% of the population — including feature phones.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* USSD Demo */}
        <div className="bg-card border border-border rounded-2xl p-6 card-premium space-y-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-display font-semibold text-foreground">USSD Flow Preview</h3>
          </div>
          <p className="text-xs text-muted-foreground">How the *123# experience works on any phone:</p>

          <div className="space-y-3">
            {ussdFlow.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">{item.step}</span>
                  <span className="text-xs font-semibold text-foreground">User: {item.action}</span>
                </div>
                <div className="ml-7 bg-muted/50 border border-border rounded-lg p-3">
                  <pre className="text-[11px] text-foreground whitespace-pre-wrap font-mono">{item.response}</pre>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SMS & Integration Status */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 card-premium space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-display font-semibold text-foreground">SMS Fallback</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Patients without WhatsApp can text queries via SMS. Same intelligence, any phone.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">SMS Short Code</span>
                <span className="font-mono font-bold text-foreground">*123#</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Supported Networks</span>
                <span className="font-bold text-foreground">Mascom · Orange · BTC</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Language Support</span>
                <span className="font-bold text-foreground">English · Setswana</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 card-premium space-y-4">
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-display font-semibold text-foreground">Integration Status</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'USSD Gateway', status: 'Ready for connection', color: 'text-warning', icon: Signal },
                { label: 'SMS API (Africa\'s Talking)', status: 'Ready for connection', color: 'text-warning', icon: MessageSquare },
                { label: 'Telco Partnership', status: 'Pending agreement', color: 'text-muted-foreground', icon: Globe },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 text-xs border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`font-semibold ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              API endpoints are pre-built. Connect your USSD/SMS gateway credentials in Settings to go live.
            </p>
          </div>
        </div>
      </div>

      {/* DHIS2 */}
      <div className="bg-card border border-border rounded-2xl p-6 card-premium">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-display font-semibold text-foreground">DHIS2 Government API Integration</h3>
            <p className="text-xs text-muted-foreground mt-1">
              ChekaMeds is designed to integrate with Botswana's District Health Information System (DHIS2) 
              for automatic facility registration, national stock reporting, and ministry-level analytics.
            </p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Status:</span> Architecture ready · Awaiting DHIS2 API credentials from Ministry of Health & Wellness
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSUSSDPanel;
