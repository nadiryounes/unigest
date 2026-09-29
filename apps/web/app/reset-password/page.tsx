"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { API } from '../../lib';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    const res = await fetch(`${API}/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || 'Réinitialisation impossible');
      return;
    }

    setMessage('Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.');
    setPassword('');
    setConfirm('');
  }

  return <div className="public-page">
    <div className="public-card auth-public-card">
      <div className="brand-mark dark">UniGest</div>
      <h1>Nouveau mot de passe</h1>
      <p className="muted">Choisissez un mot de passe d’au moins 12 caractères.</p>

      {!token ? <div className="error">Lien de réinitialisation incomplet.</div> : <form onSubmit={submit}>
        <div className="field">
          <label>Nouveau mot de passe</label>
          <input type="password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="field">
          <label>Confirmation</label>
          <input type="password" minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }}>Réinitialiser</button>
      </form>}

      {error && <div className="error">{error}</div>}
      {message && <div className="success-box" style={{ marginTop: 16 }}>{message}</div>}
      <div className="auth-back"><Link href="/">Retour à la connexion</Link></div>
    </div>
  </div>;
}
