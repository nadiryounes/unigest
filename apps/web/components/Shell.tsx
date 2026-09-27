"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../lib';

type NavItem = [string, string];

const adminNav: NavItem[] = [
  ['/dashboard', 'Tableau de bord'],
  ['/academic-years', 'Années universitaires'],
  ['/programs', 'Filières'],
  ['/academic-structure', 'Structure académique'],
  ['/admissions', 'Candidatures & admissions'],
  ['/groups', 'Promotions & groupes'],
  ['/students', 'Étudiants'],
  ['/enrollments', 'Inscriptions'],
  ['/teachers', 'Enseignants'],
  ['/modules', 'Modules'],
  ['/assessments', 'Évaluations'],
  ['/schedule', 'Emploi du temps'],
  ['/attendance', 'Absences'],
  ['/grades', 'Notes'],
  ['/deliberations', 'Délibérations'],
  ['/documents', 'Documents'],
  ['/accounts', 'Comptes & accès'],
  ['/audit', 'Journal d’audit'],
];

const scolariteNav: NavItem[] = adminNav.filter(
  ([href]) => !['/accounts', '/audit'].includes(href),
);
const teacherNav: NavItem[] = [
  ['/my-space', 'Mon espace'],
  ['/assessments', 'Mes évaluations'],
  ['/grades', 'Mes notes'],
  ['/attendance', 'Mes présences'],
];
const studentNav: NavItem[] = [['/my-space', 'Mon espace']];
const securityNav: NavItem = ['/account-security', 'Sécurité du compte'];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    api('/auth/me').then(setUser).catch(() => undefined);
  }, []);

  function logout() {
    localStorage.removeItem('unigest_token');
    location.href = '/';
  }

  const nav =
    user?.role === 'ADMIN'
      ? adminNav
      : user?.role === 'SCOLARITE'
        ? scolariteNav
        : user?.role === 'TEACHER'
          ? teacherNav
          : user?.role === 'STUDENT'
            ? studentNav
            : [];

  const visibleNav = user ? [...nav, securityNav] : [];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          UniGest <span className="version">v0.5.1</span>
        </div>
        <nav className="nav">
          {visibleNav.map(([href, label]) => (
            <Link className={pathname === href ? 'active' : ''} href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <strong>Système d’information universitaire</strong>
          </div>
          <div className="muted">
            {user ? `${user.firstName} ${user.lastName} · ${user.role}` : '...'}
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
