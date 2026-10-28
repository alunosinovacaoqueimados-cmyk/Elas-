import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root = new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const LABELS=['Início','Relações e Segurança','Saúde e Corpo','Carreira e Mães Solo','Serviços Públicos','Mapa Seguro','Comunidade','Meu Perfil','Configurações'];
test('páginas públicas compartilham a mesma navegação e cabeçalho da tela inicial',async()=>{
 const pages=await Promise.all(['index.html','seguranca.html','mapa-seguro.html','recursos.html'].map(read));
 for(const page of pages){
  for(const label of LABELS)assert.ok(page.includes(label),`Menu sem: ${label}`);
  assert.match(page,/class="brand-word"/);
  assert.match(page,/id="globalSearch"/);
  assert.match(page,/class="quick-exit"/);
  assert.match(page,/class="main-nav"/);
  assert.match(page,/class="nav-secondary"/);
 }
 for(const page of pages.slice(1)){
  assert.match(page,/href="site-shell.css"/);
  assert.match(page,/src="site-shell.js"/);
  assert.match(page,/href="mapa-seguro.html"/);
 }
});

test('Assistente e Mapa Seguro em páginas separadas',async()=>{
 const assistant=await read('seguranca.html');
 const map=await read('mapa-seguro.html');
 assert.match(assistant,/id="chatForm"/);
 assert.doesNotMatch(assistant,/id="map"/);
 assert.match(map,/id="map"/);
 assert.doesNotMatch(map,/id="chatForm"/);
 for(const p of [assistant,map,await read('index.html'),await read('recursos.html'),await read('moderacao.html')])assert.doesNotMatch(p,/Mapa Participativo/);
});
