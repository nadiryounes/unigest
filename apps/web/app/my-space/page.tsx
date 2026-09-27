"use client";
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib';

function fmtDate(v: string) { return v ? new Date(v).toLocaleString('fr-FR') : '—'; }

export default function MySpace() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { (async () => {
    try {
      const me = await api('/auth/me'); setUser(me);
      if (me.role === 'STUDENT') {
        const [s,g,a,e] = await Promise.all([api('/portal/student/summary'),api('/portal/student/grades'),api('/portal/student/attendance'),api('/portal/student/schedule')]);
        setSummary(s); setGrades(g); setAttendance(a); setSchedule(e);
      } else if (me.role === 'TEACHER') {
        const [s,m,e,g,a] = await Promise.all([api('/portal/teacher/summary'),api('/portal/teacher/modules'),api('/portal/teacher/schedule'),api('/grades'),api('/attendance')]);
        setSummary(s); setModules(m); setSchedule(e); setGrades(g); setAttendance(a);
      } else location.href='/dashboard';
    } catch (e:any) { setError(e.message); }
  })(); }, []);

  async function transcript() {
    if (!summary?.student?.id || !summary?.activeEnrollment?.academicYear?.id) return;
    try {
      const doc = await api(`/documents/transcript/${summary.student.id}?academicYearId=${summary.activeEnrollment.academicYear.id}`);
      const win = window.open('', '_blank'); if (win) { win.document.write(doc.html); win.document.close(); }
    } catch (e:any) { setError(e.message); }
  }

  if (!user) return <Shell><div className="empty">Chargement…</div></Shell>;
  if (user.role === 'STUDENT') return <Shell>
    <div className="page-head"><div><h1>Mon espace étudiant</h1><div className="muted">Dossier, notes publiées, absences et emploi du temps</div></div><button className="btn btn-secondary" onClick={transcript}>Imprimer mon relevé</button></div>
    {error&&<div className="error">{error}</div>}
    <div className="cards"><div className="stat"><div className="muted">Matricule</div><div className="n small-n">{summary?.student?.studentNumber||'—'}</div></div><div className="stat"><div className="muted">Groupe</div><div className="n small-n">{summary?.activeEnrollment?.group?.name||'—'}</div></div><div className="stat"><div className="muted">Notes publiées</div><div className="n">{summary?.publishedGrades??'—'}</div></div><div className="stat"><div className="muted">Absences / retards</div><div className="n">{summary?.absences??'—'}</div></div></div>
    <div className="two-col"><div className="panel"><h2>Notes publiées</h2><div className="table-wrap"><table className="table"><thead><tr><th>Module</th><th>Évaluation</th><th>Note</th></tr></thead><tbody>{grades.map(g=><tr key={g.id}><td>{g.assessment?.module?.code}</td><td>{g.assessment?.name}</td><td>{g.value} / {g.assessment?.maxValue}</td></tr>)}{!grades.length&&<tr><td colSpan={3}>Aucune note publiée</td></tr>}</tbody></table></div></div><div className="panel"><h2>Présence</h2><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Module</th><th>Statut</th></tr></thead><tbody>{attendance.map(a=><tr key={a.id}><td>{fmtDate(a.session?.startsAt)}</td><td>{a.session?.module?.code}</td><td>{a.status}</td></tr>)}{!attendance.length&&<tr><td colSpan={3}>Aucune donnée</td></tr>}</tbody></table></div></div></div>
    <div className="panel"><h2>Emploi du temps</h2><div className="table-wrap"><table className="table"><thead><tr><th>Début</th><th>Fin</th><th>Module</th><th>Salle</th></tr></thead><tbody>{schedule.map(s=><tr key={s.id}><td>{fmtDate(s.startsAt)}</td><td>{fmtDate(s.endsAt)}</td><td>{s.module?.code}</td><td>{s.room||'—'}</td></tr>)}{!schedule.length&&<tr><td colSpan={4}>Aucune séance</td></tr>}</tbody></table></div></div>
  </Shell>;

  return <Shell>
    <div className="page-head"><div><h1>Mon espace enseignant</h1><div className="muted">Modules, séances, évaluations, notes et présence sur votre périmètre</div></div></div>
    {error&&<div className="error">{error}</div>}
    <div className="cards"><div className="stat"><div className="muted">Matricule</div><div className="n small-n">{summary?.teacher?.employeeNumber||'—'}</div></div><div className="stat"><div className="muted">Modules</div><div className="n">{summary?.modulesCount??'—'}</div></div><div className="stat"><div className="muted">Évaluations</div><div className="n">{summary?.assessmentsCount??'—'}</div></div><div className="stat"><div className="muted">Notes saisies</div><div className="n">{grades.length}</div></div></div>
    <div className="two-col"><div className="panel"><h2>Mes modules</h2><div className="table-wrap"><table className="table"><thead><tr><th>Code</th><th>Module</th><th>Semestre</th></tr></thead><tbody>{modules.map(m=><tr key={m.id}><td>{m.code}</td><td>{m.name}</td><td>S{m.semester}</td></tr>)}{!modules.length&&<tr><td colSpan={3}>Aucun module</td></tr>}</tbody></table></div></div><div className="panel"><h2>Prochaines séances</h2><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Module</th><th>Groupe</th></tr></thead><tbody>{schedule.slice(0,10).map(s=><tr key={s.id}><td>{fmtDate(s.startsAt)}</td><td>{s.module?.code}</td><td>{s.group?.name||'—'}</td></tr>)}{!schedule.length&&<tr><td colSpan={3}>Aucune séance</td></tr>}</tbody></table></div></div></div>
  </Shell>;
}
