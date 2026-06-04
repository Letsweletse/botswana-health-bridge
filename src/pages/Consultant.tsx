import { Link } from 'react-router-dom';
import ConsultantRequestForm from '@/components/ConsultantRequestForm';
import logo from '@/assets/ChekaMeds_Logo.png';

const Consultant = () => (
  <div className="min-h-screen bg-[#020e08] px-4 py-6 font-[Gordita,system-ui,sans-serif] text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <nav className="mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="ChekaMeds" className="h-12 w-12 rounded-2xl bg-white p-1" />
          <div>
            <p className="font-bold">ChekaMeds</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Consultant</p>
          </div>
        </Link>
        <Link to="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
          Back home
        </Link>
      </nav>

      <ConsultantRequestForm />
    </div>
  </div>
);

export default Consultant;
