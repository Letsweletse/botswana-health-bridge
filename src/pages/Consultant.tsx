import { CalendarCheck, Home, MessageCircle, ShieldCheck, Video } from 'lucide-react';
import ConsultantRequestForm from '@/components/ConsultantRequestForm';
import SiteHeader from '@/components/SiteHeader';
import { consultantVideoImage } from '@/assets/consultantVideoImage';

const Consultant = () => (
  <div className="min-h-screen bg-[#07130f] px-4 pb-5 pt-24 font-[Gordita,system-ui,sans-serif] text-white sm:px-6 lg:px-8">
    <SiteHeader ctaLabel="Find Medicine" ctaTo="/search" />
    <div className="mx-auto max-w-7xl">
      <section className="mb-6 overflow-hidden border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="relative min-h-[340px] bg-slate-900 lg:min-h-[560px]">
          <img
            src={consultantVideoImage}
            alt="Older woman in a rural village having a video consultation with a doctor"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent lg:bg-gradient-to-r lg:from-black/55 lg:via-black/10 lg:to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 max-w-md border border-white/15 bg-black/45 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Rural access matters</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Virtual care should work for patients at home, in villages, and through assisted partner facilities.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-white p-6 text-slate-950 sm:p-8 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">ChekaMeds Consultant</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Video care, closer to home.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Request provider support from home or get assisted at a partner pharmacy or clinic. Built for real Botswana access, not just city users.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="border border-emerald-200 bg-emerald-50 p-4">
              <Home className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 font-bold text-slate-950">From home</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Submit symptoms and receive a secure video link where appropriate.</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 font-bold text-slate-950">At a partner facility</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">A pharmacy or clinic helps with capture, setup, and medicine collection.</p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-200 p-3">
              <CalendarCheck className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-bold">Reviewed request</p>
            </div>
            <div className="border border-slate-200 p-3">
              <MessageCircle className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-bold">WhatsApp link</p>
            </div>
            <div className="border border-slate-200 p-3">
              <Video className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-bold">Video consult</p>
            </div>
          </div>

          <p className="mt-6 border-l-4 border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-slate-600">
            ChekaMeds connects patients and participating providers. It does not diagnose, prescribe, or replace emergency care.
          </p>
        </div>
      </section>

      <ConsultantRequestForm />
    </div>
  </div>
);

export default Consultant;
