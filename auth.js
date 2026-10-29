/* Elas+ autenticação via endpoints oficiais Supabase Auth, sem CDN.
 * Não cria sessão local sem confirmação remota. Por padrão, sessão termina
 * ao fechar o navegador (sessionStorage); permanência depende de escolha explícita.
 */
'use strict';
(() => {
const BASE='https://lfaawihslefpimqxfowa.supabase.co/auth/v1';
const PUBLIC_KEY='sb_publishable__35BqWQGTqvI-W6gaxerNw_RvJW3KnL';
const STORAGE='elas-auth-session-v2';
const $=id=>document.getElementById(id);
let mode='login',session=null,recoverySession=null,working=false;
const inputEmail=$('email'),inputPassword=$('password'),inputConfirm=$('confirmPassword');
const form=$('authForm'),submit=$('submitBtn'),remember=$('remember');
function getSaved(){
  try{
    const temporary=JSON.parse(sessionStorage.getItem(STORAGE)||'null');
    if(temporary?.refresh_token)return {...temporary,persistent:false};
    const persistent=JSON.parse(localStorage.getItem(STORAGE)||'null');
    return persistent?.refresh_token?{...persistent,persistent:true}:null;
  }catch{return null}
}
function clearSaved(){
  try{sessionStorage.removeItem(STORAGE)}catch{}
  try{localStorage.removeItem(STORAGE)}catch{}
}
function saveSession(result,persistent){
  const access=String(result?.access_token||''),refresh=String(result?.refresh_token||'');
  if(!access||!refresh)throw Error('missing_tokens');
  const data={access_token:access,refresh_token:refresh,
    expires_at:Math.floor(Date.now()/1000)+(Number(result.expires_in)||3600)};
  clearSaved();
  try{(persistent?localStorage:sessionStorage).setItem(STORAGE,JSON.stringify(data))}
  catch{if(persistent){try{sessionStorage.setItem(STORAGE,JSON.stringify(data))}catch{}}}
  session=data;
  return data;
}
function feedback(message,error=false,success=false){
  const field=$('feedback');field.textContent=message;field.dataset.error=String(error);field.dataset.success=String(success);
}
function errorText(error){
  const value=String(error?.message||error||'').toLowerCase();
  if(/invalid login credentials|invalid_grant|invalid_credentials/.test(value))return 'E-mail ou senha incorretos. Confira e tente novamente.';
  if(/email not confirmed|email_not_confirmed/.test(value))return 'Confirme o e-mail antes de entrar. Confira também a caixa de spam.';
  if(/signup.*disabled|signups not allowed/.test(value))return 'O cadastro não está habilitado no serviço de autenticação.';
  if(/already registered|user_already_exists/.test(value))return 'Este e-mail pode já ter uma conta. Tente entrar ou recuperar a senha.';
  if(/rate limit|over_email_send_rate_limit|too many/.test(value))return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if(/weak_password|password.*short|password should/.test(value))return 'Crie uma senha mais forte, de preferência com 12 ou mais caracteres.';
  if(/otp_expired|invalid.*token|token.*expired/.test(value))return 'O link expirou ou é inválido. Solicite uma nova recuperação.';
  if(/redirect/.test(value))return 'O endereço de retorno do e-mail precisa ser autorizado nas configurações do Supabase.';
  if(/network|fetch|failed to fetch|conex/.test(value))return 'Não foi possível conectar ao serviço de autenticação. Verifique a internet e tente novamente.';
  return 'Não foi possível concluir a solicitação. Tente novamente em instantes.';
}
async function authRequest(path,body,token,method='POST'){
  let response;
  try{
    response=await fetch(BASE+path,{method,headers:{
      'apikey':PUBLIC_KEY,
      ...(body===undefined?{}:{'Content-Type':'application/json'}),
      ...(token?{'Authorization':'Bearer '+token}:{})
    },...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  }catch{throw Error('network_error')}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(String(data.error_code||'')+' '+String(data.msg||data.message||data.error_description||data.error||response.status));
  return data;
}
function nextPage(){
  const raw=new URLSearchParams(location.search).get('next')||'index.html';
  try{
    const url=new URL(raw,location.href);
    if(url.origin!==location.origin||/\/login\.html$/i.test(url.pathname))return 'index.html';
    return url.pathname+url.search+url.hash;
  }catch{return 'index.html'}
}
$('continueLink').href=nextPage();
function showSignedIn(email){
  $('signedIn').hidden=false;$('authArea').hidden=true;
  $('accountEmail').textContent=email||'Conta confirmada';
  $('continueLink').href=nextPage();
}
function showForm(){
  $('signedIn').hidden=true;$('authArea').hidden=false;
}
function busy(value,label){
  working=value;submit.disabled=value;
  submit.setAttribute('aria-busy',String(value));
  if(value)$('submitLabel').textContent=label||'Aguarde…';
  else setSubmitLabel();
}
function setSubmitLabel(){
  $('submitLabel').textContent={
    login:'Entrar na minha conta',signup:'Criar minha conta',
    recover:'Enviar link de recuperação',recovery:'Atualizar minha senha'
  }[mode]||'Continuar';
}
function setMode(next,{preserveFeedback=false}={}){
  mode=next;
  const login=mode==='login',signup=mode==='signup',recover=mode==='recover',recovery=mode==='recovery';
  $('tabLogin').classList.toggle('selected',login);
  $('tabSignup').classList.toggle('selected',signup);
  $('tabLogin').setAttribute('aria-pressed',String(login));
  $('tabSignup').setAttribute('aria-pressed',String(signup));
  document.querySelector('.auth-tabs').hidden=recover||recovery;
  $('resetPassword').hidden=!login;
  $('backToLogin').hidden=!(recover||recovery);
  $('emailField').hidden=recovery;
  inputEmail.required=!recovery;
  $('passwordField').hidden=recover;
  inputPassword.required=!recover;
  $('confirmField').hidden=!(signup||recovery);
  inputConfirm.required=signup||recovery;
  $('passwordHint').hidden=!(signup||recovery);
  $('rememberRow').hidden=recover||recovery;
  inputPassword.autocomplete=signup||recovery?'new-password':'current-password';
  inputPassword.minLength=signup||recovery?8:1;
  inputPassword.type='password';
  $('togglePassword').textContent='Mostrar';
  $('togglePassword').setAttribute('aria-pressed','false');
  const title={login:'Que bom ter você aqui!',signup:'Vamos criar sua conta',recover:'Recuperar acesso',recovery:'Defina sua nova senha'};
  const detail={
    login:'Entre com seu e-mail e senha para continuar.',
    signup:'Use seu e-mail e crie uma senha forte. Talvez seja necessário confirmar seu e-mail.',
    recover:'Informe seu e-mail para receber as instruções de recuperação.',
    recovery:'Escolha uma nova senha e confirme antes de salvar.'
  };
  $('formTitle').textContent=title[mode];$('formHelp').textContent=detail[mode];
  if(!preserveFeedback)feedback('');
  setSubmitLabel();
}
$('tabLogin').addEventListener('click',()=>setMode('login'));
$('tabSignup').addEventListener('click',()=>setMode('signup'));
$('resetPassword').addEventListener('click',()=>{setMode('recover');inputEmail.focus()});
$('backToLogin').addEventListener('click',()=>{recoverySession=null;setMode('login');inputEmail.focus()});
$('togglePassword').addEventListener('click',()=>{
  const shown=inputPassword.type==='text';
  inputPassword.type=shown?'password':'text';
  $('togglePassword').textContent=shown?'Mostrar':'Ocultar';
  $('togglePassword').setAttribute('aria-pressed',String(!shown));
  $('togglePassword').setAttribute('aria-label',shown?'Mostrar senha':'Ocultar senha');
  inputPassword.focus();
});
function validInputs(){
  if(mode!=='recovery'&&!inputEmail.checkValidity()){feedback('Informe um e-mail válido.',true);inputEmail.focus();return false}
  if(mode==='recover')return true;
  if(!inputPassword.value){feedback('Informe sua senha.',true);inputPassword.focus();return false}
  if((mode==='signup'||mode==='recovery')&&inputPassword.value.length<8){feedback('A senha deve ter pelo menos 8 caracteres.',true);inputPassword.focus();return false}
  if((mode==='signup'||mode==='recovery')&&inputPassword.value!==inputConfirm.value){feedback('As senhas não coincidem.',true);inputConfirm.focus();return false}
  return true;
}
async function validateUser(token){
  if(!token)throw Error('missing_token');
  const user=await authRequest('/user',undefined,token,'GET');
  if(!user||typeof user.id!=='string')throw Error('invalid_user');
  return user;
}
async function signIn(email,password){
  const data=await authRequest('/token?grant_type=password',{email,password});
  const user=await validateUser(data.access_token);
  saveSession(data,remember.checked);
  inputPassword.value='';inputConfirm.value='';
  showSignedIn(user.email);
}
async function signUp(email,password){
  const redirect=new URL('login.html',location.href).href;
  const data=await authRequest('/signup?redirect_to='+encodeURIComponent(redirect),{email,password});
  inputPassword.value='';inputConfirm.value='';
  if(data?.access_token&&data?.refresh_token){
    const user=await validateUser(data.access_token);
    saveSession(data,remember.checked);
    showSignedIn(user.email);
  }else if(data?.user){
    setMode('login',{preserveFeedback:true});
    feedback('Solicitação recebida. Se necessário, confirme seu e-mail pelo link enviado antes de entrar.',false,true);
  }else throw Error('signup_not_confirmed');
}
async function recoverPassword(email){
  const redirect=new URL('login.html',location.href).href;
  await authRequest('/recover?redirect_to='+encodeURIComponent(redirect),{email});
  feedback('Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',false,true);
}
async function changePassword(password){
  if(!recoverySession?.access_token)throw Error('missing_token');
  await authRequest('/user',{password},recoverySession.access_token,'PUT');
  const token=recoverySession.access_token;
  recoverySession=null;
  clearSaved();session=null;
  try{await authRequest('/logout',{},token)}catch{}
  inputPassword.value='';inputConfirm.value='';
  setMode('login',{preserveFeedback:true});
  feedback('Senha atualizada. Agora entre com sua nova senha.',false,true);
  inputEmail.focus();
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(working||!validInputs())return;
  const current=mode,email=inputEmail.value.trim(),password=inputPassword.value;
  busy(true,current==='recover'?'Enviando instruções…':'Processando…');
  try{
    if(current==='login')await signIn(email,password);
    else if(current==='signup')await signUp(email,password);
    else if(current==='recover')await recoverPassword(email);
    else if(current==='recovery')await changePassword(password);
  }catch(error){feedback(errorText(error),true)}
  finally{busy(false)}
});
$('logout').addEventListener('click',async()=>{
  if(working)return;
  working=true;$('logout').disabled=true;
  const token=session?.access_token;
  clearSaved();session=null;
  try{if(token)await authRequest('/logout',{},token)}
  catch{/* token local foi apagado, mesmo se revogação remota falhar */}
  finally{
    working=false;$('logout').disabled=false;
    showForm();remember.checked=false;setMode('login');
    feedback('Você saiu deste navegador. Se estiver usando um dispositivo compartilhado, feche a aba.',false,true);
  }
});
async function handleRedirect(){
  const fragment=new URLSearchParams(location.hash.slice(1));
  const search=new URLSearchParams(location.search);
  const error=fragment.get('error_description')||fragment.get('error');
  if(error){history.replaceState(null,'',location.pathname);feedback('O link de autenticação não pôde ser validado. Solicite outro e-mail.',true);return true}
  const type=fragment.get('type')||search.get('type');
  const access=fragment.get('access_token'),refresh=fragment.get('refresh_token');
  const tokenHash=search.get('token_hash');
  if(type!=='recovery'&&type!=='signup'&&type!=='magiclink'&&type!=='invite')return false;
  // Remover tokens da URL antes de qualquer requisição ou renderização.
  history.replaceState(null,'',location.pathname);
  try{
    let tokens;
    if(access&&refresh)tokens={access_token:access,refresh_token:refresh};
    else if(tokenHash)tokens=await authRequest('/verify',{type,token_hash:tokenHash});
    else{feedback('O link de acesso está incompleto. Solicite um novo e-mail.',true);return true}
    if(type==='recovery'){
      recoverySession=tokens;
      setMode('recovery');
      feedback('Link verificado. Escolha sua nova senha.',false,true);
    }else{
      const user=await validateUser(tokens.access_token);
      saveSession(tokens,false);
      showSignedIn(user.email);
    }
  }catch(error){feedback(errorText(error),true)}
  return true;
}
async function restoreSession(){
  const saved=getSaved();
  if(!saved?.refresh_token)return;
  remember.checked=Boolean(saved.persistent);
  // Tokens do navegador só serão considerados uma conta após validação /user.
  try{
    let tokens=saved;
    if(!saved.access_token||saved.expires_at*1000<=Date.now()+60000){
      tokens=await authRequest('/token?grant_type=refresh_token',{refresh_token:saved.refresh_token});
    }
    let user;
    try{user=await validateUser(tokens.access_token)}
    catch{
      tokens=await authRequest('/token?grant_type=refresh_token',{refresh_token:tokens.refresh_token});
      user=await validateUser(tokens.access_token);
    }
    saveSession(tokens,Boolean(saved.persistent));
    showSignedIn(user.email);
  }catch{
    clearSaved();session=null;showForm();
    feedback('Sua sessão anterior expirou. Entre novamente para continuar.',false);
  }
}
window.__elasAuthLoaded=true;
(async()=>{
  if(await handleRedirect())return;
  await restoreSession();
})();
})();
