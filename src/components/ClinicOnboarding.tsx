import { motion } from 'framer-motion';
import {
  UserPlus, ClipboardCheck, Wifi, MessageCircle, Phone, ArrowRight,
  Building2, CheckCircle2, QrCode, Users
} from 'lucide-react';
import heroBg from '@/assets/hero-gaborone.jpg';

const steps = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Register Your Facility',
    desc: 'A clinic administrator creates an account using the official facility name and a ministry-issued email. Each clinic gets its own secure dashboard.',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    step: '02',
    icon: Wifi,
    title: 'Connect IoT Sensors',
    desc: 'ESP32-S3 weight sensors are installed on medicine shelves. They automatically push stock readings every 5 minutes directly into your dashboard.',
    color: 'text-[hsl(var(--gov-gold))]',
    bg: 'bg-[hsl(var(--gov-gold))]/10 border-[hsl(var(--gov-gold))]/20',
  },
  {
    step: '03',
    icon: ClipboardCheck,
    title: 'Manage Your Inventory',
    desc: 'Log in anytime to view, update, add or remove medicines. Your data is isolated — only your staff can edit your records. Admins see the full picture.',
    color: 'text-success',
    bg: 'bg-success/10 border-success/20',
  },
  {
    step: '04',
    icon: MessageCircle,
    title: 'Go Live on WhatsApp',
    desc: 'Your clinic\'s stock is instantly searchable via the ChekaMeds WhatsApp bot. Patients and health workers can find your medicines without calling.',
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
  },
];

const whoCanUse = [
  { icon: Users, title: 'Patients & Batswana', desc: 'Text the number to find where a specific medicine is available before travelling across Gaborone.' },
  { icon: Building2, title: 'Clinic Staff', desc: 'Check stock at nearby facilities before referring a patient. Coordinate transfers during shortages.' },
  { icon: CheckCircle2, title: 'Ministry Officials', desc: 'Monitor supply chain health across all facilities in real-time. Identify systemic shortages early.' },
];

const ClinicOnboarding = () => {
  return (
    <div className="space-y-6">
      {/* WhatsApp hero card */}
      <div className="relative rounded-2xl overflow-hidden border border-border card-premium">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(218,35%,9%)]/92 via-[hsl(218,35%,9%)]/80 to-[hsl(218,35%,9%)]/40" />

        <div className="relative z-10 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <p className="text-[hsl(38,85%,62%)] text-xs font-semibold uppercase tracking-widest mb-2">Public Access · Free to Use</p>
            <h2 className="text-3xl font-display font-bold text-white leading-tight">
              Find medicines across<br />
              <span className="text-[hsl(38,85%,62%)]">all Gaborone clinics.</span>
            </h2>
            <p className="text-white/55 text-sm mt-2 max-w-md">
              Anyone in Botswana can WhatsApp this number — no app download, no registration needed. Just text and get instant stock availability.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-shrink-0 bg-white/[0.08] border border-white/15 rounded-2xl p-6 backdrop-blur-sm text-center min-w-[200px]"
          >
            <Phone className="h-8 w-8 text-[hsl(38,85%,62%)] mx-auto mb-3" />
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">WhatsApp Number</p>
            <p className="text-[hsl(38,85%,62%)] text-2xl font-display font-bold tracking-tight">+267 71 424 486</p>
            <p className="text-white/40 text-[11px] mt-2">Available 24/7 · No charge</p>
            <a
              href="https://wa.me/26771424486"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[hsl(38,85%,52%)] text-[hsl(218,35%,9%)] text-xs font-bold hover:bg-[hsl(38,85%,60%)] transition-colors"
            >
              Open WhatsApp <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Who can use */}
      <div className="grid sm:grid-cols-3 gap-4">
        {whoCanUse.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 card-premium"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <item.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <h4 className="text-sm font-display font-semibold text-foreground mb-1">{item.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* How clinics join */}
      <div className="bg-card border border-border rounded-2xl p-6 card-premium">
        <div className="mb-6">
          <p className="text-[hsl(var(--gov-gold))] text-xs font-semibold uppercase tracking-widest mb-1">For Health Facilities</p>
          <h3 className="text-lg font-display font-bold text-foreground">How your clinic joins ChekaMeds</h3>
          <p className="text-sm text-muted-foreground mt-1">A simple four-step process to get your facility live and searchable.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+8px)] right-0 h-px bg-border z-0 w-4" />
              )}

              <div className={`relative border rounded-xl p-4 ${step.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg border ${step.bg}`}>
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <span className={`text-xl font-display font-bold ${step.color} opacity-30`}>{step.step}</span>
                </div>
                <h4 className="text-sm font-display font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-gradient-to-r from-primary/8 via-primary/5 to-[hsl(var(--gov-gold))]/5 border border-primary/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-display font-semibold text-foreground">Want to enroll your facility?</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Contact the IBLIM ENTERPRISE team to request a ChekaMeds account for your clinic.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href="mailto:digitalhealth@health.gov.bw"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            Email us <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://wa.me/26771424486"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-all"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClinicOnboarding;
