import test from 'node:test';
import assert from 'node:assert/strict';
import {queryPhotonPlaces,photonRequestUrl,mapPhotonFeature,photonType} from '../lib/photon.mjs';

const lat=-22.718,lon=-43.557;
const feature=(osm_key,osm_value,name,id,offset=0)=>({
 type:'Feature',
 properties:{name,osm_key,osm_value,osm_type:'N',osm_id:id,street:'Rua do Teste',housenumber:'3'},
 geometry:{type:'Point',coordinates:[lon+offset,lat+offset]}
});

test('Photon: filtra objetos reais por tag, distância e classificação',()=>{
 assert.equal(photonType({osm_key:'amenity',osm_value:'police'}),'police');
 assert.equal(photonType({osm_key:'amenity',osm_value:'pharmacy'}),'pharmacy');
 assert.equal(photonType({osm_key:'building',osm_value:'residential'}),null);
 const valid=mapPhotonFeature(feature('amenity','police','Delegacia simulada para teste',123),{lat,lon,radius:3000,type:'police'});
 assert.equal(valid.name,'Delegacia simulada para teste');
 assert.equal(valid.source,'Photon / OpenStreetMap');
 assert.equal(valid.coverage,'partial');
 assert.equal(mapPhotonFeature(feature('amenity','police','Longe',124,1),{lat,lon,radius:3000,type:'police'}),null);
 assert.equal(mapPhotonFeature(feature('amenity','restaurant','Restaurante',125),{lat,lon,radius:3000,type:'police'}),null);
 assert.equal(mapPhotonFeature(feature('amenity','police','',126),{lat,lon,radius:3000,type:'police'}),null);
});
test('Photon: pesquisa real exige identificação geográfica e limite de chamadas',async()=>{
 const seen=[];
 const transport=async(url)=>{
  seen.push(new URL(url));
  return {features:[feature('amenity','police','Delegacia para teste',123),feature('amenity','pharmacy','Farmácia teste',124)]};
 };
 const result=await queryPhotonPlaces({lat,lon,radius:3000,type:'police',transport});
 assert.equal(seen.length,1);
 assert.equal(seen[0].searchParams.get('osm_tag'),'amenity:police');
 assert.equal(seen[0].searchParams.get('radius'),'3');
 assert.equal(result.length,1);
 assert.equal(result[0].type,'police');
});
test('Photon: indisponibilidade de todas as fontes não retorna sucesso falso',async()=>{
 await assert.rejects(queryPhotonPlaces({lat,lon,radius:3000,type:'pharmacy',transport:async()=>{throw Error('429')}}),/indisponível/);
 const url=photonRequestUrl({lat,lon,radius:1000,tag:'amenity:police'});
 assert.equal(new URL(url).searchParams.get('radius'),'1');
});
