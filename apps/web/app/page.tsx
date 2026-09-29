"use client";
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { API, api } from '../lib';

function homeFor(role?: string) {
  return role === 'ADMIN' || role === 'SCOLARITE' ? '/dashboard' : '/my-space';
}

export default function Login() {
  const production = process.env.NODE_ENV === 'production';
  const [email, setEmail] = useState(production ? '' : 'admin@unigest.local');
  const [password, setPassword] = useState(production ? '' : 'Admin123!');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('unigest_token')) return;
    api('/auth/me').then((user) => { location.href = homeFor(user.role); }).catch(() => undefined);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const endpoint = mfaToken ? '/auth/mfa/verify' : '/auth/login';
      const body = mfaToken ? { mfaToken, code: mfaCode } : { email, password };
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connexion impossible');

      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaCode('');
        return;
      }

      localStorage.setItem('unigest_token', data.accessToken);
      location.href = homeFor(data.user?.role);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return <div className="login-page">
    <section className="login-brand">
      <div className="brand-mark">UniGest</div>
      <div className="brand-copy">
        <h1>Administration académique et admissions dans une seule application.</h1>
        <p>La v0.5.2 ajoute récupération de compte, authentification multifacteur et protections distribuées.</p>
        <div className="public-links">
          <Link href="/apply">Déposer une candidature</Link>
          <Link href="/application-status">Suivre une candidature</Link>
        </div>
      </div>
      <small>MVP · version 0.5.2</small>
    </section>

    <section className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <h2>{mfaToken ? 'Vérification en deux étapes' : 'Connexion'}</h2>
        <p className="muted">
          {mfaToken
            ? 'Saisissez le code de votre application d’authentification ou un code de récupération.'
            : 'Administration, scolarité, enseignant ou étudiant'}
        </p>

        {!mfaToken ? <>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <div className="login-helper"><Link href="/forgot-password">Mot de passe oublié ?</Link></div>
        </> : <>
          <div className="field">
            <label>Code MFA</label>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              autoFocus
            />
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => { setMfaToken(''); setMfaCode(''); setError(''); }}
          >
            Revenir à la connexion
          </button>
        </>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>
          {mfaToken ? 'Vérifier' : 'Se connecter'}
        </button>

        {error && <div className="error">{error}</div>}

        <div className="login-public">
          <Link href="/apply">Candidature en ligne</Link><span>·</span>
          <Link href="/application-status">Suivi de candidature</Link>
        </div>

        {!production && !mfaToken && <div className="demo">
          Admin : admin@unigest.local / Admin123!<br />
          Scolarité : scolarite@unigest.local / Scolarite123!<br />
          Enseignant : enseignant@unigest.local / Teacher123!<br />
          Étudiant : etudiant@unigest.local / Student123!
        </div>}
      </form>
    </section>
  </div>;
}
