/**
 * Fonte alternativa para pesquisas de locais: Photon (dados OpenStreetMap).
 * O servidor público Photon é disponibilizado para uso moderado; não há SLA.
 * Respeitar cache, limitar consultas e indicar que a cobertura é PARCIAL.
 * Só há resultados de objetos indexados, nunca criamos localidades.
 */
const TAGS={
  all:['amenity','shop'],
  police:['amenity:police'],
  health:['amenity:hospital','amenity:clinic'],
  pharmacy:['amenity:pharmacy','shop:chemist'],
  childcare:['amenity:kindergarten','amenity:childcare'],
  social:['amenity:social_facility','amenity:community_centre'],
  shop:['shop'],
  food:['amenity:restaurant','amenity:fast_food'],
  services:['amenity:bank','amenity:post_office']
};
const TYPES={
  police:new Set(['amenity:police']),
  health:new Set(['amenity:hospital','amenity:clinic','amenity:doctors','amenity:dentist','healthcare:hospital','healthcare:clinic','healthcare:doctor']),
  pharmacy:new Set(['amenity:pharmacy','shop:chemist']),
  childcare:new Set(['amenity:kindergarten','amenity:childcare','social_facility:day_care']),
  social:new Set(['amenity:social_facility','amenity:community_centre','office:government','office:social','office:lawyer']),
  food:new Set(['amenity:restaurant','amenity:cafe','amenity:fast_food','amenity:food_court','shop:bakery']),
  services:new Set(['amenity:bank','amenity:atm','amenity:post_office','amenity:fuel','amenity:library'])
};
export function photonType(props){
  const key=String(props?.osm_key||''),value=String(props?.osm_value||'');
  const tag=key+':'+value;
  for(const [type,tags] of Object.entries(TYPES))if(tags.has(tag))return type;
  if(key==='shop')return 'shop';
  return null;
}
function rad(value){return value*Math.PI/180}
function meters(a,b,c,d){
  const dx=rad(c-a),dy=rad(d-b);
  const q=Math.sin(dx/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dy/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(q)));
}
function coord(value,min,max){
  const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
export function mapPhotonFeature(feature,{lat,lon,radius,type='all'}){
  const p=feature?.properties||{},coordinates=feature?.geometry?.coordinates;
  if(!Array.isArray(coordinates)||coordinates.length<2)return null;
  const la=coord(coordinates[1],-90,90),lo=coord(coordinates[0],-180,180);
  if(la===null||lo===null)return null;
  const kind=photonType(p),distance=Math.round(meters(lat,lon,la,lo));
  if(!kind||type!=='all'&&kind!==type||distance>radius||distance<0)return null;
  const name=String(p.name||'').trim().slice(0,110);
  if(!name)return null;
  const osmType=String(p.osm_type||'').toUpperCase();
  const osmId=String(p.osm_id||'');
  if(!/^[NWR]$/.test(osmType)||!/^\d+$/.test(osmId))return null;
  const address=[p.street,p.housenumber].filter(Boolean).map(v=>String(v).slice(0,100)).join(', ').slice(0,150);
  return {id:'photon:'+osmType+osmId,name,lat:la,lon:lo,type:kind,address,
    phone:'',website:'',distance,source:'Photon / OpenStreetMap',coverage:'partial'};
}
export function photonRequestUrl({lat,lon,radius=3000,tag,endpoint='https://photon.komoot.io/reverse'}){
  const u=new URL(endpoint);
  u.searchParams.set('lat',Number(lat).toFixed(3));
  u.searchParams.set('lon',Number(lon).toFixed(3));
  u.searchParams.set('radius',String(radius/1000));
  u.searchParams.set('limit','50');
  u.searchParams.set('lang','pt');
  u.searchParams.set('osm_tag',tag);
  return u.toString();
}
export async function queryPhotonPlaces({lat,lon,radius=3000,type='all',transport,endpoint,timeout=7500}){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!TAGS[type]||typeof transport!=='function')throw Error('Parâmetros inválidos para busca de locais');
  const urls=TAGS[type].slice(0,2).map(tag=>photonRequestUrl({lat,lon,radius,tag,endpoint}));
  const results=await Promise.allSettled(urls.map(url=>transport(url,{method:'GET',headers:{Accept:'application/json'}},timeout)));
  const successes=results.filter(x=>x.status==='fulfilled'&&Array.isArray(x.value?.features));
  if(!successes.length)throw Error('Fonte Photon indisponível');
  const byId=new Map();
  for(const item of successes)for(const feature of item.value.features){
    const place=mapPhotonFeature(feature,{lat,lon,radius,type});
    if(place&&!byId.has(place.id))byId.set(place.id,place);
  }
  return [...byId.values()].sort((a,b)=>a.distance-b.distance).slice(0,80);
}
