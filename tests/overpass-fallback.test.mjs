import test from 'node:test';
import assert from 'node:assert/strict';
import {queryOverpass,PUBLIC_INSTANCES} from '../lib/overpass.mjs';

test('Mapa: a terceira instância usa POST, evitando resposta HTTP 406 ao método GET',()=>{
  const main=PUBLIC_INSTANCES.find(source=>source.url==='https://overpass-api.de/api/interpreter');
  assert.ok(main);
  assert.equal(main.method,'POST');
  assert.ok(!PUBLIC_INSTANCES.some(source=>source.url.includes('lz4.overpass-api.de')&&source.method==='GET'));
});

const query='[out:json];node(around:1000,-22.718,-43.557)[amenity=police];out center 5;';

test('Mapa: falha da primeira fonte e sucesso da segunda sem dados fictícios',async()=>{
  const calls=[];
  const sample={elements:[{type:'node',id:123,lat:-22.718,lon:-43.557,tags:{amenity:'police',name:'Local de teste'}}]};
  const transport=async(url,options)=>{
    calls.push({url,method:options.method,body:options.body});
    if(url.startsWith('https://maps.mail.ru'))throw new Error('Fonte externa retornou 403');
    if(url.startsWith('https://overpass.private.coffee'))return sample;
    throw new Error('fonte indisponível');
  };
  const result=await queryOverpass(query,{transport});
  assert.deepEqual(result,sample);
  assert.ok(calls.some(x=>x.method==='GET'&&new URL(x.url).searchParams.get('data')===query));
  assert.ok(calls.some(x=>x.method==='POST'&&new URLSearchParams(x.body).get('data')===query));
});

test('Mapa: substituição de fonte local continua funcionando em testes de backend',async()=>{
  const calls=[];
  const response=await queryOverpass(query,{endpointOverride:'http://127.0.0.1:1234/overpass',transport:async(url,options)=>{
    calls.push({url,method:options.method,query:new URLSearchParams(options.body).get('data')});
    return {elements:[]};
  }});
  assert.deepEqual(response,{elements:[]});
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'POST');
  assert.equal(calls[0].query,query);
});

test('Mapa: resposta HTML ou inválida não se transforma em falso sucesso',async()=>{
  const originalWarn=console.warn;console.warn=()=>{};
  try{
    await assert.rejects(queryOverpass(query,{transport:async()=>({error:'indisponível'}),instances:PUBLIC_INSTANCES}),/Fontes de locais indisponíveis/);
  }finally{console.warn=originalWarn}
});
