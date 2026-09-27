"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { API } from '../../lib';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Demande impossible');
      setMessage(
        data.message ||
          'Si un compte actif correspond à cette adresse, un lien de réinitialisation sera envoyé.',
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark">UniGest</div>
        <div className="brand-copy">
          <h1>Récupération de compte</h1>
          <p>
            Le lien de réinitialisation est temporaire et ne peut être utilisé qu’une
            seule fois.
          </p>
        </div>
        <small>UniGest v0.5.1</small>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>Mot de passe oublié</h2>
          <p className="muted">
            Saisissez l’adresse e-mail associée à votre compte.
          </p>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          {message && <div className="success-box">{message}</div>}
          {error && <div className="error">{error}</div>}
          <div className="login-public">
            <Link href="/">Retour à la connexion</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
