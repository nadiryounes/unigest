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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('unigest_token')) return;
    api('/auth/me')
      .then((user) => {
        location.href = homeFor(user.role);
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connexion impossible');
      localStorage.setItem('unigest_token', data.accessToken);
      location.href = homeFor(data.user?.role);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark">UniGest</div>
        <div className="brand-copy">
          <h1>Administration académique et admissions dans une seule application.</h1>
          <p>
            UniGest v0.5.1 renforce l’authentification, la gestion des sessions et la
            sécurité des accès tout en conservant le socle académique v0.5.
          </p>
          <div className="public-links">
            <Link href="/apply">Déposer une candidature</Link>
            <Link href="/application-status">Suivre une candidature</Link>
          </div>
        </div>
        <small>MVP · version 0.5.1</small>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>Connexion</h2>
          <p className="muted">Administration, scolarité, enseignant ou étudiant</p>

          <div className="field">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }}>
            Se connecter
          </button>

          {error && <div className="error">{error}</div>}

          <div className="login-public">
            <Link href="/forgot-password">Mot de passe oublié</Link>
            <span>·</span>
            <Link href="/apply">Candidature en ligne</Link>
            <span>·</span>
            <Link href="/application-status">Suivi de candidature</Link>
          </div>

          {!production && (
            <div className="demo">
              Admin : admin@unigest.local / Admin123!
              <br />
              Scolarité : scolarite@unigest.local / Scolarite123!
              <br />
              Enseignant : enseignant@unigest.local / Teacher123!
              <br />
              Étudiant : etudiant@unigest.local / Student123!
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
