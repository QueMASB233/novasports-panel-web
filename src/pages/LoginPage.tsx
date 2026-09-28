import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/ui/Toast';

export function LoginPage() {
  const nav = useNavigate();
  const { signIn } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return toast.push('error', 'Email inválido');
    setLoading(true);
    try {
      await authApi.sendCode(email.trim());
      setStep('code');
      toast.success('Enviamos un código a tu email');
    } catch (err) {
      toast.error(err);
    } finally { setLoading(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.push('error', 'El código debe tener 6 dígitos');
    setLoading(true);
    try {
      const { session, admin } = await authApi.verifyCode(email.trim(), code.trim());
      signIn(session, admin);
      nav('/rankings', { replace: true });
    } catch (err) {
      toast.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-[380px] card card-raised p-9">
        <div className="mb-8">
          <div
            className="font-bold text-[28px] leading-none"
            style={{ letterSpacing: '-0.032em' }}
          >
            NovaSports
          </div>
          <div className="eyebrow mt-3">
            Rankings Admin
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                autoFocus type="email" className="input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full h-11 text-[14px]" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
            <p className="text-[12px] text-white/45 text-center leading-relaxed">
              Solo usuarios con rol admin en la base de datos.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-5">
            <div className="text-[12px] text-white/60 leading-relaxed">
              Enviamos un código a <span className="text-white">{email}</span>.
            </div>
            <div>
              <label className="label">Código de 6 dígitos</label>
              <input
                autoFocus inputMode="numeric" maxLength={6}
                className="input text-center text-[22px] font-semibold h-14"
                style={{ letterSpacing: '0.4em' }}
                placeholder="······"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <button className="btn-primary w-full h-11 text-[14px]" disabled={loading}>
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
            <button
              type="button"
              className="btn-ghost w-full h-10 text-[13px]"
              onClick={() => { setStep('email'); setCode(''); }}
            >
              Cambiar email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

