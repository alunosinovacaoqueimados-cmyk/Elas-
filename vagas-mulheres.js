/* Elas+ · Portal de oportunidades. Vagas Remotive + catálogo local curado.
 * O LinkedIn está disponível somente como pesquisa externa: não há API pública
 * autorizada de busca de vagas integrada ao Elas+.
 */
'use strict';
(() => {
const $=id=>document.getElementById(id);
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const safe=v=>String(v??'').trim();
const favoritesKey='elas_jobs_saved_v1';
const levelMap={estagio:'Estágio',junior:'Júnior',pleno:'Pleno',senior:'Sênior'};
const categoryMap={geral:'Vaga geral',diversidade:'Programa de diversidade',afirmativa_mulheres:'Afirmativa para mulheres'};
const modalityMap={remoto:'Remoto',hibrido:'Híbrido',presencial:'Presencial'};
const validUrls=url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'?parsed.href:null}catch{return null}};
let jobs=[],view='all',selected=null,state='loading',sourceIssues=[],initialLoad=true;
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function localSaved(){try{const items=JSON.parse(localStorage.getItem(favoritesKey)||'[]');return Array.isArray(items)?items.filter(x=>typeof x==='string'):[]}catch{return []}}
function toggleSaved(id){const old=localSaved();const next=old.includes(id)?old.filter(v=>v!==id):[...old,id];try{localStorage.setItem(favoritesKey,JSON.stringify(next))}catch{}render()}
function dateMs(value){const d=Date.parse(value||'');return Number.isFinite(d)?d:0}
function formatDate(value){const d=new Date(value);return !Number.isFinite(d.getTime())?'Data não informada':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function normalizeRemote(x){
 if(!x||!x.id||!safe(x.title)||!safe(x.company)||!validUrls(x.url)||!['Remotive','Jobicy'].includes(x.source))return null;
 const role=normalize(x.title+' '+(x.level||''));
 // Nível informado pela fonte ou explicitamente mencionado no título.
 const level=/\b(internship|intern|estagio|estagiario|estagiaria)\b/.test(role)?'estagio':/\b(junior|jr)\b/.test(role)?'junior':/\b(senior|sr|lead|principal)\b/.test(role)?'senior':/\b(pleno|mid.level)\b/.test(role)?'pleno':'';
 return {id:safe(x.id),title:safe(x.title).slice(0,160),company:safe(x.company).slice(0,120),description:safe(x.description).slice(0,1200),location:safe(x.location).slice(0,140)||'Consulte a fonte',modality:'remoto',level,category:'geral',source:x.source,sourceKey:x.source==='Remotive'?'remotive':'jobicy',url:validUrls(x.url),sourceUrl:validUrls(x.source_url)||validUrls(x.url),publishedAt:dateMs(x.published_at),salary:safe(x.salary).slice(0,120),type:safe(x.type).slice(0,90),area:safe(x.area).slice(0,110),eligibilityUnverified:true};
}
function normalizeCurated(x){
 if(!x||!x.id||!safe(x.title)||!safe(x.company)||!safe(x.source)||!validUrls(x.apply_url)||!validUrls(x.source_url)||!safe(x.verified_at)||!safe(x.expires_at))return null;
 if(dateMs(x.expires_at+( /^\d{4}-\d\d-\d\d$/.test(x.expires_at)?'T23:59:59Z':''))<=Date.now()||dateMs(x.verified_at)>Date.now())return null;
 const category=['afirmativa_mulheres','diversidade','geral'].includes(x.category)?x.category:null;
 if(!category)return null;
 // Evidência editorial obrigatória antes de rotular vaga como afirmativa.
 if(category==='afirmativa_mulheres'&&!validUrls(x.affirmative_evidence_url))return null;
 return {id:'curated-'+safe(x.id),title:safe(x.title),company:safe(x.company),description:safe(x.description).slice(0,1200),location:safe(x.location)||'Local não informado',modality:safe(x.modality),level:safe(x.level),category,source:safe(x.source),sourceKey:'elas',url:validUrls(x.apply_url),sourceUrl:validUrls(x.source_url),publishedAt:dateMs(x.verified_at),salary:safe(x.salary),type:safe(x.type),area:safe(x.area),eligibilityUnverified:false};
}
function originalSearch(query,location){
 const p=new URLSearchParams();
 p.set('keywords',query||'vagas');
 if(location)p.set('location',location);
 return 'https://www.linkedin.com/jobs/search/?'+p;
}
function syncLinkedInLink(){
 const url=originalSearch($('keyword').value.trim(),$('location').value.trim());
 $('externalSearchLink').href=url;$('linkedinSearchButton').href=url;
 const empty=$('emptyLinkedinLink');if(empty)empty.href=url;
}
function eligibilityMatches(job,q){
 if(!q)return true;
 const location=normalize(job.location);
 const query=normalize(q);
 if(location.includes(query))return true;
 // "Worldwide" / "Anywhere" é amplo; outras regiões não são inferidas.
 if(/^(brasil|brazil|rio de janeiro|rj|sao paulo|sp)$/i.test(query)&&/\b(worldwide|anywhere|global)\b/i.test(location))return true;
 if(/^(brasil|brazil|rio de janeiro|rj|sao paulo|sp)$/i.test(query)&&/\b(latam|latin america|south america)\b/i.test(location))return true;
 return false;
}
function filters(){
 const query=normalize($('keyword').value.trim()),loc=$('location').value.trim();
 const modality=document.querySelector('input[name=modality]:checked')?.value||'';
 const level=$('level').value,focus=$('focus').value,source=$('source').value;
 const fav=new Set(localSaved());
 let list=jobs.filter(x=>
   (!query||normalize([x.title,x.company,x.area,x.description].join(' ')).includes(query)) &&
   eligibilityMatches(x,loc)&&(!modality||x.modality===modality) &&
   (!level||x.level===level)&&(!focus||x.category===focus) &&
   (!source||x.sourceKey===source)&&(view!=='saved'||fav.has(x.id))
 );
 if($('sort').value==='title')list.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));else list.sort((a,b)=>b.publishedAt-a.publishedAt);
 return list;
}
function shortDate(t){return t?formatDate(t):'Data indisponível'}
function renderList(list){
 const root=$('cards');root.replaceChildren();
 if(state==='loading'){const p=node('p','Carregando vagas reais e informações das fontes…','jobs-loading');p.setAttribute('role','status');root.append(p);return}
 if(!list.length){const wrap=node('div',undefined,'jobs-empty');
  const sym=node('span','⌕','jobs-empty-icon');sym.setAttribute('aria-hidden','true');
  const title=node('h3',view==='saved'?'Você ainda não salvou nenhuma vaga':!jobs.length?'Nenhuma vaga disponível no momento':'Nenhuma vaga combina com esses filtros');
  const desc=node('p',!jobs.length?(sourceIssues.length?'Não conseguimos carregar a fonte externa agora. Você ainda pode pesquisar vagas no LinkedIn.':'Aguardando oportunidades verificadas. Consulte também a pesquisa externa.'):'Experimente outro cargo, uma região mais ampla ou limpe alguns filtros.');
  wrap.append(sym,title,desc);const a=node('a','Pesquisar vagas no LinkedIn ↗');a.id='emptyLinkedinLink';a.target='_blank';a.rel='noopener noreferrer';a.href=originalSearch($('keyword').value.trim(),$('location').value.trim());wrap.append(a);
  root.append(wrap);return}
 const favorites=new Set(localSaved());
 for(const job of list.slice(0,90)){
  const row=node('button',undefined,'jobs-row');row.type='button';row.setAttribute('aria-pressed',String(selected===job.id));
  row.setAttribute('aria-label','Ver detalhes da vaga '+job.title+' em '+job.company);
  const logo=node('span',job.company.trim().slice(0,1).toUpperCase(),'jobs-logo');logo.setAttribute('aria-hidden','true');
  const content=node('div',undefined,'jobs-row-main');
  content.append(node('strong',job.title),node('span',job.company,'jobs-row-company'));
  const meta=node('div',undefined,'jobs-row-meta');
  meta.append(node('span',job.location),node('span','·'),node('span',modalityMap[job.modality]||'Modalidade não informada'));
  content.append(meta);
  if(job.description)content.append(node('p',job.description,'jobs-row-preview'));
  const foot=node('div',undefined,'jobs-row-foot');
  const tag=node('span',job.sourceKey!=='elas'?job.source+' · Remota':categoryMap[job.category],'jobs-tag');tag.dataset.category=job.category;
  foot.append(tag,node('span',job.publishedAt?shortDate(job.publishedAt):'Data não informada'));
  if(favorites.has(job.id))foot.append(node('span','★','jobs-row-saved'));
  content.append(foot);
  row.append(logo,content);
  row.addEventListener('click',()=>{selected=job.id;render();if(matchMedia('(max-width:900px)').matches){document.querySelector('.jobs-page').classList.add('jobs-detail-open');document.querySelector('.jobs-results-head').scrollIntoView({behavior:'smooth',block:'start'});}});
  root.append(row);
 }
}
function renderDetail(job){
 const pane=$('detailContent');pane.replaceChildren();if(!job){
  const welcome=node('div',undefined,'jobs-detail-welcome');
  const sym=node('span','✦');sym.setAttribute('aria-hidden','true');
  welcome.append(sym,node('h3','Selecione uma oportunidade'),node('p','Escolha uma vaga da lista para consultar detalhes, condições de localização e o link oficial de candidatura.'));
  pane.append(welcome);return}
 const back=node('button','← Voltar para vagas','jobs-detail-back');back.type='button';back.addEventListener('click',()=>{document.querySelector('.jobs-page').classList.remove('jobs-detail-open');$('cards').querySelector('[aria-pressed=true]')?.focus();});
 pane.append(back);
 const top=node('div',undefined,'jobs-detail-top'),logo=node('span',job.company.slice(0,1).toUpperCase(),'jobs-detail-logo');logo.setAttribute('aria-hidden','true');
 const headline=node('div');headline.append(node('h3',job.title),node('p',job.company,'jobs-detail-company'));top.append(logo,headline);pane.append(top);
 const badges=node('div',undefined,'jobs-detail-meta');
 badges.append(node('span',job.location),node('span','·'),node('span',modalityMap[job.modality]||'Modalidade não informada'));
 if(job.level)badges.append(node('span','·'),node('span',levelMap[job.level]||job.level));
 pane.append(badges);
 const type=node('div',undefined,'jobs-detail-meta');const tag=node('span',categoryMap[job.category]||'Vaga geral','jobs-tag');tag.dataset.category=job.category;type.append(tag);
 if(job.type)type.append(node('span',job.type));pane.append(type);
 const actions=node('div',undefined,'jobs-detail-actions');
 const apply=node('a','Ver vaga na fonte e candidatar-se ↗','jobs-primary-button');apply.href=job.url;apply.target='_blank';apply.rel='noopener noreferrer';
 const isSaved=localSaved().includes(job.id);const favorite=node('button',isSaved?'★ Salva':'☆ Salvar vaga','jobs-save-button');favorite.type='button';favorite.setAttribute('aria-pressed',String(isSaved));favorite.addEventListener('click',()=>toggleSaved(job.id));
 actions.append(apply,favorite);pane.append(actions);
 pane.append(node('hr',undefined,'jobs-detail-divider'),node('h4','Sobre a oportunidade','jobs-detail-heading'));
 const description=job.description||'Descrição completa disponível na publicação original.';
 pane.append(node('p',description,'jobs-detail-paragraph'));
 if(job.salary)pane.append(node('p','Remuneração informada pela fonte: '+job.salary,'jobs-detail-paragraph'));
 if(job.area)pane.append(node('p','Área: '+job.area,'jobs-detail-paragraph'));
 if(job.eligibilityUnverified)pane.append(node('p','⚠ Esta é uma vaga internacional. Confira países aceitos, idioma, horário e elegibilidade diretamente na fonte. Não é uma vaga afirmativa verificada.','jobs-detail-paragraph'));
 pane.append(node('hr',undefined,'jobs-detail-divider'));
 const footer=node('p',undefined,'jobs-detail-source');
 footer.append(document.createTextNode('Fonte: '));
 const sourceLink=node('a',job.source+' ↗');sourceLink.href=job.sourceUrl;sourceLink.rel='noopener noreferrer';sourceLink.target='_blank';footer.append(sourceLink);
 if(job.publishedAt)footer.append(document.createTextNode(' · Publicação: '+shortDate(job.publishedAt)));
 pane.append(footer);
 const linked=node('p',undefined,'jobs-detail-source');
 linked.append(document.createTextNode('Também pode '));
 const a=node('a','pesquisar cargo e empresa no LinkedIn ↗');a.href=originalSearch(job.title+' '+job.company,$('location').value.trim());a.rel='noopener noreferrer';a.target='_blank';linked.append(a,document.createTextNode('. Esta pesquisa não garante que o mesmo anúncio exista no LinkedIn.'));
 pane.append(linked);
}
function render(){
 const list=filters();
 $('count').textContent=state==='loading'?'Carregando…':list.length+(list.length===1?' vaga':' vagas');
 $('resultsDescription').textContent=state==='loading'?'Buscando oportunidades nas fontes…':view==='saved'?'Vagas que você salvou neste navegador.':sourceIssues.length?'Mostrando as fontes disponíveis; uma delas não respondeu.':'Oportunidades reais, com indicação da fonte original.';
 $('sourceStatus').textContent=sourceIssues.length?'Aviso: '+sourceIssues.join(' | '):'Fontes: Remotive, Jobicy e curadoria Elas+';
 if(!list.some(x=>x.id===selected))selected=list.length?list[0].id:null;
 renderList(list);
 renderDetail(list.find(x=>x.id===selected)||null);
 if(!selected)document.querySelector('.jobs-page').classList.remove('jobs-detail-open');
 syncLinkedInLink();
}
function reset(){
 document.querySelector('.jobs-page').classList.remove('jobs-detail-open');
 $('filters').reset();$('level').value='';$('focus').value='';$('source').value='';$('sort').value='recent';
 document.querySelector('input[name=modality][value=""]').checked=true;view='all';setTabs();selected=null;document.querySelector('.jobs-page').classList.remove('jobs-detail-open');render();
}
function setTabs(){for(const button of document.querySelectorAll('.jobs-tab')){const on=button.dataset.view===view;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1} $('jobsResults').setAttribute('aria-labelledby',view==='saved'?'tabSaved':'tabAll')}
$('filters').addEventListener('submit',e=>{e.preventDefault();selected=null;render();if(matchMedia('(max-width:900px)').matches)document.querySelector('.jobs-results-head').scrollIntoView({behavior:'smooth',block:'start'});});
$('keyword').addEventListener('input',()=>{selected=null;render()});
$('location').addEventListener('input',()=>{selected=null;render()});
document.querySelectorAll('input[name=modality]').forEach(input=>input.addEventListener('change',()=>{selected=null;render()}));
for(const id of ['level','focus','source','sort'])$(id).addEventListener('change',()=>{selected=null;render()});
$('clearFilters').addEventListener('click',reset);
document.querySelectorAll('.jobs-tab').forEach(tab=>{
 tab.addEventListener('click',()=>{document.querySelector('.jobs-page').classList.remove('jobs-detail-open');view=tab.dataset.view;selected=null;setTabs();render()});
 tab.addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  e.preventDefault();view=view==='all'?'saved':'all';selected=null;setTabs();render();$(view==='all'?'tabAll':'tabSaved').focus();
 });
});
const menu=$('menu'),sidebar=$('sidebar'),backdrop=$('scrim');
function closeMenu(){sidebar.classList.remove('open');document.body.classList.remove('jobs-menu-open');backdrop.hidden=true;menu.setAttribute('aria-expanded','false')}
menu?.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');backdrop.hidden=!open;document.body.classList.toggle('jobs-menu-open',open);menu.setAttribute('aria-expanded',String(open));if(open)sidebar.querySelector('a.nav-link')?.focus()});
backdrop?.addEventListener('click',closeMenu);
sidebar?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
function quickExit(){location.replace('https://www.google.com/')}
document.querySelectorAll('[data-action="exit"]').forEach(button=>button.addEventListener('click',quickExit));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('open')){closeMenu();menu.focus()}if(e.altKey&&e.key.toLowerCase()==='x'){e.preventDefault();quickExit()}});
matchMedia('(max-width:760px)').addEventListener?.('change',e=>{if(!e.matches)closeMenu()});
// Respeitar opções de acessibilidade persistidas pela plataforma.
try{const p=JSON.parse(localStorage.getItem('elasplus_preferences')||'{}');if(p&&typeof p==='object'){const root=document.documentElement;if(['normal','large','larger'].includes(p.fontSize))root.dataset.font=p.fontSize;if(['purple','pink','green'].includes(p.theme))root.dataset.theme=p.theme;root.dataset.contrast=p.contrast?'high':'normal';root.dataset.dyslexia=p.dyslexia?'yes':'no';}}catch{}
const drawer=$('advancedFilters');
const drawerQuery=matchMedia('(max-width:1100px)');
function adjustDrawer(){drawer.open=!drawerQuery.matches}
adjustDrawer();drawerQuery.addEventListener?.('change',adjustDrawer);
async function load(){
 const [api,curated]=await Promise.allSettled([
  fetch('/api/jobs',{headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw Error('API externa indisponível');return r.json()}),
  fetch('vagas-catalogo.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catálogo local indisponível');return r.json()})
 ]);
 const combined=[];
 if(api.status==='fulfilled'&&Array.isArray(api.value.jobs)){combined.push(...api.value.jobs.map(normalizeRemote).filter(Boolean));if(Array.isArray(api.value.warnings))sourceIssues.push(...api.value.warnings.filter(x=>typeof x==='string').slice(0,2));}
 else sourceIssues.push('Fontes externas temporariamente indisponíveis');
 if(curated.status==='fulfilled'&&Array.isArray(curated.value)){combined.push(...curated.value.map(normalizeCurated).filter(Boolean))}
 else sourceIssues.push('Catálogo interno indisponível');
 const ids=new Set();jobs=combined.filter(job=>{if(ids.has(job.id))return false;ids.add(job.id);return true;});
 state=jobs.length||!sourceIssues.length?'ready':'error';
 initialLoad=false;render();
}
setTabs();render();load();
})();
