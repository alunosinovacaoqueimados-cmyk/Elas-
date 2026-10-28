/* Elas+ · Alimentação licenciada de vagas remotas via API pública da Remotive.
 * Respeita atribuição, URL de origem e cache de 6 horas (4 consultas/dia no máximo por cache).
 * Não representa API do LinkedIn; não inclui scraping nem classifica anúncios automaticamente
 * como vagas afirmativas.
 */
const ENDPOINT='https://remotive.com/api/remote-jobs?limit=100';
const CACHE_MS=6*60*60*1000;
let snapshot={expires:0,data:null};
const safe=s=>String(s??'').trim();
function plainText(value){
  return safe(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ').trim().slice(0,950);
}
function validHttps(value,host){
  try{const url=new URL(value);return url.protocol==='https:'&&(!host||url.hostname===host||url.hostname.endsWith('.'+host))?url.toString():null}
  catch{return null}
}
function normalize(raw){
  if(!raw||typeof raw!=='object')return null;
  const url=validHttps(raw.url,'remotive.com');
  const title=safe(raw.title).slice(0,160),company=safe(raw.company_name).slice(0,120);
  if(!url||!title||!company||raw.id===undefined||raw.id===null)return null;
  const date=Date.parse(raw.publication_date);
  if(!Number.isFinite(date))return null;
  // Remotive lista anúncios ativos e atualiza a lista; não inventamos data de expiração.
  return {
    id:'remotive-'+String(raw.id).slice(0,45),
    title,company,location:safe(raw.candidate_required_location||'Consultar elegibilidade').slice(0,120),
    modality:'remoto',level:'',category:'geral',
    description:plainText(raw.description),
    published_at:new Date(date).toISOString(),
    salary:safe(raw.salary).slice(0,120),
    type:safe(raw.job_type).slice(0,90),
    area:safe(raw.category).slice(0,110),
    url,source:'Remotive',source_url:url,
    eligibility_unverified:true,
    affirmative_verified:false
  };
}
async function feed(){
  if(snapshot.data&&snapshot.expires>Date.now())return snapshot.data;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(ENDPOINT,{headers:{'Accept':'application/json','User-Agent':'ElasPlus/1.0 (vagas-publicas-com-atribuicao)'},signal:controller.signal});
    if(!response.ok)throw Error('Fonte indisponível: '+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.jobs))throw Error('Formato de retorno inesperado');
    const seen=new Set();
    const jobs=payload.jobs.slice(0,120).map(normalize).filter(job=>{
      if(!job||seen.has(job.id))return false;seen.add(job.id);return true;
    });
    const output={jobs,source:'Remotive',source_url:'https://remotive.com',updated_at:new Date().toISOString(),note:'Vagas remotas internacionais da Remotive; exigências de país e idioma devem ser conferidas na vaga original. O Elas+ não verifica elegibilidade para residentes do Brasil e não classifica essas vagas como afirmativas.'};
    snapshot={data:output,expires:Date.now()+CACHE_MS};
    return output;
  }finally{clearTimeout(timeout)}
}
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Método não permitido.'}));return}
  try{res.statusCode=200;res.end(JSON.stringify(await feed()))}
  catch{
    // Nunca substitui falha real por anúncios fictícios.
    res.statusCode=503;
    res.setHeader('Cache-Control','no-store');
    res.end(JSON.stringify({error:'A fonte de vagas está temporariamente indisponível.',jobs:[]}));
  }
}
export {normalize};
