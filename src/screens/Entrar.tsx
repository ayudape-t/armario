import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';

export default function Entrar() {
  const { usuario } = useSesion();
  const [acepto, setAcepto] = useState(false);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  if (usuario) return <Navigate to="/" replace />;

  async function conGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/app/` } });
    if (error) setError('No pudimos abrir Google. Inténtalo de nuevo.');
  }

  async function pedirCodigo(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: correo.trim(), options: { shouldCreateUser: true } });
    setOcupado(false);
    if (error) setError('No pudimos enviar el código. Revisa tu correo e inténtalo de nuevo.');
    else setEnviado(true);
  }

  async function verificar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email: correo.trim(), token: codigo.trim(), type: 'email' });
    setOcupado(false);
    if (error) setError('El código no es válido o ya venció. Pide uno nuevo.');
  }

  return (
    <section className="entrar">
      <h1>Armario</h1>
      <p>Tu ropa ordenada y outfits a pedido.</p>

      <label className="casilla">
        <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
        <span>
          Acepto los Términos y la Política de privacidad (<a href="/terminos" target="_blank">Términos</a> ·{' '}
          <a href="/privacidad" target="_blank">Privacidad</a>)
        </span>
      </label>

      <button type="button" onClick={conGoogle} disabled={!acepto}>
        Entrar con Google
      </button>

      <p className="separador">o con tu correo</p>

      {!enviado ? (
        <form onSubmit={pedirCodigo}>
          <label>
            Correo
            <input type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <button type="submit" disabled={!acepto || ocupado}>
            Recibir código
          </button>
        </form>
      ) : (
        <form onSubmit={verificar}>
          <p>Te enviamos un código a {correo}.</p>
          <label>
            Código de 6 dígitos
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={codigo}
              onChange={(e) => setCodigo(e.target.value)} />
          </label>
          <button type="submit" disabled={ocupado}>
            Entrar
          </button>
          <button type="button" className="secundario" onClick={() => setEnviado(false)}>
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
