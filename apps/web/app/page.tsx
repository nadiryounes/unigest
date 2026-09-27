"use client";
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { API, api } from '../lib';

function homeFor(role?: string) { return role === 'ADMIN' || role === 'SCOLARITE' ? '/dashboard' : '/my-space'; }

export default function Login() {
  const [email, setEmail] = useState('admin@unigest.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('unigest_token')) return;
    api('/auth/me').then(user => { location.href = homeFor(user.role); }).catch(() => undefined);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connexion impossible');
      localStorage.setItem('unigest_token', data.accessToken);
      location.href = homeFor(data.user?.role);
    } catch (err: any) { setError(err.message); }
  }

  return <div className="login-page">
    <section className="login-brand">
      <div className="brand-mark">UniGest</div>
      <div className="brand-copy"><h1>Administration académique et admissions dans une seule application.</h1><p>La v0.4.1 structure les niveaux, semestres et règles pédagogiques, puis couvre la candidature jusqu’à l’inscription de l’étudiant.</p><div className="public-links"><Link href="/apply">Déposer une candidature</Link><Link href="/application-status">Suivre une candidature</Link></div></div>
      <small>MVP · version 0.4</small>
    </section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <h2>Connexion</h2><p className="muted">Administration, scolarité, enseignant ou étudiant</p>
      <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></div>
      <div className="field"><label>Mot de passe</label><input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></div>
      <button className="btn btn-primary" style={{ width: '100%' }}>Se connecter</button>
      {error && <div className="error">{error}</div>}
      <div className="login-public"><Link href="/apply">Candidature en ligne</Link><span>·</span><Link href="/application-status">Suivi de candidature</Link></div>
      <div className="demo">Admin : admin@unigest.local / Admin123!<br />Scolarité : scolarite@unigest.local / Scolarite123!<br />Enseignant : enseignant@unigest.local / Teacher123!<br />Étudiant : etudiant@unigest.local / Student123!</div>
    </form></section>
  </div>;
}
