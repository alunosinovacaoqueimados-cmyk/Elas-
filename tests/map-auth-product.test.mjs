import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const ROOT=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,ROOT),'utf8');

test('Login: fluxo completo com IDs existentes, senha e sessão autenticada',async()=>{
 const html=await read('login.html'),js=await read('auth.js'),css=await read('auth.css');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const id of ['authForm','email','password','confirmPassword','submitBtn','remember','tabLogin','tabSignup','resetPassword','backToLogin','feedback','signedIn','logout','quickExit','continueLink'])
  assert.ok(ids.has(id),id);
 for(const ref of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(ref[1]),'Referência DOM não encontrada: '+ref[1]);
 assert.match(js,/await validateUser\(data\.access_token\)/);
 assert.match(js,/sessionStorage/);
 assert.match(js,/history\.replaceState/);
 assert.match(js,/\/token\?grant_type=refresh_token/);
 assert.match(js,/\/verify/);
 assert.match(js,/\/user/);
 assert.match(js,/\bsetMode\('recovery'\)/);
 assert.doesNotMatch(js,/localStorage\.setItem\([^\n]*password/i);
 assert.match(css,/@media\(max-width:760px\)/);
 new vm.Script(js,{filename:'auth.js'});
 assert.equal(await read('public/login.html'),html);
 assert.equal(await read('public/auth.js'),js);
 assert.equal(await read('public/auth.css'),css);
});

test('Mapa: serviço em primeiro plano, saída para falhas e relatos bloqueados quando indisponíveis',async()=>{
 const html=await read('mapa-seguro.html'),js=await read('seguranca.js'),css=await read('mapa-seguro.css'),server=await read('server.mjs');
 for(const id of ['map','placeForm','placeInput','myLocation','mapStatus','offlineSupport','osmFallbackLink','googleFallbackLink','retryPlaces','mapContributionStatus'])
  assert.match(html,new RegExp('id="'+id+'"'),'Faltando '+id);
 assert.ok(html.indexOf('map-product-intro')<html.indexOf('id="map"'));
 assert.doesNotMatch(html,/id="shortcutHeading"/);
 assert.match(js,/let contributionsEnabled=false/);
 assert.match(js,/data\?\.contributionsEnabled===true/);
 assert.match(js,/function updateMapFallbackLink/);
 assert.match(js,/\/api\/locais\?/);
 const overpass=await read('lib/overpass.mjs');
 assert.match(server,/queryOverpass/);
 assert.match(overpass,/overpass\\.private\\.coffee/);
 assert.match(overpass,/Promise\\.any\\(sources/);
 assert.match(css,/\.map-product-intro/);
 new vm.Script(js,{filename:'seguranca.js'});
 for(const f of ['mapa-seguro.html','mapa-seguro.css','seguranca.js','separado.css'])
  assert.equal(await read(f),await read('public/'+f),'Mirror desatualizado '+f);
});

test('Identidade compartilhada: conta verificada chega à Home e páginas internas',async()=>{
 const state=await read('auth-shell.js');
 new vm.Script(state,{filename:'auth-shell.js'});
 assert.match(state,/\/user/);
 assert.match(state,/if\(entry\)entry\.hidden=authenticated/);
 for(const p of ['index.html','recursos.html','mapa-seguro.html','seguranca.html','vagas-mulheres.html','mulheres-trans.html']){
  const html=await read(p);
  assert.match(html,/src="auth-shell\.js"/,p);
  assert.equal(await read('public/'+p),html,'Mirror desatualizado '+p);
 }
 assert.equal(await read('public/auth-shell.js'),state);
});
