/* Elas+ — estado de conta compartilhado. Nunca confiar apenas em um token armazenado. */
'use strict';
(()=>{
const BASE='https://lfaawihslefpimqxfowa.supabase.co/auth/v1';
const PUBLIC_KEY='sb_publishable__35BqWQGTqvI-W6gaxerNw_RvJW3KnL';
const STORAGE='elas-auth-session-v2';
const account=document.querySelector('.topbar .account');
const entry=document.querySelector('.topbar .elas-login-link');
if(!account&&!entry)return;
function read(storage){
 try{const raw=JSON.parse(storage.getItem(STORAGE)||'null');return raw?.refresh_token?raw:null}catch{return null}
}
function saved(){
 const fromSession=read(sessionStorage);
 if(fromSession)return {data:fromSession,persistent:false};
 const fromLocal=read(localStorage);
 return fromLocal?{data:fromLocal,persistent:true}:null;
}
function clear(){
 try{sessionStorage.removeItem(STORAGE)}catch{}
 try{localStorage.removeItem(STORAGE)}catch{}
}
function store(value,persistent){
 const record={access_token:value.access_token,refresh_token:value.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(value.expires_in)||3600)};
 clear();try{(persistent?localStorage:sessionStorage).setItem(STORAGE,JSON.stringify(record))}catch{}
 return record;
}
function setUi(authenticated){
 document.documentElement.dataset.auth=authenticated?'signed-in':'guest';
 if(entry)entry.hidden=authenticated;
 if(account){
  const display=account.querySelector('span:nth-child(2)');
  if(display)display.textContent=authenticated?'Minha conta':'Olá, visitante';
  const avatar=account.querySelector('.avatar');
  if(avatar)avatar.textContent=authenticated?'✓':'E';
  account.setAttribute('aria-label',authenticated?'Gerenciar minha conta Elas+':'Entrar ou criar conta no Elas+');
  if(account.tagName==='A')account.href='login.html';
 }
}
function endpoint(path,method,body,accessToken){
 return fetch(BASE+path,{
  method,headers:{apikey:PUBLIC_KEY,
   ...(accessToken?{Authorization:'Bearer '+accessToken}:{}),
   ...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9500)
 }).then(async r=>{
  if(!r.ok)throw Error('auth-'+r.status);
  return await r.json();
 });
}
async function update(){
 const current=saved();
 if(!current){setUi(false);return}
 try{
  let data=current.data;
  if(!data.access_token||(Number(data.expires_at)||0)*1000<=Date.now()+30000)
   data=store(await endpoint('/token?grant_type=refresh_token','POST',{refresh_token:data.refresh_token}),current.persistent);
  let user;
  try{user=await endpoint('/user','GET',null,data.access_token)}
  catch(error){
   if(error.message!=='auth-401')throw error;
   data=store(await endpoint('/token?grant_type=refresh_token','POST',{refresh_token:data.refresh_token}),current.persistent);
   user=await endpoint('/user','GET',null,data.access_token);
  }
  setUi(Boolean(user?.id));
 }catch(error){
  // Sem conexão não apagamos sessão válida; falha de credenciais remove token.
  if(/^auth-(400|401|403)$/.test(error.message)){clear()}
  setUi(false);
 }
}
setUi(false);update();
window.addEventListener('storage',event=>{if(event.key===STORAGE)update()});
})();
