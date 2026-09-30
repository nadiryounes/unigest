"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { API } from '../../lib';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      await fetch(`${API}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setMessage('Si ce compte existe, un lien de réinitialisation sera envoyé.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="public-page">
    <div className="public-card auth-public-card">
      <div className="brand-mark dark">UniGest</div>
      <h1>Mot de passe oublié</h1>
      <p className="muted">Indiquez l’adresse e-mail associée à votre compte.</p>

      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      {message && <div className="success-box" style={{ marginTop: 16 }}>{message}</div>}
      <div className="auth-back"><Link href="/">Retour à la connexion</Link></div>
    </div>
  </div>;
}
