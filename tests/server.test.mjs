import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'elas-test-'));
const mock=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url.startsWith('/search'))return res.end(JSON.stringify([{display_name:'Queimados, Rio de Janeiro, Brasil',lat:'-22.716',lon:'-43.56'}]));res.end(JSON.stringify({elements:[
 {type:'node',id:123,lat:-22.716,lon:-43.56,tags:{amenity:'police',name:'Delegacia teste OSM'}},
 {type:'node',id:124,lat:-22.714,lon:-43.559,tags:{amenity:'pharmacy',name:'Farmácia teste OSM'}},
 {type:'node',id:125,lat:-22.719,lon:-43.555,tags:{shop:'supermarket',name:'Mercado teste OSM'}},
 {type:'node',id:126,lat:-22.713,lon:-43.562,tags:{shop:'clothes',name:'Loja teste OSM'}},
 {type:'node',id:127,lat:-22.712,lon:-43.563,tags:{amenity:'restaurant',name:'Restaurante teste OSM'}},
 {type:'node',id:128,lat:-22.717,lon:-43.561,tags:{amenity:'bank',name:'Banco teste OSM'}}
]}));});
mock.listen(0,'127.0.0.1');await once(mock,'listening');const mockPort=mock.address().port;
process.env.ELAS_ADMIN_TOKEN='segredo_testes_moderacao_2026';
process.env.ELAS_REPORT_FILE=path.join(dir,'reports.json');
process.env.NOMINATIM_URL=`http://127.0.0.1:${mockPort}/search`;
process.env.OVERPASS_URL=`http://127.0.0.1:${mockPort}/overpass`;
const {server}=await import('../server.mjs');server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
const json=async(url,init)=>{const res=await fetch(base+url,init);return [res.status,await res.json()];};
try{
 await test('páginas com mesma aplicação e cabeçalhos seguros',async()=>{
   for(const page of ['/','/seguranca.html','/mapa-seguro.html','/recursos.html','/styles.css','/unificado.css','/moderacao.html']){const r=await fetch(base+page);assert.equal(r.status,200,page);assert.ok(r.headers.get('x-content-type-options'));}
   assert.equal((await fetch(base+'/storage/reports.json')).status,403);
   assert.equal((await fetch(base+'/.gitignore')).status,403);
   assert.equal((await fetch(base+'/tests/server.test.mjs')).status,403);
 });
 await test('status e autenticação',async()=>{
   const [status,data]=await json('/api/status');assert.equal(status,200);assert.equal(data.aiEnabled,false);
   assert.equal((await json('/api/admin/relatos'))[0],401);
   assert.equal((await json('/api/assistente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'oi'})}))[0],503);
 });
 await test('consulta externa via Node e validação de localização',async()=>{
   const [a,{results}]=await json('/api/buscar?q=Queimados%2C%20RJ');assert.equal(a,200);assert.equal(results[0].lat,-22.716);
   const [b,{places}]=await json('/api/locais?lat=-22.716&lon=-43.56');assert.equal(b,200);assert.equal(places[0].type,'police');
   const [shopsCode,shops]=await json('/api/locais?lat=-22.716&lon=-43.56&type=shop&radius=3000');
   assert.equal(shopsCode,200);assert.deepEqual(shops.places.map(p=>p.type),['shop','shop']);
   assert.ok(shops.places.every(p=>p.distance>=0&&p.distance<=3000));
   const [pharmacyCode,pharmacies]=await json('/api/locais?lat=-22.716&lon=-43.56&type=pharmacy&radius=1000');
   assert.equal(pharmacyCode,200);assert.equal(pharmacies.places[0].name,'Farmácia teste OSM');
   const [foodCode,food]=await json('/api/locais?lat=-22.716&lon=-43.56&type=food&radius=5000');
   assert.equal(foodCode,200);assert.equal(food.places[0].type,'food');
   assert.equal((await json('/api/locais?lat=-22.716&lon=-43.56&type=invalid'))[0],400);
   assert.equal((await json('/api/locais?lat=-22.716&lon=-43.56&radius=50000'))[0],400);
   assert.equal((await json('/api/locais?lat=abc&lon=xyz'))[0],400);
   assert.equal((await json('/api/buscar?q=a'))[0],400);
 });
 await test('relato pendente, publicação somente após aprovação e privacidade',async()=>{
   const body={category:'lighting',description:'A iluminação da praça está inadequada à noite.',lat:-22.71309,lon:-43.56642};
   const [code,result]=await json('/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(code,201);assert.equal(result.status,'pending');
   let [sc,{reports}]=await json('/api/relatos');assert.equal(sc,200);assert.equal(reports.length,0);
   const auth={Authorization:'Bearer '+process.env.ELAS_ADMIN_TOKEN};
   const pending=await json('/api/admin/relatos',{headers:auth});assert.equal(pending[1].reports[0].lat,-22.71);assert.equal(pending[1].reports[0].lon,-43.57);
   const [mod]=await json('/api/admin/moderar',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({id:result.id,status:'approved'})});assert.equal(mod,200);
   [sc,{reports}]=await json('/api/relatos');assert.equal(reports.length,1);assert.equal(reports[0].description,body.description);assert.equal(reports[0].lat,-22.71);
   const privateAttempt=await json('/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,description:'Ligue para mim no número 21999998888'})});assert.equal(privateAttempt[0],400);
   // Registros participativos: experiências positivas e pontos de atenção.
   for(const [kind,category] of [['positive','lighting_ok'],['attention','lighting']]){
     const record={kind,category,description:'Experiência relatada nesta praça, sem dados pessoais.',lat:-22.7185,lon:-43.5579};
     const [createdCode,created]=await json('/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});
     assert.equal(createdCode,201);assert.equal(created.status,'pending');
     const [,visibleBefore]=await json('/api/relatos');assert.equal(visibleBefore.reports.some(x=>x.id===created.id),false);
     const [accepted]=await json('/api/admin/moderar',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({id:created.id,status:'approved'})});assert.equal(accepted,200);
     const [,visibleAfter]=await json('/api/relatos');const confirmed=visibleAfter.reports.find(x=>x.id===created.id);
     assert.equal(confirmed.kind,kind);assert.equal(confirmed.category,category);
     assert.equal(confirmed.lat,-22.72);assert.equal(confirmed.lon,-43.56);
   }
   const [limitStatus]=await json('/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'positive',category:'lighting_ok',description:'Outra contribuição sobre o mesmo espaço público.',lat:-22.7,lon:-43.55})});
   assert.equal(limitStatus,429); // limite diário protege a moderação contra abuso

 });
}finally{await new Promise(r=>server.close(r));await new Promise(r=>mock.close(r));await fs.rm(dir,{recursive:true,force:true});}
