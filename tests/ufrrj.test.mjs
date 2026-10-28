import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {identifyNeed,nextStepsFor} from '../apoio-fluxos.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>fs.readFile(path.join(ROOT,file),'utf8');

test('classifica necessidades e apresenta caminhos adequados sem enviar texto para links',()=>{
  assert.equal(identifyNeed('Estou em perigo e preciso de socorro!'),'urgente');
  assert.equal(identifyNeed('Sofri assédio no trabalho'),'trabalho');
  assert.equal(identifyNeed('Meu namorado me controla'),'relacionamento');
  assert.equal(identifyNeed('Preciso encontrar uma creche para meu filho'),'familia');
  assert.equal(identifyNeed('Quero uma UBS perto de mim'),'saude');
  assert.equal(identifyNeed('Quero uma informação'),'geral');
  for(const input of ['perigo', 'assédio no trabalho', 'creche', 'saúde', 'ajuda']){
    const flow=nextStepsFor(input);
    assert.ok(flow.title&&flow.description&&flow.actions.length>=2);
    for(const action of flow.actions){assert.match(action.href,/^(?:tel:[0-9]+|https:\/\/.+|mapa-seguro\.html(?:\?f=[a-z]+)?|recursos\.html#[a-z]+)$/);assert.ok(!action.href.includes(encodeURIComponent(input)))}
  }
  assert.ok(nextStepsFor('estou em perigo').actions.some(a=>a.href==='tel:190'));
  assert.ok(nextStepsFor('Sofri assédio no trabalho').actions.some(a=>a.href==='mapa-seguro.html?f=social'));
});

test('etapas de encaminhamento aparecem no assistente e mapa exibe ações reais',async()=>{
  const assistant=await read('seguranca.html');const map=await read('mapa-seguro.html');const script=await read('seguranca.js');
  assert.match(assistant,/id="nextSteps"/);
  assert.match(assistant,/apoio-fluxos\.css/);
  assert.match(map,/id="serviceDetails"/);
  assert.match(map,/id="offlineSupport"/);
  assert.match(script,/showNextSteps\(val\)/);
  assert.match(script,/showServiceDetails\(place\)/);
  assert.match(script,/https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
  assert.match(script,/Fonte: OpenStreetMap/);
  assert.doesNotMatch(script,/localStorage\.setItem\([^)]*chat/i);
  for(const file of ['seguranca.js','seguranca.html','mapa-seguro.html','apoio-fluxos.js','apoio-fluxos.css']){
    assert.deepEqual(await fs.readFile(path.join(ROOT,file)),await fs.readFile(path.join(ROOT,'public',file)),file);
  }
});
