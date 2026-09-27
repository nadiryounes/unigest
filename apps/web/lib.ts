export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';

export function token(){
  if(typeof window==='undefined')return '';
  return localStorage.getItem('unigest_token')||'';
}

export async function api(path:string,options:RequestInit={}){
  const headers=new Headers(options.headers);
  headers.set('Content-Type','application/json');
  const t=token();
  if(t)headers.set('Authorization',`Bearer ${t}`);
  const res=await fetch(`${API}${path}`,{...options,headers,cache:'no-store'});
  if(res.status===401&&typeof window!=='undefined'){
    localStorage.removeItem('unigest_token');
    window.location.href='/';
  }
  if(!res.ok){
    let msg='Erreur API';
    try{const e=await res.json();msg=e.message||msg}catch{}
    throw new Error(Array.isArray(msg)?msg.join(', '):msg);
  }
  return res.json();
}

export async function apiBlob(path:string){
  const headers=new Headers();
  const t=token();
  if(t)headers.set('Authorization',`Bearer ${t}`);
  const res=await fetch(`${API}${path}`,{headers,cache:'no-store'});
  if(res.status===401&&typeof window!=='undefined'){
    localStorage.removeItem('unigest_token');
    window.location.href='/';
  }
  if(!res.ok) throw new Error('Impossible de télécharger le document');
  return res.blob();
}
