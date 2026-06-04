import { Link } from 'react-router-dom';
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

      <ConsultantRequestForm />
    </div>
  </div>
);

export default Consultant;
