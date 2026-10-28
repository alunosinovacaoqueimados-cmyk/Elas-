import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originalEnv = process.env.VERCEL;
process.env.VERCEL='1';
const location=path.join(await fs.mkdtemp(path.join(os.tmpdir(),'elas-cloud-test-')),'records.json');
process.env.ELAS_REPORT_FILE=location;
const { server }=await import('../server.mjs');
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
try {
  await test('cloud: sem gravação em arquivos ou falsa publicação de relatos',async()=>{
    const res=await fetch(base+'/api/status');
    assert.equal(res.status,200);
    const info=await res.json();
    assert.equal(info.contributionsEnabled,false);
    const post=await fetch(base+'/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'positive',category:'lighting_ok',description:'Área acessível e bem iluminada.',lat:-22.71,lon:-43.55})});
    assert.equal(post.status,503);
    assert.match((await post.json()).error,/armazenamento persistente/);
    assert.equal((await fetch(base+'/api/admin/relatos')).status,503);
    await assert.rejects(fs.access(location));
  });
  await test('cloud: rotas API e arquivos estáticos existem',async()=>{
    const routes=['status','buscar','locais','relatos','assistente','admin/relatos','admin/moderar'];
    for(const name of routes){const mod=await import('../api/'+name+'.js');assert.equal(typeof mod.default,'function',name);}
    for(const file of ['index.html','seguranca.html','mapa-seguro.html','site-shell.css','seguranca.js','assets/hero-women.webp']){
      const original=await fs.readFile(path.join(root,file));const deployed=await fs.readFile(path.join(root,'public',file));
      assert.ok(original.equals(deployed),file);
    }
  });
} finally {await new Promise(r=>server.close(r));if(originalEnv===undefined)delete process.env.VERCEL;else process.env.VERCEL=originalEnv;await fs.rm(path.dirname(location),{recursive:true,force:true});}
