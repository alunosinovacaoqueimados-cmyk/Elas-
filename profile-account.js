/* Perfil Elas+ — sincronização privada com Supabase Auth + RLS. */
'use strict';
(()=>{
 const BASE='https://tkawiuynettxhnkkgaxn.supabase.co';
 const AUTH=BASE+'/auth/v1';
 const REST=BASE+'/rest/v1/user_profiles';
 const KEY='sb_publishable_rrI8IU09VGGAmECXv5OUUQ_DTL8Ex9t';
 const STORAGE='elas-auth-session-v2';
 const $=id=>document.getElementById(id);
 const local=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 let session=null,user=null,profile=null,busy=false,applyingRemote=false;
 const status=(message,error=false)=>{const el=$('profileSyncStatus');if(el){el.textContent=message;el.dataset.error=String(error)}};
 function readSession(){try{return JSON.parse(sessionStorage.getItem(STORAGE)||'null')||JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{return null}}
 function saveSession(data){const current=readSession();const persistent=!!(current&&localStorage.getItem(STORAGE));session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(data.expires_in)||3600)};try{(persistent?localStorage:sessionStorage).setItem(STORAGE,JSON.stringify(session))}catch{}}
 async function auth(path,method='GET',body,token){
  const r=await fetch(AUTH+path,{method,headers:{apikey:KEY,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.msg||d.message||'Falha na autenticação');
  return d;
 }
 async function ensureSession(){
  const saved=readSession();if(!saved?.refresh_token)return null;
  let active=saved;
  if(!active.access_token||(Number(active.expires_at)||0)*1000<Date.now()+45000){
   active=await auth('/token?grant_type=refresh_token','POST',{refresh_token:active.refresh_token});
   saveSession(active);
  }
  try{user=await auth('/user','GET',null,active.access_token)}
  catch{
   active=await auth('/token?grant_type=refresh_token','POST',{refresh_token:active.refresh_token});saveSession(active);
   user=await auth('/user','GET',null,active.access_token);
  }
  session=active;return user;
 }
 async function rest(method,body){
  const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,Accept:'application/json'};
  if(body){headers['Content-Type']='application/json';headers.Prefer='resolution=merge-duplicates,return=representation'}
  const url=REST+'?select=user_id,display_name,interests,resume,resume_sync_enabled,preferences,updated_at&user_id=eq.'+encodeURIComponent(user.id);
  const r=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json().catch(()=>[]);
  if(!r.ok)throw new Error(d?.message||d?.hint||'Não foi possível acessar seu perfil salvo.');
  return d;
 }
 function setAccount(authed){
  $('profileAccountAvatar').textContent=authed?(user?.email||'E').trim().charAt(0).toUpperCase():'E';
  $('profileAccountTitle').textContent=authed?'Conta conectada':'Acesse seu perfil em qualquer dispositivo';
  $('profileAccountDescription').textContent=authed?(user?.email||'Conta autenticada'):'Entre ou crie uma conta gratuita para sincronizar seus dados.';
  $('profileLoginLink').hidden=authed;
  $('profileLogout').hidden=!authed;
  $('resumeSyncConsent').disabled=!authed;
 }
 function getPreferences(){return local('elasplus_preferences',{fontSize:'normal',theme:'purple',contrast:false,dyslexia:false})}
 function getResume(){return local('elasplus_cv',{})}
 function localProfile(){return {display_name:localStorage.getItem('elasplus_nickname')||'',interests:local('elasplus_interests',[]),preferences:getPreferences()}}
 function applyRemote(data){
  applyingRemote=true;
  if(data.display_name){localStorage.setItem('elasplus_nickname',data.display_name);$('nickname').value=data.display_name}
  const interests=Array.isArray(data.interests)?data.interests:[];
  localStorage.setItem('elasplus_interests',JSON.stringify(interests));
  document.querySelectorAll('#profileForm [type=checkbox]').forEach(el=>el.checked=interests.includes(el.value));
  if(data.preferences&&typeof data.preferences==='object'){
   localStorage.setItem('elasplus_preferences',JSON.stringify(data.preferences));
   for(const [id,key] of [['prefFont','fontSize'],['prefTheme','theme'],['prefContrast','contrast'],['prefDyslexia','dyslexia']]){
    const el=$(id);if(el&&data.preferences[key]!==undefined){if(el.type==='checkbox')el.checked=!!data.preferences[key];else el.value=data.preferences[key]}
   }
   const pref=data.preferences;document.documentElement.dataset.font=pref.fontSize||'normal';document.documentElement.dataset.theme=pref.theme||'purple';document.documentElement.dataset.contrast=pref.contrast?'high':'normal';document.documentElement.dataset.dyslexia=pref.dyslexia?'yes':'no';document.documentElement.style.setProperty('--font-size',({'normal':16,'large':18,'larger':20}[pref.fontSize]||16)+'px');
  }
  $('resumeSyncConsent').checked=!!data.resume_sync_enabled;
  if(data.resume_sync_enabled&&data.resume&&typeof data.resume==='object'){
   localStorage.setItem('elasplus_cv',JSON.stringify(data.resume));
   for(const [key,value] of Object.entries(data.resume)){const field=document.querySelector('#cvForm [name="'+CSS.escape(key)+'"]');if(field)field.value=String(value??'')}
   $('cvSaveStatus').textContent='Currículo recuperado da sua conta Elas+.';document.querySelectorAll('#cvForm input,#cvForm textarea').forEach(el=>el.dispatchEvent(new Event('input',{bubbles:true})));
  }else $('cvSaveStatus').textContent='Seu currículo está salvo somente neste navegador.';
  const nickname=data.display_name||'Visitante';const side=document.getElementById('sideName');if(side)side.textContent=nickname;const header=document.querySelector('.topbar .account>span:nth-child(2)');if(header)header.textContent=nickname==='Visitante'?'Olá, visitante':'Olá, '+nickname;
  applyingRemote=false;
 }
 async function saveRemote(){
  if(!user||!session)return;
  const base=localProfile(),resumeEnabled=$('resumeSyncConsent').checked;
  const payload={user_id:user.id,display_name:base.display_name,interests:base.interests,preferences:base.preferences,resume_sync_enabled:resumeEnabled,resume:resumeEnabled?getResume():{},updated_at:new Date().toISOString()};
  await rest('POST',payload);
  profile=payload;
  status('Perfil e preferências sincronizados com sua conta. '+(resumeEnabled?'Seu currículo também está sincronizado.':'Seu currículo continua somente neste navegador.'));
 }
 async function initialize(){
  try{
   const current=await ensureSession();
   if(!current){setAccount(false);status('Você está usando o Elas+ sem entrar. Seu nome, preferências e currículo ficam apenas neste navegador.');return}
   setAccount(true);
   const rows=await rest('GET');
   if(rows.length){profile=rows[0];applyRemote(profile)}
   else{
    profile={user_id:user.id,...localProfile(),resume:{},resume_sync_enabled:false};
    await rest('POST',{...profile,updated_at:new Date().toISOString()});
   }
   status('Conta conectada. Nome e preferências estão sincronizados entre dispositivos. O currículo só será enviado se você ativar a opção abaixo.');
  }catch(error){
   setAccount(false);status('Não foi possível carregar o perfil da conta: '+error.message,true);
  }
 }
 $('profileForm').addEventListener('submit',async()=>{
  if(!user)return;
  setTimeout(async()=>{try{await saveRemote()}catch(e){status('O perfil foi salvo neste navegador, mas não sincronizou: '+e.message,true)}},0);
 });
 $('saveCv').addEventListener('click',async()=>{
  if(!user)return;
  setTimeout(async()=>{if(!$('resumeSyncConsent').checked){status('Currículo salvo somente neste navegador. Ative a opção de sincronização se quiser acessá-lo em outros dispositivos.');return}try{await saveRemote()}catch(e){status('O currículo ficou salvo neste navegador, mas não sincronizou: '+e.message,true)}},0);
 });
 ['prefFont','prefTheme','prefContrast','prefDyslexia'].forEach(id=>$(id).addEventListener('change',async()=>{if(!user||applyingRemote)return;try{await saveRemote()}catch(e){status('Preferência alterada neste navegador, mas não sincronizada: '+e.message,true)}}));
 $('resumeSyncConsent').addEventListener('change',async()=>{
  if(!user){$('resumeSyncConsent').checked=false;return}
  try{await saveRemote();if(!$('resumeSyncConsent').checked)status('Sincronização do currículo desativada. A cópia salva na conta foi removida; a cópia local permanece neste navegador.')}
  catch(e){status('Não foi possível atualizar a preferência de currículo: '+e.message,true)}
 });
 $('profileLogout').addEventListener('click',async()=>{
  if(busy||!session)return;busy=true;$('profileLogout').disabled=true;
  try{await auth('/logout','POST',{},session.access_token)}catch{}
  try{sessionStorage.removeItem(STORAGE);localStorage.removeItem(STORAGE)}catch{}
  session=null;user=null;profile=null;setAccount(false);
  status('Você saiu da conta neste navegador. Os dados sincronizados continuam protegidos na sua conta para o próximo acesso.');
  busy=false;$('profileLogout').disabled=false;
 });
 initialize();
})();
