"use client";
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, apiBlob } from '../../lib';

const statuses = ['SUBMITTED','INELIGIBLE','ELIGIBLE','SHORTLISTED','WAITLISTED','ADMITTED','REJECTED'];

export default function Page(){
  const [years,setYears]=useState<any[]>([]), [programs,setPrograms]=useState<any[]>([]), [campaigns,setCampaigns]=useState<any[]>([]);
  const [apps,setApps]=useState<any[]>([]), [groups,setGroups]=useState<any[]>([]), [stats,setStats]=useState<any>(null);
  const [form,setForm]=useState<any>({status:'DRAFT',minAverage:10,averageWeight:.7,testWeight:.3,shortlistThreshold:12});
  const [filter,setFilter]=useState(''), [error,setError]=useState('');
  const [convertTarget,setConvertTarget]=useState<any>(null), [conversion,setConversion]=useState<any>({temporaryPassword:'Student123!'});

  async function load(){
    const [y,p,c,a,g,s]=await Promise.all([
      api('/academic-years'), api('/programs'), api('/admissions/campaigns'),
      api(`/admissions/applications${filter?`?campaignId=${filter}`:''}`), api('/groups'), api('/admissions/stats')
    ]);
    setYears(y); setPrograms(p); setCampaigns(c); setApps(a); setGroups(g); setStats(s);
  }
  useEffect(()=>{load().catch(e=>setError(e.message))},[filter]);

  async function createCampaign(e:FormEvent){
    e.preventDefault(); setError('');
    try{
      await api('/admissions/campaigns',{method:'POST',body:JSON.stringify({
        name:form.name, academicYearId:form.academicYearId, programIds:form.programIds||[], startsOn:form.startsOn, endsOn:form.endsOn, status:form.status,
        eligibilityRules:{minAverage:Number(form.minAverage),averageWeight:Number(form.averageWeight),testWeight:Number(form.testWeight),shortlistThreshold:Number(form.shortlistThreshold)}
      })});
      setForm({status:'DRAFT',minAverage:10,averageWeight:.7,testWeight:.3,shortlistThreshold:12}); await load();
    }catch(e:any){setError(e.message)}
  }
  async function setStatus(id:string,status:string){try{await api(`/admissions/applications/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});await load()}catch(e:any){setError(e.message)}}
  async function evaluate(id:string){try{await api(`/admissions/campaigns/${id}/evaluate`,{method:'POST',body:'{}'});await load()}catch(e:any){setError(e.message)}}
  async function downloadDocument(applicationId:string,doc:any){
    try{
      const blob=await apiBlob(`/admissions/applications/${applicationId}/documents/${doc.id}/download`);
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url; anchor.download=doc.originalName||'document';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
    }catch(e:any){setError(e.message)}
  }
  function openConvert(a:any){
    const compatible=groups.filter(g=>g.program?.id===a.program?.id&&g.academicYear?.id===a.campaign?.academicYear?.id);
    setConvertTarget(a); setConversion({groupId:compatible[0]?.id||'',temporaryPassword:'Student123!',createAccount:true});
  }
  async function convert(e:FormEvent){
    e.preventDefault(); if(!convertTarget)return; setError('');
    try{await api(`/admissions/applications/${convertTarget.id}/convert`,{method:'POST',body:JSON.stringify(conversion)});setConvertTarget(null);await load()}catch(err:any){setError(err.message)}
  }
  const compatibleGroups=convertTarget?groups.filter(g=>g.program?.id===convertTarget.program?.id&&g.academicYear?.id===convertTarget.campaign?.academicYear?.id):[];

  return <Shell>
    <div className="page-head"><div><h1>Candidatures & admissions</h1><div className="muted">Campagnes, présélection, décisions et conversion des admis en étudiants.</div></div></div>
    {stats&&<div className="cards"><div className="stat"><div className="muted">Campagnes</div><div className="n">{stats.campaigns}</div></div><div className="stat"><div className="muted">Candidatures</div><div className="n">{stats.applications}</div></div>{['SUBMITTED','SHORTLISTED','ADMITTED'].map(k=><div className="stat" key={k}><div className="muted">{k}</div><div className="n">{stats.byStatus?.[k]||0}</div></div>)}</div>}
    {error&&<div className="error">{error}</div>}

    <div className="panel"><h2>Créer une campagne</h2><form className="form-grid" onSubmit={createCampaign}>
      <div className="field"><label>Nom</label><input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
      <div className="field"><label>Année universitaire</label><select required value={form.academicYearId||''} onChange={e=>setForm({...form,academicYearId:e.target.value})}><option value="">Sélectionner</option>{years.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
      <div className="field"><label>Filières ouvertes</label><select multiple required value={form.programIds||[]} onChange={e=>setForm({...form,programIds:Array.from(e.target.selectedOptions).map(o=>o.value)})}>{programs.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></div>
      <div className="field"><label>Début</label><input type="date" required value={form.startsOn||''} onChange={e=>setForm({...form,startsOn:e.target.value})}/></div>
      <div className="field"><label>Fin</label><input type="date" required value={form.endsOn||''} onChange={e=>setForm({...form,endsOn:e.target.value})}/></div>
      <div className="field"><label>Statut</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>DRAFT</option><option>OPEN</option><option>CLOSED</option><option>ARCHIVED</option></select></div>
      <div className="field"><label>Moyenne minimale</label><input type="number" step="0.01" value={form.minAverage} onChange={e=>setForm({...form,minAverage:e.target.value})}/></div>
      <div className="field"><label>Poids moyenne</label><input type="number" step="0.01" value={form.averageWeight} onChange={e=>setForm({...form,averageWeight:e.target.value})}/></div>
      <div className="field"><label>Poids test</label><input type="number" step="0.01" value={form.testWeight} onChange={e=>setForm({...form,testWeight:e.target.value})}/></div>
      <div className="field"><label>Seuil présélection</label><input type="number" step="0.01" value={form.shortlistThreshold} onChange={e=>setForm({...form,shortlistThreshold:e.target.value})}/></div>
      <div className="form-actions"><button className="btn btn-primary">Créer</button></div>
    </form></div>

    <div className="panel"><h2>Campagnes</h2><div className="table-wrap"><table className="table"><thead><tr><th>Campagne</th><th>Année / filières</th><th>Statut</th><th>Période</th><th>Action</th></tr></thead><tbody>{campaigns.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.academicYear?.label}<br/><span className="muted">{c.programs?.map((p:any)=>p.code).join(', ')}</span></td><td><span className="badge">{c.status}</span></td><td>{c.startsOn} → {c.endsOn}</td><td><button className="btn btn-secondary" onClick={()=>evaluate(c.id)}>Évaluer / classer</button></td></tr>)}</tbody></table></div></div>

    <div className="panel"><div className="page-head"><div><h2 style={{margin:0}}>Candidatures</h2></div><div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Toutes les campagnes</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Rang</th><th>N°</th><th>Candidat</th><th>Filière</th><th>Pièces</th><th>Score</th><th>Statut</th><th>Décision</th></tr></thead><tbody>{apps.map(a=><tr key={a.id}><td>{a.rank??'—'}</td><td>{a.applicationNumber}</td><td>{a.candidate?.lastName} {a.candidate?.firstName}<br/><span className="muted">{a.candidate?.email}</span></td><td>{a.program?.code}</td><td>{a.documents?.length? <div className="action-row">{a.documents.map((d:any)=><button key={d.id} className="mini-btn" title={d.originalName} onClick={()=>downloadDocument(a.id,d)}>{d.type}</button>)}</div> : '0'}</td><td>{a.score??'—'}</td><td><span className="badge">{a.status}</span></td><td><div className="action-row">{statuses.filter(s=>s!==a.status).map(s=><button key={s} className="mini-btn" onClick={()=>setStatus(a.id,s)}>{s}</button>)}{a.status==='ADMITTED'&&<button className="mini-btn primary" onClick={()=>openConvert(a)}>Créer étudiant</button>}</div></td></tr>)}</tbody></table></div></div>

    {convertTarget&&<div className="panel"><h2>Convertir l’admission en inscription</h2><p><strong>{convertTarget.candidate?.lastName} {convertTarget.candidate?.firstName}</strong> · {convertTarget.program?.name} · {convertTarget.campaign?.academicYear?.label}</p><form className="form-grid" onSubmit={convert}><div className="field"><label>Groupe</label><select value={conversion.groupId||''} onChange={e=>setConversion({...conversion,groupId:e.target.value})}><option value="">Sans groupe pour l’instant</option>{compatibleGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div><div className="field"><label>Mot de passe temporaire</label><input type="password" minLength={8} required={conversion.createAccount!==false} value={conversion.temporaryPassword||''} onChange={e=>setConversion({...conversion,temporaryPassword:e.target.value})}/></div><div className="field"><label>Créer le compte étudiant</label><select value={String(conversion.createAccount!==false)} onChange={e=>setConversion({...conversion,createAccount:e.target.value==='true'})}><option value="true">Oui</option><option value="false">Non</option></select></div><div className="form-actions"><button className="btn btn-primary">Créer dossier et inscription</button><button type="button" className="btn btn-secondary" onClick={()=>setConvertTarget(null)}>Annuler</button></div></form></div>}
  </Shell>
}
