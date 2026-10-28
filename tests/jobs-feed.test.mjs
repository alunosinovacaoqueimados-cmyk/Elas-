import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../api/jobs.js';

test('API de vagas Remotive só aceita fonte legítima e não inventa anúncios',()=>{
 const job=normalize({
  id:1234,title:'Desenvolvedora Front-end',company_name:'Empresa Exemplo',
  url:'https://remotive.com/remote-jobs/software-dev/1234',
  candidate_required_location:'Worldwide',
  publication_date:'2026-10-28T12:00:00Z',
  description:'<h2>Função</h2><p>Desenvolvimento com <strong>React</strong></p>',
  salary:'',job_type:'Full-time',category:'Software Development'
 });
 assert.equal(job.id,'remotive-1234');
 assert.equal(job.company,'Empresa Exemplo');
 assert.equal(job.category,'geral');
 assert.equal(job.source,'Remotive');
 assert.equal(job.modality,'remoto');
 assert.equal(job.affirmative_verified,false);
 assert.equal(job.eligibility_unverified,true);
 assert.ok(job.description.includes('React'));
 assert.equal(job.description.includes('<strong>'),false);
 assert.equal(normalize({...job,id:99,url:'javascript:alert(1)',company_name:'x',title:'x',publication_date:'2026-10-28T12:00:00Z'}),null);
 assert.equal(normalize({id:3,title:'',company_name:'x',url:'https://remotive.com/a',publication_date:'2026-10-28T12:00:00Z'}),null);
});
