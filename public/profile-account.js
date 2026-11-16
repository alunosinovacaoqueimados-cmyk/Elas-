/* Perfil Elas+ — sincronização privada com Supabase Auth + RLS. */
'use strict';
(()=>{
 const BASE='https://tkawiuynettxhnkkgaxn.supabase.co';
 const AUTH=BASE+'/auth/v1';
 const REST=BASE+'/rest/v1/user_profiles';
 const AVATAR_BUCKET='elas-avatars';
 const KEY='sb_publishable_rrI8IU09VGGAmECXv5OUUQ_DTL8Ex9t';
 const STORAGE='elas-auth-session-v2';
 const $=id=>document.getElementById(id);
 const local=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 let session=null,user=null,profile=null,busy=false,applyingRemote=false,avatarBusy=false;
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
  if(body){headers['Content-Type']='application/json';headers.Prefer=method==='POST'?'resolution=merge-duplicates,return=representation':'return=representation'}
  const url=REST+'?select=user_id,display_name,interests,resume,resume_sync_enabled,preferences,avatar_path,updated_at&user_id=eq.'+encodeURIComponent(user.id);
  const r=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json().catch(()=>[]);
  if(!r.ok)throw new Error(d?.message||d?.hint||'Não foi possível acessar seu perfil salvo.');
  return d;
 }
 function avatarInitial(){const displayName=localStorage.getItem('elasplus_nickname')||'';return (displayName||user?.email||'E').trim().charAt(0).toUpperCase()||'E'}
 function avatarUrl(path){return path?BASE+'/storage/v1/object/public/'+AVATAR_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/')+'?v='+encodeURIComponent(profile?.updated_at||'1'):''}
 function renderAvatar(){
  const image=$('profileAvatarImage'),initial=$('profileAvatarInitial'),remove=$('profileAvatarRemove'),header=document.querySelector('.topbar .account .avatar');
  const path=profile?.avatar_path||'',url=avatarUrl(path),letter=avatarInitial();
  if(image){image.hidden=!url;if(url)image.src=url;else image.removeAttribute('src')}
  if(initial){initial.hidden=!!url;initial.textContent=letter}
  if(remove)remove.hidden=!url;
  if(header){header.textContent=url?'':letter;header.style.backgroundImage=url?'url('+JSON.stringify(url)+')':'';header.style.backgroundSize=url?'cover':'';header.style.backgroundPosition=url?'center':'';header.style.color=url?'transparent':''}
  const statusEl=$('profileAvatarStatus');if(statusEl)statusEl.textContent=url?'Sua foto de perfil está salva na sua conta.':(user?'Você ainda não adicionou uma foto.':'Entre na sua conta para adicionar uma foto.');
 }
 function setAccount(authed){
  const displayName=localStorage.getItem('elasplus_nickname')||''; $('profileAvatarInitial').textContent=authed?(displayName||user?.email||'E').trim().charAt(0).toUpperCase():'E';
  $('profileAccountTitle').textContent=authed?'Conta conectada':'Acesse seu perfil em qualquer dispositivo';
  $('profileAccountDescription').textContent=authed?(user?.email||'Conta autenticada'):'Entre ou crie uma conta gratuita para sincronizar seus dados.';
  const emailField=$('profileAccountEmail');if(emailField)emailField.textContent=authed?(user?.email||'E-mail não disponível'):'Entre para visualizar';
  const syncLabel=$('profileSyncLabel');if(syncLabel)syncLabel.textContent=authed?'Conta conectada':'Somente neste navegador';
  $('profileLoginLink').hidden=authed;
  $('profileLogout').hidden=!authed;
  $('resumeSyncConsent').disabled=!authed;
  $('profileAvatarChoose').disabled=!authed;
  $('profileAvatarChoose').textContent=authed?(profile?.avatar_path?'Trocar foto':'Adicionar foto'):'Entrar para adicionar foto';
  renderAvatar();
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
  profile=data;
  renderAvatar();
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
  profile={...profile,...payload};
  status('Perfil e preferências sincronizados com sua conta. '+(resumeEnabled?'Seu currículo também está sincronizado.':'Seu currículo continua somente neste navegador.'));
  const syncLabel=$('profileSyncLabel');if(syncLabel)syncLabel.textContent=resumeEnabled?'Perfil e currículo sincronizados':'Perfil sincronizado';
 }
 async function initialize(){
  try{
   const current=await ensureSession();
   if(!current){setAccount(false);status('Você está usando o Elas+ sem entrar. Seu nome, preferências e currículo ficam apenas neste navegador.');return}
   setAccount(true);
   const rows=await rest('GET');
   if(rows.length){profile=rows[0];applyRemote(profile);renderAvatar()}
   else{
    profile={user_id:user.id,...localProfile(),resume:{},resume_sync_enabled:false,avatar_path:null};
    await rest('POST',{...profile,updated_at:new Date().toISOString()});
   }
   status('Conta conectada. Nome e preferências estão sincronizados entre dispositivos. O currículo só será enviado se você ativar a opção abaixo.');
  }catch(error){
   const saved=readSession();
   if(saved?.refresh_token){
    $('profileAccountAvatar').textContent='…';
    $('profileAccountTitle').textContent='Sessão encontrada';
    $('profileAccountDescription').textContent='Não foi possível confirmar sua conta agora. Verifique a conexão e atualize a página.';
    $('profileLoginLink').hidden=true;
    $('profileLogout').hidden=false;
    $('resumeSyncConsent').disabled=true;
    status('Sua sessão foi encontrada, mas a autenticação não respondeu. O botão de entrar foi ocultado para evitar um novo cadastro desnecessário. '+error.message,true);
   }else{
    setAccount(false);
    status('Não foi possível carregar o perfil da conta: '+error.message,true);
   }
  }
 }
 async function imageAsWebp(file){
  if(!file||file.type.split('/')[0]!=='image'||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Escolha uma imagem JPG, PNG, WEBP ou GIF.');
  if(file.size>8*1024*1024)throw new Error('A imagem deve ter no máximo 8 MB.');
  if(!('createImageBitmap' in window))throw new Error('Seu navegador não oferece suporte ao processamento desta imagem.');
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.84));
  if(!blob)throw new Error('Não foi possível preparar a imagem.');
  if(blob.size>2*1024*1024)throw new Error('A imagem processada ultrapassou o limite de 2 MB. Escolha outra foto.');
  return blob;
 }
 async function uploadAvatar(file){
  if(!user||!session)throw new Error('Entre na sua conta antes de adicionar uma foto.');
  const blob=await imageAsWebp(file),path=user.id+'/avatar.webp';
  const response=await fetch(BASE+'/storage/v1/object/'+AVATAR_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/'),{
   method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'image/webp','x-upsert':'true','cache-control':'3600'},body:blob
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.message||result.error||'O envio da foto foi recusado pelo armazenamento.');
  await rest('PATCH',{avatar_path:path,updated_at:new Date().toISOString()});
  profile={...profile,avatar_path:path,updated_at:new Date().toISOString()};
  renderAvatar();$('profileAvatarChoose').textContent='Trocar foto';
  status('Foto de perfil atualizada e salva na sua conta.');
 }
 async function removeAvatar(){
  if(!user||!session||!profile?.avatar_path)return;
  const path=profile.avatar_path;
  const response=await fetch(BASE+'/storage/v1/object/'+AVATAR_BUCKET,{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.message||result.error||'Não foi possível remover a foto.');
  await rest('PATCH',{avatar_path:null,updated_at:new Date().toISOString()});
  profile={...profile,avatar_path:null,updated_at:new Date().toISOString()};
  renderAvatar();$('profileAvatarChoose').textContent='Adicionar foto';
  status('Foto de perfil removida da sua conta.');
 }
 $('profileAvatarChoose').addEventListener('click',()=>{if(user&&!avatarBusy)$('profileAvatarFile').click()});
 $('profileAvatarFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  avatarBusy=true;$('profileAvatarChoose').disabled=true;$('profileAvatarRemove').disabled=true;$('profileAvatarStatus').textContent='Preparando e enviando sua foto…';
  try{await uploadAvatar(file)}catch(error){$('profileAvatarStatus').textContent=error.message;status('Não foi possível atualizar sua foto: '+error.message,true)}
  finally{avatarBusy=false;$('profileAvatarChoose').disabled=!user;$('profileAvatarRemove').disabled=false;event.target.value=''}
 });
 $('profileAvatarRemove').addEventListener('click',async()=>{
  if(avatarBusy||!profile?.avatar_path)return;
  if(!confirm('Deseja remover sua foto de perfil?'))return;
  avatarBusy=true;$('profileAvatarChoose').disabled=true;$('profileAvatarRemove').disabled=true;
  try{await removeAvatar()}catch(error){$('profileAvatarStatus').textContent=error.message;status('Não foi possível remover sua foto: '+error.message,true)}
  finally{avatarBusy=false;$('profileAvatarChoose').disabled=!user;$('profileAvatarRemove').disabled=false}
 });
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
  session=null;user=null;profile=null;setAccount(false);renderAvatar();
  status('Você saiu da conta neste navegador. Os dados sincronizados continuam protegidos na sua conta para o próximo acesso.');
  busy=false;$('profileLogout').disabled=false;
 });
 initialize();
})();
