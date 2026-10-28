/* Busca compartilhada entre páginas. Somente atalhos locais existentes — sem dados fictícios. */
(()=>{
  'use strict';
  const input=document.getElementById('globalSearch');
  const list=document.getElementById('searchResults');
  if(!input||!list)return;
  const destinations=[
    ['Relações e Segurança','Orientação, assistente e apoio','seguranca.html'],
    ['Assistente Elas+','Descreva sua situação com privacidade','seguranca.html#assistente'],
    ['Mapa Seguro','Localizar serviços públicos e pontos aprovados','mapa-seguro.html'],
    ['Serviços Públicos','Direitos, assistência e órgãos públicos','recursos.html#servicos'],
    ['Delegacias','Buscar delegacias cadastradas','mapa-seguro.html?f=police'],
    ['Unidades de saúde','Buscar UBS, hospitais e atendimento','mapa-seguro.html?f=health'],
    ['Creches por perto','Encontrar opções de educação infantil','mapa-seguro.html?f=childcare'],
    ['Carreira e Mães Solo','Currículo e capacitação','recursos.html#carreira'],
    ['Vagas para Mulheres','Oportunidades de emprego e programas afirmativos','vagas-mulheres.html'],
    ['Saúde e Corpo','Cuidados por fase da vida','recursos.html#saude'],
    ['Comunidade','Registros locais publicados','recursos.html#comunidade'],
    ['Meu perfil e Configurações','Fonte, contraste e personalização','recursos.html#perfil']
  ];
  const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false')};
  const render=()=>{
    const q=norm(input.value.trim());list.replaceChildren();if(q.length<2){hide();return}
    const matches=destinations.filter(([name,desc])=>norm(name+' '+desc).includes(q)).slice(0,7);
    if(!matches.length){const p=document.createElement('p');p.textContent='Nenhum resultado. Tente outra palavra.';p.style.padding='12px';list.append(p)}
    for(const [name,desc,url] of matches){const b=document.createElement('button');b.type='button';const t=document.createElement('strong');t.textContent=name;const d=document.createElement('span');d.textContent=desc;b.append(t,d);b.addEventListener('click',()=>location.href=url);list.append(b)}
    list.hidden=false;input.setAttribute('aria-expanded','true');
  };
  input.addEventListener('input',render);
  input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();else if(e.key==='Enter'&&!list.hidden){const b=list.querySelector('button');if(b){e.preventDefault();b.click()}}});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-box'))hide()});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||'')){e.preventDefault();input.focus()}});
  try{const nick=localStorage.getItem('elasplus_nickname');if(nick){const label=document.querySelector('.topbar .account>span:nth-child(2)');if(label)label.textContent='Olá, '+nick;const avatar=document.querySelector('.topbar .avatar');if(avatar)avatar.textContent=nick.trim().charAt(0).toUpperCase()}}catch{}
  // Destaca a aba certa em Recursos, e o Mapa Seguro quando aberto em sua própria página.
  const refresh=()=>{
    document.querySelectorAll('.sidebar a.nav-link').forEach(a=>{
      let active=false;
      if(location.pathname.endsWith('recursos.html')){active=a.getAttribute('href')==='recursos.html#'+(location.hash.slice(1)||'servicos')}
      else if(location.pathname.endsWith('seguranca.html')){active=a.getAttribute('href')==='seguranca.html'}
      else if(location.pathname.endsWith('mapa-seguro.html')){active=a.getAttribute('href')==='mapa-seguro.html'}
      else if(location.pathname.endsWith('vagas-mulheres.html')){active=a.getAttribute('href')==='recursos.html#carreira'}
      a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  };
  window.addEventListener('hashchange',refresh);refresh();
})();

/* Moderação usa o mesmo cabeçalho. Nas demais páginas os handlers já
   pertencem aos scripts respectivos, evitando cliques duplicados. */
(()=>{
 if(!location.pathname.endsWith('/moderacao.html'))return;
 const menu=document.getElementById('menu');
 const sidebar=document.getElementById('sidebar');
 const backdrop=document.getElementById('scrim');
 const close=()=>{sidebar?.classList.remove('open');if(backdrop)backdrop.hidden=true;menu?.setAttribute('aria-expanded','false')};
 menu?.addEventListener('click',()=>{
   const opened=sidebar?.classList.toggle('open');
   if(backdrop)backdrop.hidden=!opened;
   menu.setAttribute('aria-expanded',String(!!opened));
 });
 backdrop?.addEventListener('click',close);
 sidebar?.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
 const exit=()=>location.replace('https://www.google.com/');
 document.querySelectorAll('[data-action="exit"]').forEach(btn=>btn.addEventListener('click',exit));
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape')close();
   if(event.altKey&&event.key.toLowerCase()==='x'){event.preventDefault();exit()}
 });
})();
