"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { API } from '../../lib';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Réinitialisation impossible');
      setMessage(data.message || 'Mot de passe réinitialisé.');
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
          <h1>Définir un nouveau mot de passe</h1>
          <p>Après modification, toutes les sessions existantes sont révoquées.</p>
        </div>
        <small>UniGest v0.5.1</small>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>Nouveau mot de passe</h2>
          {!token && (
            <div className="error">
              Aucun jeton de réinitialisation n’est présent dans ce lien.
            </div>
          )}
          <div className="field">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Confirmation</label>
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={busy || !token}
          >
            {busy ? 'Modification…' : 'Réinitialiser'}
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
