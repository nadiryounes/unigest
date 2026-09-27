"use client";
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib';

export default function Accounts() {
  const [users,setUsers]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[teachers,setTeachers]=useState<any[]>([]);
  const [form,setForm]=useState<any>({role:'STUDENT',active:true}),[error,setError]=useState('');
  async function load(){try{const [u,s,t]=await Promise.all([api('/users'),api('/students'),api('/teachers')]);setUsers(u);setStudents(s);setTeachers(t)}catch(e:any){setError(e.message)}}
  useEffect(()=>{load()},[]);
  async function submit(e:FormEvent){e.preventDefault();setError('');try{await api('/users',{method:'POST',body:JSON.stringify(form)});setForm({role:'STUDENT',active:true});await load()}catch(e:any){setError(e.message)}}
  async function toggle(user:any){try{await api(`/users/${user.id}/active`,{method:'PATCH',body:JSON.stringify({active:!user.active})});await load()}catch(e:any){setError(e.message)}}
  return <Shell><div className="page-head"><div><h1>Comptes & accès</h1><div className="muted">Création des comptes et liaison aux dossiers étudiant/enseignant</div></div></div>
    <div className="panel"><h2>Nouveau compte</h2><form className="form-grid" onSubmit={submit}>
      <div className="field"><label>Prénom</label><input required value={form.firstName||''} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
      <div className="field"><label>Nom</label><input required value={form.lastName||''} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
      <div className="field"><label>Email</label><input required type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
      <div className="field"><label>Mot de passe initial</label><input required type="password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})}/></div>
      <div className="field"><label>Rôle</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value,studentProfileId:'',teacherProfileId:''})}><option value="STUDENT">Étudiant</option><option value="TEACHER">Enseignant</option><option value="SCOLARITE">Scolarité</option><option value="ADMIN">Administrateur</option></select></div>
      {form.role==='STUDENT'&&<div className="field"><label>Dossier étudiant</label><select required value={form.studentProfileId||''} onChange={e=>setForm({...form,studentProfileId:e.target.value})}><option value="">Sélectionner</option>{students.map(s=><option key={s.id} value={s.id}>{s.studentNumber} — {s.lastName} {s.firstName}</option>)}</select></div>}
      {form.role==='TEACHER'&&<div className="field"><label>Dossier enseignant</label><select required value={form.teacherProfileId||''} onChange={e=>setForm({...form,teacherProfileId:e.target.value})}><option value="">Sélectionner</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.employeeNumber} — {t.lastName} {t.firstName}</option>)}</select></div>}
      <div className="form-actions"><button className="btn btn-primary">Créer le compte</button></div>
    </form>{error&&<div className="error">{error}</div>}</div>
    <div className="panel"><h2>Comptes existants</h2><div className="table-wrap"><table className="table"><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Profil lié</th><th>État</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.lastName} {u.firstName}</td><td>{u.email}</td><td>{u.role}</td><td>{u.studentProfile?.studentNumber||u.teacherProfile?.employeeNumber||'—'}</td><td>{u.active?'Actif':'Désactivé'}</td><td><button className="btn btn-secondary" onClick={()=>toggle(u)}>{u.active?'Désactiver':'Réactiver'}</button></td></tr>)}</tbody></table></div></div>
  </Shell>
}
