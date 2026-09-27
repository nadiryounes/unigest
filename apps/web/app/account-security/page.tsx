"use client";

import { FormEvent, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib';

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmation) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    try {
      const result = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      localStorage.removeItem('unigest_token');
      setTimeout(() => {
        location.href = '/';
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions() {
    setMessage('');
    setError('');
    setBusy(true);
    try {
      const result = await api('/auth/logout-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setMessage(result.message);
      localStorage.removeItem('unigest_token');
      setTimeout(() => {
        location.href = '/';
      }, 900);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Sécurité du compte</h1>
          <div className="muted">
            Mot de passe et révocation des sessions actives.
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Changer le mot de passe</h2>
        <form className="form-grid" onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="current-password">Mot de passe actuel</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password-confirmation">Confirmation</label>
            <input
              id="new-password-confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              Modifier et révoquer les sessions
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Sessions actives</h2>
        <p className="muted">
          Cette action invalide immédiatement tous les jetons de connexion existants,
          y compris celui utilisé sur cet appareil.
        </p>
        <button className="btn btn-secondary" disabled={busy} onClick={revokeSessions}>
          Déconnecter toutes les sessions
        </button>
      </div>

      {message && <div className="success-box">{message}</div>}
      {error && <div className="error">{error}</div>}
    </Shell>
  );
}
