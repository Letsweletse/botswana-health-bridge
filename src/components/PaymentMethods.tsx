import { motion } from 'framer-motion';
import {
  Smartphone, Building, CreditCard, Globe, Banknote, CheckCircle2, ArrowRight, Store
} from 'lucide-react';

const plans = [
  {
    name: 'Clinic Listing',
    price: 'P300',
    period: '/month',
    desc: 'Get your clinic listed on ChekaMeds so patients can find your medicines via WhatsApp, SMS & USSD.',
    features: [
      'Listed on WhatsApp bot search',
      'Dashboard access for staff',
      'Excel upload/download stock management',
      'IoT sensor integration (when available)',
      'Real-time stock updates',
      'WhatsApp alerts on low stock',
    ],
    highlight: false,
    icon: Building,
  },
  {
    name: 'Pharmacy Listing',
    price: 'P350',
    period: '/month',
    desc: 'Get your pharmacy listed alongside clinics — patients find you when searching for medicines near them.',
    features: [
      'Everything in Clinic plan',
      'Pharmacy-specific branding',
      'Prescription matching support',
      'Priority listing in search results',
      'QR code medicine verification',
      'Dedicated support line',
    ],
    highlight: true,
    icon: Store,
  },
];

const paymentMethods = [
  {
    name: 'Orange Money',
    desc: 'Dial *145# or send to merchant',
    detail: 'Send payment to: 72347712',
    icon: Smartphone,
    color: 'text-[hsl(25,95%,53%)]',
    bg: 'bg-[hsl(25,95%,53%)]/10 border-[hsl(25,95%,53%)]/20',
  },
  {
    name: 'MyZaka (BTC)',
    desc: 'Via BancABC mobile banking',
    detail: 'Transfer to: +26775560140',
    icon: Smartphone,
    color: 'text-[hsl(210,80%,55%)]',
    bg: 'bg-[hsl(210,80%,55%)]/10 border-[hsl(210,80%,55%)]/20',
  },
  {
    name: 'Smega (FNB)',
    desc: 'FNB Botswana mobile wallet',
    detail: 'Pay via Smega eWallet',
    icon: Smartphone,
    color: 'text-[hsl(195,85%,45%)]',
    bg: 'bg-[hsl(195,85%,45%)]/10 border-[hsl(195,85%,45%)]/20',
  },
  {
    name: 'Visa / Debit Card',
    desc: 'All local Visa & Mastercard accepted',
    detail: 'Pay securely via card link',
    icon: CreditCard,
    color: 'text-[hsl(230,60%,55%)]',
    bg: 'bg-[hsl(230,60%,55%)]/10 border-[hsl(230,60%,55%)]/20',
  },
  {
    name: 'Direct Bank Deposit (EFT)',
    desc: 'Standard Chartered / FNB / Stanbic',
    detail: '',
    icon: Banknote,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    bankDetails: {
      account: 'iBlim Enterprise',
      bank: 'FNB Botswana',
      accNo: '62793182404',
      branch: '288367 (Main)',
    },
  },
  {
    name: 'PayPal',
    desc: 'International partners welcome',
    detail: 'paypal.me/LetsweletseSeatla',
    icon: Globe,
    color: 'text-[hsl(210,65%,50%)]',
    bg: 'bg-[hsl(210,65%,50%)]/10 border-[hsl(210,65%,50%)]/20',
    link: 'https://paypal.me/LetsweletseSeatla',
  },
];

const PaymentMethods = () => {
  return (
    <div className="space-y-6">
      {/* Subscription Plans */}
      <div>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="text-primary text-xs font-semibold uppercase tracking-widest">Subscription Plans</p>
          </div>
          <h3 className="text-lg font-display font-bold text-foreground">List your clinic or pharmacy on ChekaMeds</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose a plan to make your facility searchable by patients across Botswana.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 card-premium ${
                plan.highlight
                  ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                  : 'bg-card border-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-full">
                  Most Popular
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${plan.highlight ? 'bg-primary/15 border border-primary/25' : 'bg-muted border border-border'}`}>
                  <plan.icon className={`h-5 w-5 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h4 className="text-base font-display font-bold text-foreground">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-display font-extrabold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/26771424486?text=Hi%2C%20I%20want%20to%20subscribe%20to%20the%20" 
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25'
                    : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                }`}
              >
                Subscribe via WhatsApp <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-card border border-border rounded-2xl p-6 card-premium">
        <div className="mb-5">
          <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-1">How to Pay</p>
          <h3 className="text-lg font-display font-bold text-foreground">We accept local Botswana payment methods</h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method, i) => (
            <motion.div
              key={method.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              className={`rounded-xl border p-4 ${method.bg}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <method.icon className={`h-5 w-5 ${method.color}`} />
                <h4 className="text-sm font-display font-semibold text-foreground">{method.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{method.desc}</p>

              {method.bankDetails ? (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Account:</span><span className="font-semibold text-foreground">{method.bankDetails.account}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span><span className="font-semibold text-foreground">{method.bankDetails.bank}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Acc No:</span><span className="font-mono font-bold text-foreground">{method.bankDetails.accNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Branch:</span><span className="font-mono text-foreground">{method.bankDetails.branch}</span></div>
                </div>
              ) : method.link ? (
                <a href={method.link} target="_blank" rel="noopener noreferrer" className={`text-xs font-semibold ${method.color} hover:underline`}>
                  {method.detail}
                </a>
              ) : (
                <p className="text-xs font-semibold text-foreground">{method.detail}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/8 via-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-display font-semibold text-foreground">Need help subscribing?</h4>
          <p className="text-xs text-muted-foreground mt-0.5">WhatsApp us and our team will guide you through setup in under 10 minutes.</p>
        </div>
        <a
          href="https://wa.me/26771424486?text=Hi%2C%20I%20need%20help%20subscribing%20to%20ChekaMeds"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/25 flex-shrink-0"
        >
          WhatsApp Support <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

export default PaymentMethods;
