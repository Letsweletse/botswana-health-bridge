import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Register = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [contact, setContact] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Create auth user — DB trigger auto-creates pharmacy record
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { clinic_name: clinicName, contact }
        }
      });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Signup failed. Please try again.');

      // 2. Notify admins (non-blocking)
      supabase.from('admin_notifications').insert({
        type: 'new_pharmacy',
        title: 'New Pharmacy Registration',
        message: 'New pharmacy registered and pending approval',
        clinic_name: clinicName,
        email,
        profile_id: user.id,
        role: 'pharmacy',
        read: false,
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn('Admin notification warning:', error.message);
      });

      // 3. Insert into profiles (non-blocking)
      supabase.from('profiles').insert({
        id: user.id,
        role: 'pharmacy',
      }).then(({ error }) => {
        if (error && !error.message.includes('duplicate')) {
          console.warn('Profile insert warning:', error.message);
        }
      });

      toast({
        title: 'Registration successful!',
        description: 'Your account is pending approval. We will notify you at ' + email,
      });

      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: '#050d18',
    border: '1px solid #1e2d3d',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    color: '#f1f5f9',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050d18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: '#10b981', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 800, color: 'white' }}>C</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.5, margin: 0 }}>ChekaMeds</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Operations Platform · Botswana</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Register your pharmacy</h2>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Join the ChekaMeds network in Botswana</p>

          <form onSubmit={handleRegister}>

            {/* Clinic Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Pharmacy / Clinic Name</label>
              <input
                type="text"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                placeholder="e.g. Gaborone Central Pharmacy"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#1e2d3d'}
              />
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Contact Number</label>
              <input
                type="tel"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="+267 7X XXX XXX"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#1e2d3d'}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@pharmacy.co.bw"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#1e2d3d'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  style={{ ...inputStyle, padding: '12px 44px 12px 14px' }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#1e2d3d'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: isLoading ? 0.7 : 1, marginBottom: 16 }}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {/* Pending notice */}
          <div style={{ background: '#0f2a1e', border: '1px solid #10b98133', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6ee7b7', margin: 0, lineHeight: 1.5 }}>
              ℹ️ Your account will be reviewed and approved by the ChekaMeds team before you can access the dashboard.
            </p>
          </div>

          {/* Link to login */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 24 }}>
          ChekaMeds Botswana · info@chekameds.co.bw
        </p>
      </div>
    </div>
  );
};

export default Register;
