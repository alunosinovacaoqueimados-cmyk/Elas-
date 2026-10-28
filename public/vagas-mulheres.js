'use strict';
/* Elas+ Oportunidades — sem chaves no frontend, sem vagas inventadas.
   Renderização segura com textContent, filtros internos e favoritos locais. */
(()=>{
  const byId=id=>document.getElementById(id);
  const $={form:byId('filters'),keyword:byId('keyword'),location:byId('location'),modality:byId('modality'),level:byId('level'),focus:byId('focus'),cards:byId('cards'),count:byId('count'),all:byId('showAll'),saved:byId('showSaved'),external:byId('jobsExternalLink'),advanced:byId('advancedFilters')};
  const storageKey='elas_jobs_saved_v1';
  const categoryLabels={geral:'Vaga geral',afirmativa_mulheres:'Afirmativa para mulheres',diversidade:'Programa de diversidade'};
  const modalityLabels={remoto:'Remoto',hibrido:'Híbrido',presencial:'Presencial'};
  const levelLabels={estagio:'Estágio',junior:'Júnior / Assistente',pleno:'Pleno',senior:'Sênior'};
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let entries=[],loadState='loading',currentView='all';
  let fallbackFavorites=[];
  function favorites(){
    try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(parsed)?parsed.filter(id=>typeof id==='string'):[]}catch{return fallbackFavorites.slice()}
  }
  function toggleFavorite(id){
    const next=favorites().includes(id)?favorites().filter(value=>value!==id):[...favorites(),id];
    fallbackFavorites=next;
    try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{/* A sessão atual ainda funciona. */}
    render();
  }
  function validJob(job){
    if(!job||typeof job!=='object'||Array.isArray(job))return false;
    for(const key of ['id','title','company','source','source_url','apply_url','verified_at','expires_at']){
      if(typeof job[key]!=='string'||!job[key].trim())return false;
    }
    if(!Object.hasOwn(categoryLabels,job.category))return false;
    if(job.modality&&!Object.hasOwn(modalityLabels,job.modality))return false;
    if(job.level&&!Object.hasOwn(levelLabels,job.level))return false;
    const verified=Date.parse(job.verified_at),expires=Date.parse(job.expires_at);
    if(!Number.isFinite(verified)||!Number.isFinite(expires)||verified>Date.now()||expires<=Date.now()||expires<=verified)return false;
    try{return [job.source_url,job.apply_url].every(value=>new URL(value).protocol==='https:')}catch{return false}
  }
  function node(tag,content,className){
    const element=document.createElement(tag);
    if(content!==undefined)element.textContent=content;
    if(className)element.className=className;
    return element;
  }
  function dateBR(value){return new Date(value).toLocaleDateString('pt-BR',{timeZone:'UTC'})}
  function linkedInSearch(term,city){
    const params=new URLSearchParams();
    params.set('keywords',term||'vagas');
    if(city)params.set('location',city);
    return 'https://www.linkedin.com/jobs/search/?'+params.toString();
  }
  function updateExternalLinks(){
    $.external.href=linkedInSearch($.keyword.value.trim(),$.location.value.trim());
    document.querySelectorAll('[data-search-term]').forEach(link=>{
      link.href=linkedInSearch(link.dataset.searchTerm,$.location.value.trim());
    });
  }
  function makeEmpty(){
    const saved=currentView==='saved';
    const hasFilters=[$.keyword.value,$.location.value,$.modality.value,$.level.value,$.focus.value].some(v=>v.trim());
    let title,description;
    if(loadState==='loading'){
      title='Consultando o catálogo…';
      description='Estamos verificando se existem oportunidades disponíveis.';
    }else if(loadState==='error'){
      title='Não conseguimos carregar as vagas agora';
      description='Você ainda pode consultar pesquisas externas. Tente novamente mais tarde.';
    }else if(saved){
      title='Ainda não há vagas nos seus favoritos';
      description='Quando aparecerem oportunidades, use o botão de salvar para encontrá-las aqui.';
    }else if(!entries.length){
      title='Estamos preparando novas oportunidades';
      description='Ainda não há vagas verificadas cadastradas. Enquanto ampliamos o catálogo, você pode pesquisar diretamente nas plataformas de emprego.';
    }else if(hasFilters){
      title='Nenhuma vaga corresponde a esses filtros';
      description='Experimente mudar a profissão, localização ou outros critérios para ampliar a busca.';
    }else{
      title='Nenhuma oportunidade disponível no momento';
      description='Novas vagas aparecerão aqui quando forem cadastradas e verificadas.';
    }
    const wrap=node('div',undefined,'jobs-empty');
    const art=node('span','✦','jobs-empty-art');art.setAttribute('aria-hidden','true');
    wrap.append(art,node('h3',title),node('p',description));
    if(loadState!=='loading'){
      const link=node('a','Explorar vagas no LinkedIn ↗','jobs-btn jobs-btn-primary');
      link.href=$.external.href;link.target='_blank';link.rel='noopener noreferrer';wrap.append(link);
      if(hasFilters&&loadState==='ready'&&currentView==='all'){
        const clear=node('button','Limpar filtros','jobs-clear');clear.type='button';clear.addEventListener('click',clearFilters);wrap.append(clear);
      }
    }
    return wrap;
  }
  function makeCard(job,bookmarked){
    const card=node('article',undefined,'jobs-card');
    const head=node('div',undefined,'jobs-card-head');
    const mark=node('span',job.company.trim().charAt(0).toUpperCase(),'jobs-company-mark');mark.setAttribute('aria-hidden','true');
    const text=node('div');text.append(node('h3',job.title),node('p',job.company,'jobs-company-name'));head.append(mark,text);
    card.append(head);
    const labels=node('div',undefined,'jobs-card-badges');
    labels.append(node('span',categoryLabels[job.category],'jobs-tag'+(job.category==='afirmativa_mulheres'?' jobs-tag-female':job.category==='diversidade'?' jobs-tag-diversity':'')));
    card.append(labels);
    const meta=node('div',undefined,'jobs-card-meta');
    for(const label of [job.location||'Local não informado',modalityLabels[job.modality]||'Modalidade a confirmar',levelLabels[job.level]||'Nível a confirmar']){
      meta.append(node('span',label));
    }
    card.append(meta);
    if(job.description)card.append(node('p',String(job.description).slice(0,280),'jobs-card-description'));
    card.append(node('div','Fonte: '+job.source+' · Atualizada em: '+dateBR(job.verified_at)+' · Até: '+dateBR(job.expires_at),'jobs-source'));
    const actions=node('div',undefined,'jobs-card-actions');
    const apply=node('a','Ver vaga e candidatar-se ↗','jobs-btn jobs-btn-primary');
    apply.href=job.apply_url;apply.target='_blank';apply.rel='noopener noreferrer';
    const favorite=node('button',bookmarked?'★':'☆','jobs-favorite');
    favorite.type='button';favorite.setAttribute('aria-pressed',String(bookmarked));
    favorite.setAttribute('aria-label',(bookmarked?'Remover dos favoritos: ':'Salvar nos favoritos: ')+job.title);
    favorite.title=bookmarked?'Remover dos favoritos':'Salvar vaga';
    favorite.addEventListener('click',()=>toggleFavorite(job.id));
    actions.append(apply,favorite);card.append(actions);
    return card;
  }
  function render(){
    updateExternalLinks();
    const term=norm($.keyword.value.trim()),location=norm($.location.value.trim());
    const modality=$.modality.value,level=$.level.value,focus=$.focus.value;
    const favoritesList=new Set(favorites());
    $.all.setAttribute('aria-pressed',String(currentView==='all'));
    $.saved.setAttribute('aria-pressed',String(currentView==='saved'));
    const results=entries.filter(job=>
      (!term||norm([job.title,job.company,job.description].join(' ')).includes(term))&&
      (!location||norm(job.location).includes(location))&&
      (!modality||job.modality===modality)&&(!level||job.level===level)&&
      (!focus||job.category===focus)&&
      (currentView==='all'||favoritesList.has(job.id)));
    $.cards.replaceChildren();
    $.count.textContent=loadState==='loading'?'Carregando oportunidades…':
      loadState==='error'?'Catálogo temporariamente indisponível':
      results.length===1?'1 oportunidade encontrada':results.length+' oportunidades encontradas';
    if(!results.length){$.cards.append(makeEmpty());return}
    const fragment=document.createDocumentFragment();
    for(const job of results)fragment.append(makeCard(job,favoritesList.has(job.id)));
    $.cards.append(fragment);
  }
  function clearFilters(){
    $.form.reset();
    currentView='all';render();
  }
  $.form.addEventListener('submit',event=>{event.preventDefault();render();byId('jobsResultsTitle').scrollIntoView({block:'start',behavior:'smooth'})});
  $.form.addEventListener('reset',()=>{queueMicrotask(()=>{currentView='all';render()})});
  for(const id of ['keyword','location'])$[id].addEventListener('input',render);
  for(const id of ['modality','level','focus'])$[id].addEventListener('change',render);
  $.all.addEventListener('click',()=>{currentView='all';render()});
  $.saved.addEventListener('click',()=>{currentView='saved';render()});
  const narrow=window.matchMedia('(max-width: 590px)');
  function syncAdvanced(event){$.advanced.open=!event.matches}
  syncAdvanced(narrow);
  narrow.addEventListener('change',syncAdvanced);
  const sidebar=byId('sidebar'),menu=byId('menu'),backdrop=byId('scrim'),exit=byId('exit');
  function closeMenu(restoreFocus=false){
    sidebar.classList.remove('open');backdrop.hidden=true;menu.setAttribute('aria-expanded','false');
    if(restoreFocus)menu.focus();
  }
  menu.addEventListener('click',()=>{
    const opened=sidebar.classList.toggle('open');
    backdrop.hidden=!opened;menu.setAttribute('aria-expanded',String(opened));
    if(opened)sidebar.querySelector('.nav-link')?.focus();
  });
  backdrop.addEventListener('click',()=>closeMenu(true));
  sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));
  function quickExit(){window.location.replace('https://www.google.com/')}
  exit.addEventListener('click',quickExit);
  document.addEventListener('keydown',event=>{
    if(event.altKey&&event.key.toLowerCase()==='x'){event.preventDefault();quickExit();return}
    if(event.key==='Escape'&&sidebar.classList.contains('open'))closeMenu(true);
  });
  const preferences=(()=>{try{return JSON.parse(localStorage.getItem('elasplus_preferences')||'{}')}catch{return {}}})();
  if(preferences&&typeof preferences==='object'){
    const root=document.documentElement;
    if(['normal','large','larger'].includes(preferences.fontSize))root.dataset.font=preferences.fontSize;
    if(['purple','pink','green'].includes(preferences.theme))root.dataset.theme=preferences.theme;
    root.dataset.contrast=preferences.contrast?'high':'normal';
    root.dataset.dyslexia=preferences.dyslexia?'yes':'no';
  }
  fetch('vagas-catalogo.json',{cache:'no-store'}).then(response=>{
    if(!response.ok)throw Error('Não foi possível obter o catálogo');
    return response.json();
  }).then(data=>{
    if(!Array.isArray(data))throw Error('Formato de catálogo inválido');
    const seen=new Set();
    entries=data.filter(job=>{if(!validJob(job)||seen.has(job.id))return false;seen.add(job.id);return true});
    loadState='ready';render();
  }).catch(()=>{loadState='error';render()});
  render();
})();
