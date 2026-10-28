import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
test('Mapa Seguro: filtros, busca por nome, raio, rota e resultados acessíveis',async()=>{
 const html=await read('mapa-seguro.html'),js=await read('seguranca.js'),css=await read('mapa-seguro.css');
 for(const type of ['pharmacy','shop','police','health','food','social','childcare','services','positive','attention'])
   assert.ok(html.includes(`data-filter="${type}"`),type);
 for(const id of ['placeInput','placeForm','establishmentSearch','searchRadius','placeResultsSummary','placeList','serviceDetails'])
   assert.ok(html.includes(`id="${id}"`),id);
 assert.match(js,/function normalizeSearch/);
 assert.match(js,/function formatDistance/);
 assert.match(js,/Como chegar/);
 assert.match(js,/state\.listLimit\+=20/);
 assert.match(css,/\.map-discovery/);
 for(const file of ['mapa-seguro.html','mapa-seguro.css','seguranca.js'])
   assert.equal(await read(file),await read('public/'+file),'Versão pública desatualizada: '+file);
});
