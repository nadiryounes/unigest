"use client";

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib';

const statusLabels: Record<string, string> = {
  SUBMITTED: 'À examiner',
  INELIGIBLE: 'Non éligibles',
  ELIGIBLE: 'Éligibles',
  SHORTLISTED: 'Présélectionnées',
  WAITLISTED: 'Liste d’attente',
  ADMITTED: 'Admises',
  REJECTED: 'Refusées',
  ENROLLED: 'Inscrites',
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function MiniBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <div className="empty">Aucune donnée</div>;

  return (
    <div className="mini-bars">
      {rows.map((row) => (
        <div className="mini-bar-row" key={row.label}>
          <div className="mini-bar-label">
            <span>{statusLabels[row.label] || row.label}</span>
            <strong>{row.value}</strong>
          </div>
          <div className="mini-bar-track">
            <div className="mini-bar-fill" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [demo, setDemo] = useState<any>(null);
  const [demoMessage, setDemoMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [dashboard, demoStatus] = await Promise.all([
      api('/dashboard/stats'),
      api('/system/demo-status').catch(() => null),
    ]);
    setStats(dashboard);
    setDemo(demoStatus);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function loadDemo() {
    setBusy(true);
    setDemoMessage('');
    try {
      const result = await api('/system/demo-seed', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setDemo(result);
      setDemoMessage(result.message || 'Données de démonstration chargées.');
      await load();
    } catch (error: any) {
      setDemoMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const cards = useMemo(
    () => [
      ['Étudiants', stats.students],
      ['Inscriptions', stats.enrollments],
      ['Candidatures', stats.applications],
      ['À examiner', stats.submittedApplications],
      ['Séances aujourd’hui', stats.todaySessions],
      ['Enseignants', stats.teachers],
      ['Filières', stats.programs],
      ['Modules', stats.modules],
    ],
    [stats],
  );

  return (
    <Shell>
      <div className="page-head dashboard-head">
        <div>
          <h1>Tableau de bord</h1>
          <div className="muted">
            {stats.activeAcademicYear
              ? `Année universitaire active : ${stats.activeAcademicYear}`
              : 'Vue synthétique de l’activité académique et des admissions'}
          </div>
        </div>
        <div className="dashboard-actions">
          <span className="badge">{stats.openCampaigns ?? 0} campagne(s) ouverte(s)</span>
          {demo && (
            <button className="btn btn-secondary" disabled={busy || demo.loaded} onClick={loadDemo}>
              {demo.loaded ? 'Données de test chargées' : busy ? 'Chargement…' : 'Charger les données de test'}
            </button>
          )}
        </div>
      </div>

      {demoMessage && <div className={demo?.loaded ? 'success-box' : 'notice'}>{demoMessage}</div>}

      <div className="cards dashboard-cards">
        {cards.map(([label, value]) => (
          <div className="stat" key={String(label)}>
            <div className="muted">{label}</div>
            <div className="n">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Candidatures par statut</h2>
          <MiniBars rows={stats.applicationsByStatus || []} />
        </div>
        <div className="panel">
          <h2>Étudiants par filière</h2>
          <MiniBars rows={stats.studentsByProgram || []} />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Candidatures récentes</h2>
            <a className="text-link" href="/admissions">Voir les admissions</a>
          </div>
          {(stats.recentApplications || []).length === 0 ? (
            <div className="empty">Aucune candidature</div>
          ) : (
            <div className="activity-list">
              {stats.recentApplications.map((item: any) => (
                <div className="activity-item" key={item.id}>
                  <div>
                    <strong>{item.candidate || item.applicationNumber}</strong>
                    <div className="muted">{item.applicationNumber} · {item.program}</div>
                  </div>
                  <div className="activity-meta">
                    <span className="badge">{statusLabels[item.status] || item.status}</span>
                    <small>{formatDate(item.submittedAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Prochaines séances</h2>
            <a className="text-link" href="/schedule">Voir l’emploi du temps</a>
          </div>
          {(stats.upcomingSessions || []).length === 0 ? (
            <div className="empty">Aucune séance planifiée</div>
          ) : (
            <div className="activity-list">
              {stats.upcomingSessions.map((item: any) => (
                <div className="activity-item" key={item.id}>
                  <div>
                    <strong>{item.module}</strong>
                    <div className="muted">{item.group} · {item.room}</div>
                  </div>
                  <div className="activity-meta">
                    <small>{formatDate(item.startsAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel release-panel">
        <h2>UniGest v0.5.1 Production Hardening</h2>
        <p className="muted">
          Cette version renforce les sessions JWT, la sécurité HTTP, le rate limiting et les tests navigateur, tout en conservant le socle fonctionnel v0.5.
        </p>
      </div>
    </Shell>
  );
}
