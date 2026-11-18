// Fallback gratuito para pesquisa de POIs via Nominatim/OpenStreetMap.
// Uso moderado: uma requisição por pesquisa, cache na camada server e fila local.
let queue=Promise.resolve(),nextRequestAt=0;
const terms={childcare:'creche',pediatrics:'pediatra',health:'hospital clínica unidade de saúde',pharmacy:'farmácia',police:'delegacia polícia',social:'CRAS assistência social',shop:'mercado',food:'restaurante',services:'banco serviços',all:'serviços'};
function coord(v,min,max){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null;}
function distance(a,b,c,d){const r=Math.PI/180,dl=(c-a)*r,do_= (d-b)*r;const x=Math.sin(dl/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(do_/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(x)));}
function classify(type,query){if(type==='childcare')return 'childcare';if(type==='pediatrics')return 'pediatrics';if(type==='health')return 'health';if(type==='pharmacy')return 'pharmacy';if(type==='police')return 'police';if(type==='social')return 'social';if(type==='shop')return 'shop';if(type==='food')return 'food';if(type==='services')return 'services';return 'community';}
export async function queryNominatimPlaces({lat,lon,radius=3000,type='all',transport,timeout=6500,endpoint='https://nominatim.openstreetmap.org/search'}={}){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||typeof transport!=='function')throw Error('Parâmetros Nominatim inválidos');
 if(type==='all')return [];
 const q=terms[type];if(!q)return [];
 const deltaLat=radius/111320,deltaLon=radius/(111320*Math.max(.15,Math.cos(lat*Math.PI/180)));
 const url=new URL(endpoint);url.searchParams.set('q',q);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','20');url.searchParams.set('addressdetails','1');url.searchParams.set('viewbox',[lon-deltaLon,lat+deltaLat,lon+deltaLon,lat-deltaLat].join(','));url.searchParams.set('bounded','1');
 const task=queue.then(async()=>{const wait=Math.max(0,nextRequestAt-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));nextRequestAt=Date.now()+1100;const payload=await transport(url.toString(),{method:'GET',headers:{Accept:'application/json'}},timeout);if(!Array.isArray(payload))throw Error('Resposta Nominatim inválida');const out=[];for(const item of payload){const la=coord(item.lat,-90,90),lo=coord(item.lon,-180,180);if(la===null||lo===null)continue;const dist=Math.round(distance(lat,lon,la,lo));if(dist>radius)continue;const name=String(item.name||item.display_name?.split(',')[0]||'Local sem nome').slice(0,110);out.push({id:'nominatim:'+String(item.place_id||item.osm_type+item.osm_id),name,lat:la,lon:lo,type:classify(type,item.type),address:String(item.display_name||'').slice(0,150),phone:'',website:'',distance:dist,source:'Nominatim / OpenStreetMap',coverage:'partial'});}return out.sort((a,b)=>a.distance-b.distance).slice(0,40);});queue=task.catch(()=>{});return task;
}
