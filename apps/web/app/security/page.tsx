"use client";

import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib';

export default function SecurityPage() {
  const [status, setStatus] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [setup, setSetup] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setStatus(await api('/auth/security-status'));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      localStorage.removeItem('unigest_token');
      location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function beginMfa(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const value = await api('/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ currentPassword }),
      });
      setSetup(value);
      setMessage('Ajoutez ce secret dans votre application d’authentification, puis confirmez avec un code à 6 chiffres.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function enableMfa(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const value = await api('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: mfaCode }),
      });
      setRecoveryCodes(value.recoveryCodes || []);
      setSetup(null);
      setMfaCode('');
      setMessage('Authentification à deux facteurs activée.');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function disableMfa(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: disablePassword, code: disableCode }),
      });
      localStorage.removeItem('unigest_token');
      location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  }

  return <Shell>
    <div className="page-head">
      <div>
        <h1>Sécurité du compte</h1>
        <div className="muted">Mot de passe, sessions et authentification multifacteur</div>
      </div>
    </div>

    {error && <div className="error security-message">{error}</div>}
    {message && <div className="success-box security-message">{message}</div>}

    <div className="security-grid">
      <div className="panel security-panel">
        <h2>Changer le mot de passe</h2>
        <p className="muted">La modification invalide automatiquement les autres sessions ouvertes.</p>
        <form onSubmit={changePassword}>
          <div className="field">
            <label>Mot de passe actuel</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>Nouveau mot de passe</label>
            <input type="password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary">Modifier le mot de passe</button>
        </form>
      </div>

      <div className="panel security-panel">
        <h2>Authentification à deux facteurs</h2>

        {status && !status.available && <div className="notice">
          Les fonctions MFA nécessitent la migration de sécurité V06.
        </div>}

        {status?.mfaEnabled ? <>
          <p className="muted">
            MFA activée · {status.recoveryCodesRemaining} code(s) de récupération restant(s).
          </p>
          <form onSubmit={disableMfa}>
            <div className="field">
              <label>Mot de passe actuel</label>
              <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} required />
            </div>
            <div className="field">
              <label>Code MFA ou récupération</label>
              <input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} required />
            </div>
            <button className="btn btn-secondary">Désactiver MFA</button>
          </form>
        </> : <>
          {!setup ? <form onSubmit={beginMfa}>
            <p className="muted">Compatible avec les applications TOTP courantes.</p>
            <div className="field">
              <label>Mot de passe actuel</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <button className="btn btn-secondary" disabled={status && !status.available}>Configurer MFA</button>
          </form> : <form onSubmit={enableMfa}>
            <div className="secret-box">
              <strong>Secret TOTP</strong>
              <code>{setup.secret}</code>
              <small>Vous pouvez aussi importer manuellement l’URI : {setup.uri}</small>
            </div>
            <div className="field">
              <label>Code à 6 chiffres</label>
              <input inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required />
            </div>
            <button className="btn btn-primary">Activer MFA</button>
          </form>}
        </>}
      </div>
    </div>

    {recoveryCodes.length > 0 && <div className="panel recovery-panel">
      <h2>Codes de récupération</h2>
      <p className="notice">
        Enregistrez ces codes maintenant. Ils ne seront plus affichés après avoir quitté cette page.
      </p>
      <div className="recovery-codes">
        {recoveryCodes.map((code) => <code key={code}>{code}</code>)}
      </div>
    </div>}
  </Shell>;
}
