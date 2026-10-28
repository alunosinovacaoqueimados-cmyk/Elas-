/* Elas+ · vagas reais de APIs públicas autorizadas: Remotive + Jobicy.
 * Exibição com atribuição e links originais. Não é uma API do LinkedIn.
 * Cache CDN 6h (respeita limites e evita consultas a cada visitante).
 */
const SOURCES={
 remotive:'https://remotive.com/api/remote-jobs?limit=100',
 jobicy:'https://jobicy.com/api/jobs?count=100'
};
const CACHE_MS=6*60*60*1000;
let snapshot={expires:0,data:null};
const safe=s=>String(s??'').trim();
function plainText(value){
 return safe(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim().slice(0,950);
}
function validHttps(value,host){
 try{const u=new URL(value);return u.protocol==='https:'&&(!host||u.hostname===host||u.hostname.endsWith('.'+host))?u.href:null}
 catch{return null}
}
function normalize(raw){
 if(!raw||typeof raw!=='object')return null;
 const url=validHttps(raw.url,'remotive.com'),title=safe(raw.title).slice(0,160),company=safe(raw.company_name).slice(0,120),date=Date.parse(raw.publication_date);
 if(!url||!title||!company||raw.id==null||!Number.isFinite(date))return null;
 return {id:'remotive-'+safe(raw.id).slice(0,45),title,company,
  location:safe(raw.candidate_required_location||'Consulte a fonte').slice(0,120),
  modality:'remoto',level:'',category:'geral',description:plainText(raw.description),
  published_at:new Date(date).toISOString(),salary:safe(raw.salary).slice(0,120),
  type:safe(raw.job_type).slice(0,90),area:safe(raw.category).slice(0,110),
  url,source:'Remotive',source_url:url,eligibility_unverified:true,affirmative_verified:false};
}
function normalizeJobicy(raw){
 if(!raw||typeof raw!=='object')return null;
 const url=validHttps(raw.url,'jobicy.com'),title=safe(raw.jobTitle).slice(0,160),company=safe(raw.companyName).slice(0,120),date=Date.parse(raw.pubDate);
 if(!url||!title||!company||raw.id==null||!Number.isFinite(date))return null;
 const types=Array.isArray(raw.jobType)?raw.jobType.map(safe).filter(Boolean):[];
 const industry=Array.isArray(raw.jobIndustry)?raw.jobIndustry.map(safe).filter(Boolean):[];
 const min=Number(raw.salaryMin),max=Number(raw.salaryMax);
 let salary='';
 if(Number.isFinite(min)&&min>0)salary=safe(raw.salaryCurrency||'USD')+' '+min.toLocaleString('en-US')+(Number.isFinite(max)&&max>=min?'–'+max.toLocaleString('en-US'):'')+(raw.salaryPeriod?'/'+safe(raw.salaryPeriod):'');
 return {id:'jobicy-'+safe(raw.id).slice(0,45),title,company,
  location:safe(raw.jobGeo||'Consulte a fonte').slice(0,120),
  modality:'remoto',level:safe(raw.jobLevel).slice(0,45),category:'geral',
  description:plainText(raw.jobExcerpt||raw.jobDescription),
  published_at:new Date(date).toISOString(),salary,type:types.join(', ').slice(0,100),area:industry.join(', ').slice(0,120),
  url,source:'Jobicy',source_url:url,eligibility_unverified:true,affirmative_verified:false};
}
async function fetchFeed(url,timeout=9500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'ElasPlus/1.0 (vagas-publicas-com-atribuicao)'},signal:controller.signal});if(!response.ok)throw Error('Fonte '+response.status);return await response.json()}
 finally{clearTimeout(timer)}
}
async function feed(){
 if(snapshot.data&&snapshot.expires>Date.now())return snapshot.data;
 const [remotive,jobicy]=await Promise.allSettled([fetchFeed(SOURCES.remotive),fetchFeed(SOURCES.jobicy)]);
 const warnings=[],jobs=[],sources=[],seen=new Set();
 function push(raw,normalizeFn){
  for(const value of raw.slice(0,200)){const item=normalizeFn(value);if(!item||seen.has(item.id))continue;seen.add(item.id);jobs.push(item)}
 }
 if(remotive.status==='fulfilled'&&Array.isArray(remotive.value.jobs)){sources.push('Remotive');push(remotive.value.jobs,normalize)}
 else warnings.push('Remotive temporariamente indisponível');
 if(jobicy.status==='fulfilled'&&Array.isArray(jobicy.value.jobs)){sources.push('Jobicy');push(jobicy.value.jobs,normalizeJobicy)}
 else warnings.push('Jobicy temporariamente indisponível');
 if(!sources.length)throw Error('Fontes indisponíveis');
 jobs.sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
 const result={jobs,sources,warnings,updated_at:new Date().toISOString(),
  note:'Fontes Remotive e Jobicy apresentam vagas remotas internacionais. Confira país, idioma, regras e disponibilidade. Não são vagas do LinkedIn e não representam seleção afirmativa verificada.'};
 snapshot={data:result,expires:Date.now()+CACHE_MS};
 return result;
}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({error:'Método não permitido.'}));return}
 try{res.statusCode=200;res.end(JSON.stringify(await feed()))}
 catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'As fontes de vagas estão temporariamente indisponíveis.',jobs:[]}))}
}
export {normalize,normalizeJobicy};
