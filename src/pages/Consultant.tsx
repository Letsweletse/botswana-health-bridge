import { Link } from 'react-router-dom';
import { CalendarCheck, MessageCircle, ShieldCheck, Video } from 'lucide-react';
import ConsultantRequestForm from '@/components/ConsultantRequestForm';
import logo from '@/assets/ChekaMeds_Logo.png';

const Consultant = () => (
  <div className="min-h-screen bg-slate-950 px-4 py-5 font-[Gordita,system-ui,sans-serif] text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <nav className="mb-6 flex items-center justify-between border border-white/10 bg-white/[0.03] px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="ChekaMeds" className="h-10 w-10 bg-white p-1" />
          <div>
            <p className="text-sm font-bold leading-none">ChekaMeds</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">Virtual Care</p>
          </div>
        </Link>
        <Link to="/" className="border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
          Back home
        </Link>
      </nav>

      <section className="mb-6 grid gap-5 border border-white/10 bg-white/[0.04] p-5 sm:p-7 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">ChekaMeds Consultant</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
            Video care, closer to home.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
            Request support from home or get assisted at a partner pharmacy or clinic.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="font-bold text-white">From home</p>
              <p className="mt-1 text-sm leading-6 text-white/60">Submit symptoms and receive a secure video link where appropriate.</p>
            </div>
            <div className="border border-white/10 bg-slate-900/80 p-4">
              <p className="font-bold text-white">At a partner facility</p>
              <p className="mt-1 text-sm leading-6 text-white/60">A pharmacy or clinic helps with capture, setup, and medicine collection.</p>
            </div>
          </div>
        </div>

        <div className="border border-emerald-400/20 bg-slate-900 p-4 shadow-2xl shadow-emerald-950/30">
          <div className="border border-white/10 bg-slate-950 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-red-400" />
                <span className="h-2.5 w-2.5 bg-amber-300" />
                <span className="h-2.5 w-2.5 bg-emerald-400" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">Secure Video</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.72fr]">
              <div className="flex min-h-52 items-center justify-center bg-gradient-to-br from-emerald-500/25 via-slate-800 to-slate-950 p-5">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                    <Video className="h-9 w-9 text-emerald-200" />
                  </div>
                  <p className="mt-4 text-lg font-bold">Doctor video room</p>
                  <p className="mt-1 text-xs text-white/45">Link shared after provider review</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="border border-white/10 bg-white/[0.04] p-3">
                  <CalendarCheck className="h-5 w-5 text-emerald-300" />
                  <p className="mt-2 text-sm font-bold">Reviewed request</p>
                </div>
                <div className="border border-white/10 bg-white/[0.04] p-3">
                  <MessageCircle className="h-5 w-5 text-emerald-300" />
                  <p className="mt-2 text-sm font-bold">WhatsApp link</p>
                </div>
                <div className="border border-white/10 bg-white/[0.04] p-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <p className="mt-2 text-sm font-bold">Provider-led care</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConsultantRequestForm />
    </div>
  </div>
);

export default Consultant;
