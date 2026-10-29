/** Elas+ • Servidor Node.js sem dependências externas e sem banco de dados.
 * Execução: npm start. Relatos ficam em storage/reports.json, com aprovação humana.
 * Em produção: implantar autenticação, monitoramento, HTTPS, backups e revisão LGPD.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {queryOverpass} from './lib/overpass.mjs';
import {queryPhotonPlaces} from './lib/photon.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
// A Vercel oferece um sistema de arquivos efêmero: relatos exigem armazenamento persistente externo.
const CLOUD=process.env.VERCEL==='1'||process.env.ELAS_READ_ONLY==='1';
const PORT=Number(process.env.PORT||8000);
const HOST=process.env.HOST||'127.0.0.1';
const API_KEY=process.env.GEMINI_API_KEY||'';
const MODEL=process.env.GEMINI_MODEL||'gemini-3-flash-preview';
const REPORT_FILE=process.env.ELAS_REPORT_FILE||path.join(ROOT,'storage','reports.json');
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const BANNED_PUBLIC=['storage','tests','node_modules'];
// Sem banco de dados: token administrativo de uso local gerado automaticamente.
async function adminKey(){
  if(process.env.ELAS_ADMIN_TOKEN)return process.env.ELAS_ADMIN_TOKEN;
  // Não tenta escrever durante o carregamento de uma função serverless.
  if(CLOUD)return '';
  const file=path.join(ROOT,'storage','moderator-token.txt');
  try{return (await fs.readFile(file,'utf8')).trim();}
  catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(path.dirname(file),{recursive:true});
  const token=crypto.randomBytes(25).toString('hex');
  await fs.writeFile(file,token+'\n',{mode:0o600,flag:'wx'});
  console.log('[Elas+] Chave de moderação gerada. Veja storage/moderator-token.txt (não compartilhe).');
  return token;
}
const ADMIN_TOKEN=await adminKey();

const CATEGORIES=new Set(['lighting','accessibility','support','transport','correction','lighting_ok','movement','service_good','harassment','service_issue']);
const KINDS=new Set(['positive','attention','info']);
const POSITIVE_CATEGORIES=new Set(['support','lighting_ok','movement','service_good','accessibility']);
const ATTENTION_CATEGORIES=new Set(['lighting','accessibility','transport','harassment','service_issue','correction']);
const limiter=new Map();
const geocodeCache=new Map();
const placesCache=new Map();
let geocodeNext=0, geocodeQueue=Promise.resolve();
let reportQueue=Promise.resolve();

const SYSTEM='Você é a assistente informativa Elas+ para mulheres brasileiras. Seja acolhedora, clara e prática em português brasileiro. Não se identifique como profissional de saúde, advogada, polícia, nem como serviço de emergência. Não faça diagnósticos nem promessas de proteção. Ajude com relações saudáveis, mulheres trans, mulheres PcD, mães atípicas, limites e assédio no trabalho, direitos e serviços públicos. Se houver risco imediato: orientar a ligar 190, buscar segurança quando possível e não confrontar agressores. Para informações e denúncias: Ligue 180, 24 horas. Não solicite nomes, endereços, fotos ou dados íntimos. Não invente endereço, horários ou leis. Não culpe a vítima. Se pedirem serviços, indicar o Mapa Seguro, com dados do OpenStreetMap sujeitos a verificação. Responda em até 170 palavras.';
function send(res,code,data,extra={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(data));}
function rate(req,scope,max,period){const ip=req.socket.remoteAddress||'anon';const k=ip+':'+scope,now=Date.now();const times=(limiter.get(k)||[]).filter(t=>now-t<period);if(times.length>=max)return false;times.push(now);limiter.set(k,times);if(limiter.size>2000){for(const [key,t] of limiter)if(t.every(x=>now-x>period))limiter.delete(key);}return true;}
async function bodyJSON(req,limit=2000){if(req.body!==undefined&&req.body!==null){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>limit){const e=new Error('Corpo muito grande');e.status=413;throw e;}try{return typeof req.body==='string'?JSON.parse(raw):req.body;}catch{const e=new Error('JSON inválido');e.status=400;throw e;}}const chunks=[];let len=0;for await(const chunk of req){len+=chunk.length;if(len>limit){const e=new Error('Corpo muito grande');e.status=413;throw e;}chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{const e=new Error('JSON inválido');e.status=400;throw e;}}
const remoteHeaders={'User-Agent':'ElasPlus/2.0 (+https://elas-casa-da-inovacao.vercel.app; dados OSM com atribuição)','Accept':'application/json'};
async function remoteJSON(url,opts={},timeout=12000){
  const controller=new AbortController();
  const onAbort=()=>controller.abort();
  if(opts.signal?.aborted)controller.abort();
  else opts.signal?.addEventListener('abort',onAbort,{once:true});
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(url,{...opts,headers:{...remoteHeaders,...opts.headers},signal:controller.signal});
    if(!response.ok)throw Error('Fonte externa retornou '+response.status);
    const text=await response.text();if(text.length>4_000_000)throw Error('Resultado excessivo');return JSON.parse(text);
  }finally{clearTimeout(timer);opts.signal?.removeEventListener('abort',onAbort);}
}
function coord(value,min,max){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;}
async function geocode(q){const key=q.toLocaleLowerCase('pt-BR');const cached=geocodeCache.get(key);if(cached&&cached.exp>Date.now())return cached.data;
  const task=geocodeQueue.then(async()=>{const fresh=geocodeCache.get(key);if(fresh&&fresh.exp>Date.now())return fresh.data;const wait=Math.max(0,geocodeNext-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));geocodeNext=Date.now()+1200;
    const u=new URL(process.env.NOMINATIM_URL||'https://nominatim.openstreetmap.org/search');u.searchParams.set('format','jsonv2');u.searchParams.set('limit','4');u.searchParams.set('countrycodes','br');u.searchParams.set('q',q);
    const result=await remoteJSON(u.toString());const data=result.map(x=>({name:String(x.display_name||'').slice(0,240),lat:coord(x.lat,-90,90),lon:coord(x.lon,-180,180)})).filter(x=>x.lat!==null&&x.lon!==null);
    geocodeCache.set(key,{data,exp:Date.now()+86400000});return data;});geocodeQueue=task.catch(()=>{});return task;
}
// Consulta categorias explícitas para reduzir ruído e dar resultados úteis em bairros movimentados.
const PLACE_FILTERS = Object.freeze({
  police: '[amenity=police]',
  health: '[amenity~"^(hospital|clinic|doctors|dentist)$"]',
  pharmacy: '[amenity=pharmacy]',
  childcare: '[amenity~"^(kindergarten|childcare)$"]',
  social: '[amenity~"^(social_facility|community_centre)$"]',
  shop: '[shop~"^(supermarket|convenience|department_store|mall|clothes|variety_store|electronics|books|general|hardware|beauty|chemist|bakery|shoes|mobile_phone|sports|pet|optician|stationery|furniture|florist|car_repair|bicycle|butcher|deli|greengrocer|gift|jewelry|toys|hairdresser|cosmetics)$"]',
  food: '[amenity~"^(restaurant|cafe|fast_food|food_court)$"]',
  services: '[amenity~"^(bank|atm|post_office|fuel|library)$"]'
});
const EXTRA_FILTERS = Object.freeze({
  health: '[healthcare~"^(hospital|clinic|doctor)$"]',
  pharmacy: '[shop=chemist]',
  food: '[shop=bakery]',
  childcare: '[social_facility=day_care]',
  social: '[office~"^(government|social|lawyer)$"]'
});
const ALLOWED_PLACE_TYPES = new Set(['all', ...Object.keys(PLACE_FILTERS)]);
function placeType(t){
  const a=t.amenity||'', o=t.office||'', h=t.healthcare||'', sh=t.shop||'';
  if(a==='police')return 'police';
  if(a==='pharmacy'||sh==='chemist')return 'pharmacy';
  if(['hospital','clinic','doctors','dentist'].includes(a)||['hospital','clinic','doctor'].includes(h))return 'health';
  if(['kindergarten','childcare'].includes(a)||t.social_facility==='day_care')return 'childcare';
  if(['social_facility','community_centre'].includes(a)||['government','social','lawyer'].includes(o))return 'social';
  if(['restaurant','cafe','fast_food','food_court'].includes(a)||sh==='bakery')return 'food';
  if(sh)return 'shop';
  if(['bank','atm','post_office','fuel','library'].includes(a))return 'services';
  return null;
}
function distanceMeters(lat1,lon1,lat2,lon2){
  const rad=Math.PI/180;
  const dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(a)));
}
async function nearby(lat,lon,filter='all',radius=3000){
  const key=[lat.toFixed(3),lon.toFixed(3),filter,radius].join(':');
  const cached=placesCache.get(key);
  if(cached?.exp>Date.now())return cached.data;
  if(cached?.pending)return cached.pending;
  const stale=cached?.data||null;
  const task=(async()=>{
    const tags=filter==='all'?Object.keys(PLACE_FILTERS):[filter];
    const clauses=tags.flatMap(type=>[PLACE_FILTERS[type],EXTRA_FILTERS[type]].filter(Boolean).map(expression=>`nwr(around:${radius},${lat.toFixed(4)},${lon.toFixed(4)})${expression};`)).join('');
    const query=`[out:json][timeout:12];(${clauses});out center 220;`;
    try{
    const result=await queryOverpass(query,{endpointOverride:process.env.OVERPASS_URL,transport:remoteJSON});
    const data=[],ids=new Set();
    for(const p of result.elements||[]){
      const la=coord(p.lat??p.center?.lat,-90,90),lo=coord(p.lon??p.center?.lon,-180,180);
      const id=String(p.type)+':'+String(p.id);
      if(la===null||lo===null||ids.has(id))continue;
      const t=p.tags||{},type=placeType(t);
      if(!type||(filter!=='all'&&type!==filter))continue;
      ids.add(id);
      data.push({id,lat:la,lon:lo,type,
        name:String(t.name||t['name:pt']||'Estabelecimento sem nome informado').slice(0,110),
        address:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(', ').slice(0,150),
        phone:String(t.phone||t['contact:phone']||'').slice(0,80),
        website:(/^https?:\/\//i.test(t.website||'')?t.website:'').slice(0,240),
        distance:Math.round(distanceMeters(lat,lon,la,lo)),source:'OpenStreetMap'});
    }
    }catch(overpassError){
      // Uma falha temporária do Overpass não deve esconder dados reais em cache.
      if(stale)return {...stale,stale:true};
      try{
        const results=await queryPhotonPlaces({lat,lon,radius,type:filter,transport:remoteJSON,endpoint:process.env.PHOTON_URL||'https://photon.komoot.io/reverse',timeout:6800});
        if(results.length){const fallback={places:results,source:'Photon / OpenStreetMap',partial:true};placesCache.set(key,{data:fallback,exp:Date.now()+5*60000});return fallback;}
      }catch(photonError){console.warn('[Elas+] Busca alternativa indisponível:',String(photonError?.message||'falha').slice(0,90));}
      throw overpassError;
    }
    data.sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name,'pt-BR'));
    const output={places:data.slice(0,400),source:'OpenStreetMap / Overpass',partial:false};
    placesCache.set(key,{data:output,exp:Date.now()+15*60000});
    return output;
  })();
  placesCache.set(key,{pending:task,exp:0});
  try{return await task;}
  catch(error){if(stale){placesCache.set(key,{data:stale,exp:Date.now()+60000});return {...stale,stale:true};}placesCache.delete(key);throw error;}
}
async function getReports(){try{const obj=JSON.parse(await fs.readFile(REPORT_FILE,'utf8'));return Array.isArray(obj.submissions)?obj.submissions:[];}catch(e){if(e.code==='ENOENT')return [];throw e;}}
async function mutateReports(mutator){const task=reportQueue.then(async()=>{const reports=await getReports();const result=mutator(reports);await fs.mkdir(path.dirname(REPORT_FILE),{recursive:true});const tmp=REPORT_FILE+'.tmp';await fs.writeFile(tmp,JSON.stringify({submissions:reports},null,2),{mode:0o600});await fs.rename(tmp,REPORT_FILE);return result;});reportQueue=task.catch(()=>{});return task;}
function isAdmin(req){if(!ADMIN_TOKEN||ADMIN_TOKEN.length<16)return false;const incoming=req.headers.authorization||'';if(!incoming.startsWith('Bearer '))return false;const a=Buffer.from(incoming.slice(7)),b=Buffer.from(ADMIN_TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function publicReport(r){return {id:r.id,kind:r.kind||'info',category:r.category,description:r.description,lat:r.lat,lon:r.lon,createdAt:r.createdAt};}
async function api(req,res,u){const p=u.pathname;
  if(p==='/api/jobs')return (await import('./api/jobs.js')).default(req,res);
  if(p==='/api/status'&&req.method==='GET')return send(res,200,{ok:true,aiEnabled:!!API_KEY,storage:CLOUD?'indisponivel-na-vercel':'arquivo-json',contributionsEnabled:!CLOUD,publicReportsRequireApproval:true});
  if(p==='/api/buscar'&&req.method==='GET'){if(!rate(req,'geocode',12,60000))return send(res,429,{error:'Aguarde um pouco antes de pesquisar novamente.'});const q=String(u.searchParams.get('q')||'').trim();if(q.length<3||q.length>110)return send(res,400,{error:'Informe um município ou bairro com 3 a 110 caracteres.'});try{return send(res,200,{results:await geocode(q)});}catch{return send(res,503,{error:'Busca indisponível. Tente mais tarde.'});}}
  if(p==='/api/locais'&&req.method==='GET'){if(!rate(req,'places',18,60000))return send(res,429,{error:'Limite temporário de consultas.'});const lat=coord(u.searchParams.get('lat'),-90,90),lon=coord(u.searchParams.get('lon'),-180,180);const type=String(u.searchParams.get('type')||'all');const radius=Number(u.searchParams.get('radius')||3000);if(lat===null||lon===null||!ALLOWED_PLACE_TYPES.has(type)||![1000,3000,5000].includes(radius))return send(res,400,{error:'Informe uma localização, categoria e distância válidas.'});try{return send(res,200,{radius,type,...(await nearby(lat,lon,type,radius))},{'Cache-Control':'public, max-age=0, s-maxage=300, stale-while-revalidate=600'});}catch{return send(res,503,{error:'Os servidores públicos de mapa estão ocupados no momento. Tente novamente ou utilize a busca externa.'},{'Retry-After':'30'});}}
  if(p==='/api/relatos'&&req.method==='GET'){if(CLOUD)return send(res,200,{reports:[],contributionsEnabled:false,message:'Registros compartilhados requerem armazenamento persistente.'});const all=await getReports();return send(res,200,{reports:all.filter(r=>r.status==='approved').map(publicReport)});}
  if(p==='/api/relatos'&&req.method==='POST'){if(CLOUD)return send(res,503,{error:'Contribuições temporariamente indisponíveis neste ambiente: armazenamento persistente ainda não configurado.'});if(!rate(req,'reports',4,86400000))return send(res,429,{error:'Limite de contribuições atingido neste dispositivo.'});const b=await bodyJSON(req,1500);const category=String(b.category||'');const kind=b.kind===undefined?'info':String(b.kind);const description=String(b.description||'').trim();const lat=coord(b.lat,-90,90),lon=coord(b.lon,-180,180);
    if(!KINDS.has(kind)||!CATEGORIES.has(category)||description.length<12||description.length>280||lat===null||lon===null)return send(res,400,{error:'Informe tipo, categoria, descrição entre 12 e 280 caracteres e região válida.'});
    if(kind==='positive'&&!POSITIVE_CATEGORIES.has(category)||kind==='attention'&&!ATTENTION_CATEGORIES.has(category))return send(res,400,{error:'Categoria incompatível com o tipo de marcação.'});
    if(/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/i.test(description))return send(res,400,{error:'Evite telefones, links, e-mails ou dados pessoais no relato.'});
    // Arredondamento proposital: ~1 km no latitude e longitude; nunca a coordenada exata.
    const report={id:crypto.randomUUID(),kind,category,description:description.replace(/[<>]/g,''),lat:Number(lat.toFixed(2)),lon:Number(lon.toFixed(2)),status:'pending',createdAt:new Date().toISOString()};
    await mutateReports(all=>all.push(report));return send(res,201,{id:report.id,status:'pending',message:'Recebido. Só ficará público após avaliação manual.'});}
  if(p==='/api/admin/relatos'&&req.method==='GET'){if(CLOUD)return send(res,503,{error:'Moderação compartilhada indisponível sem armazenamento persistente.'});if(!isAdmin(req))return send(res,401,{error:'Acesso restrito.'});const reports=await getReports();return send(res,200,{reports});}
  if(p==='/api/admin/moderar'&&req.method==='POST'){if(CLOUD)return send(res,503,{error:'Moderação compartilhada indisponível sem armazenamento persistente.'});if(!isAdmin(req))return send(res,401,{error:'Acesso restrito.'});const b=await bodyJSON(req,800);if(!['approved','rejected'].includes(b.status)||typeof b.id!=='string')return send(res,400,{error:'Solicitação inválida.'});const found=await mutateReports(all=>{const item=all.find(x=>x.id===b.id);if(item)item.status=b.status;return !!item;});return found?send(res,200,{ok:true}):send(res,404,{error:'Registro não encontrado.'});}
  if(p==='/api/assistente'&&req.method==='POST'){if(!API_KEY)return send(res,503,{error:'IA externa não configurada; o guia local continua disponível.'});if(!rate(req,'ai',6,60000))return send(res,429,{error:'Aguarde antes de enviar outra pergunta.'});const b=await bodyJSON(req,8500);const message=String(b.message||'').trim();if(message.length<2||message.length>1200||b.consent!==true)return send(res,400,{error:'Informe uma pergunta válida e autorize explicitamente o envio à IA.'});
    try{const reply=await remoteJSON(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[...(Array.isArray(b.history)?b.history.slice(-8).filter(x=>x&&['user','model'].includes(x.role)&&typeof x.text==='string').map(x=>({role:x.role,parts:[{text:x.text.slice(0,700)}]})):[]),{role:'user',parts:[{text:message}]}],generationConfig:{temperature:0.45,maxOutputTokens:850}})},21000);const answer=reply.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join(' ').trim();if(!answer)throw Error('Resposta vazia');return send(res,200,{answer,source:'IA externa'});}catch{return send(res,503,{error:'Não foi possível consultar a IA. Tente o guia local.'});}}
  return send(res,404,{error:'Recurso não encontrado.'});
}
function securityHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.tile.openstreetmap.fr https://*.openstreetmap.org; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");}
async function main(req,res){securityHeaders(res);let url;try{url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{return send(res,400,{error:'Solicitação inválida.'});}
  try{if(url.pathname.startsWith('/api/'))return await api(req,res,url);
    if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Método não permitido.'});
    let raw=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);if(raw.includes('\\')||raw.includes('\0'))return send(res,400,{error:'Caminho inválido.'});
    const bits=raw.split('/').filter(Boolean);if(bits.some(s=>s.startsWith('.')||BANNED_PUBLIC.includes(s)))return send(res,403,{error:'Acesso reservado.'});
    const file=path.resolve(ROOT,'.'+raw);if(!file.startsWith(ROOT+path.sep))return send(res,403,{error:'Acesso negado.'});
    const ext=path.extname(file);if(!TYPES[ext])return send(res,404,{error:'Arquivo não encontrado.'});
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':TYPES[ext],'Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else res.end(data);
  }catch(e){if(!res.headersSent)return send(res,e.status||500,{error:e.status?e.message:'Erro ao processar a solicitação.'});res.end();}}
const server=http.createServer(main);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(PORT,HOST,()=>console.log(`Elas+ ativo em http://${HOST}:${PORT} | IA: ${API_KEY?'configurada':'guia local'} | aprovação: ${ADMIN_TOKEN.length>=16?'ativada':'sem moderador'}`));
export {server,main as handler};
