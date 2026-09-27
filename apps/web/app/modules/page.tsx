"use client";
import { useEffect, useState } from 'react';
import CrudPage, { Field } from '../../components/CrudPage';
import { api } from '../../lib';
export default function Page(){
  const [p,setP]=useState<any[]>([]),[t,setT]=useState<any[]>([]),[s,setS]=useState<any[]>([]);
  useEffect(()=>{Promise.all([api('/programs'),api('/teachers'),api('/academic-structure/semesters')]).then(([a,b,c])=>{setP(a);setT(b);setS(c)})},[]);
  const fields:Field[]=[{name:'code',label:'Code',required:true},{name:'name',label:'Module',required:true},{name:'semesterRefId',label:'Semestre académique',options:s.map(x=>({value:x.id,label:`${x.level?.program?.code || ''} ${x.level?.name || ''} · ${x.name}`}))},{name:'semester',label:'Semestre (numéro)',type:'number'},{name:'coefficient',label:'Coefficient',type:'number',required:true},{name:'programId',label:'Filière',options:p.map(x=>({value:x.id,label:x.code}))},{name:'teacherId',label:'Enseignant',options:t.map(x=>({value:x.id,label:`${x.lastName} ${x.firstName}`}))}];
  return <CrudPage title="Modules" subtitle="Modules rattachés à la structure académique" endpoint="/academic-modules" fields={fields} columns={[{key:'code',label:'Code'},{key:'name',label:'Module'},{key:'semesterRef.name',label:'Semestre'},{key:'coefficient',label:'Coeff.'},{key:'program.code',label:'Filière'},{key:'teacher.lastName',label:'Enseignant'}]}/>;
}
