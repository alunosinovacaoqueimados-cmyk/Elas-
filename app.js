/* Elas+ • Tela inicial ligada às áreas funcionais pelo servidor Node. */
'use strict';

const MODULES = {
  inicio: { title:'Início', description:'Seu ponto de partida para explorar apoio, informação e oportunidades.', items:['Use os atalhos para conhecer os temas.','Encontre conteúdo pela barra de pesquisa.','Personalize a aparência em Configurações.'] },
  seguranca: {title:'Relações e Segurança',description:'Um espaço de informação e acolhimento para relações saudáveis, proteção e respeito.',items:['Orientações sobre relacionamentos e sinais de abuso.','Mulheres PcD e atípicas: direitos e redes de apoio.','Mulheres trans: respeito, acesso a direitos e acolhimento.','Limites, assédio e discriminação no trabalho.','Saída rápida, canais de denúncia e Mapa Seguro.']},
  saude:{title:'Saúde e Corpo',description:'Conteúdos de bem-estar e mudanças corporais ao longo da vida.',items:['Espaço Jovem, dos 10 aos 18 anos, com linguagem e proteção adequadas.','Menopausa e climatério.','Saúde mental, autocuidado e orientações de profissionais.']},
  carreira:{title:'Carreira e Mães Solo',description:'Recursos para ampliar a autonomia financeira e conciliar a vida profissional com a maternidade.',items:['Gerador de currículo detalhado.','Vagas, cursos e capacitações.','Creches por perto com informações sobre valores, quando disponíveis.','Busca por pediatras e serviços de saúde infantil.']},
  vagas:{title:'Vagas e Carreira',description:'Área planejada para facilitar o acesso a oportunidades profissionais.',items:['Filtros por área, modalidade e horário.','Oportunidades inclusivas e trabalho remoto.','Cursos gratuitos e orientação para entrevistas.']},
  curriculo:{title:'Gerador de currículo',description:'Um espaço para criar um currículo profissional de forma simples.',items:['Dados de contato, objetivo profissional e resumo.','Experiência profissional, formação, cursos e projetos.','Habilidades, idiomas, certificados e portfólio.','Prévia de modelos e exportação para PDF.']},
  creches:{title:'Creches próximas',description:'Busque apoio para escolher opções de educação infantil.',items:['Busca por município e bairro.','Faixa etária atendida e turno disponível.','Creches públicas e privadas, com preço quando informado e confirmado.','Canais oficiais para inscrição e verificação de vagas.']},
  pediatras:{title:'Pediatras e saúde infantil',description:'Encontre informações de atendimento para crianças.',items:['Busca por especialidade e região.','Informações sobre atendimento pelo SUS e particular.','Contatos e horários sujeitos à confirmação com a unidade ou profissional.']},
  servicos:{title:'Serviços Públicos',description:'Orientações para acessar políticas e serviços públicos de forma mais simples.',items:['CRAS e CREAS.','Unidades de saúde e assistência social.','Delegacias especializadas, documentos e benefícios.','Contatos e endereços oficiais a serem integrados.']},
  mapa:{title:'Mapa Seguro',description:'Um mapa colaborativo para compartilhar informações úteis com segurança.',items:['Serviços e espaços de acolhimento.','Locais com informações de acessibilidade.','Avaliações e relatos enviados à moderação.','Proteção contra exposição de dados pessoais e localização sensível.']},
  comunidade:{title:'Comunidade Elas+',description:'Um lugar para conversar, compartilhar experiências e encontrar apoio.',items:['Grupos sobre carreira, saúde, maternidade e inclusão.','Ferramentas de denúncia e moderação.','Regras claras para acolhimento e privacidade.','Modos protegidos para participantes menores de 18 anos.']},
  perfil:{title:'Meu Perfil',description:'Gerencie como você deseja usar o Elas+.',items:['Preferências de temas e conteúdos salvos.','Dados pessoais e configurações de privacidade.','Controles de acessibilidade e segurança da conta.']},
  notificacoes:{title:'Avisos',description:'Aqui ficarão lembretes e comunicados da plataforma.',items:['Nenhum aviso real está conectado neste protótipo.','Notificações devem ser opcionais e controladas pela usuária.']},
  destaques:{title:'Destaques para você',description:'Uma seleção de recursos úteis do Elas+.',items:['Direitos e limites no trabalho.','Gerador de currículo.','Facilidade no acesso a serviços públicos.','Inclusão e acessibilidade.']},
  conteudos:{title:'Biblioteca de conteúdos',description:'Artigos informativos e orientações organizados por tema.',items:['Saúde, menopausa e climatério.','Jovens: corpo, emoções e autoestima.','Carreira, maternidade e oportunidades.','Relações saudáveis e diversidade.']},
  jornada:{title:'Minha Jornada',description:'Pequenos passos para conhecer os recursos da plataforma.',items:['Completar o perfil.','Explorar os serviços públicos.','Criar um currículo.','Participar da comunidade.','As marcações nesta prévia ficam somente neste navegador.']},
  trabalho:{title:'Seus direitos no trabalho',description:'Reconhecer situações inadequadas ajuda a definir limites e procurar orientação.',items:['Assédio moral e sexual no ambiente profissional.','Discriminação e direitos trabalhistas.','Como registrar situações com segurança e buscar órgãos competentes.','Estratégias de comunicação e limites profissionais.']},
  menopausa:{title:'Menopausa e Climatério',description:'Conteúdo educativo sobre mudanças hormonais e cuidados ao longo dessa fase.',items:['Mudanças físicas e emocionais mais comuns.','Sono, atividade física e qualidade de vida.','Quando conversar com profissionais de saúde.','Acolhimento e troca de experiências.']},
  maes:{title:'Trabalho remoto para mães solo',description:'Explore caminhos para ampliar oportunidades profissionais com flexibilidade.',items:['Organização de experiências e competências.','Opções de trabalho remoto, híbrido e horários flexíveis.','Cursos e comunidades de apoio.','Informações sobre serviços para cuidados infantis.']},
  inclusao:{title:'Mulheres PcD e atípicas',description:'Inclusão precisa considerar diferentes experiências e necessidades.',items:['Acessibilidade digital e física.','Direitos, serviços e oportunidades profissionais.','Apoio a mães atípicas e mulheres neurodivergentes.','Conteúdos construídos com escuta e respeito.']},
  jovens:{title:'Espaço Jovem (10–18)',description:'Informações educativas para adolescentes, com experiências adequadas à idade.',items:['Puberdade, autoestima e emoções.','Amizades, limites e respeito.','Segurança digital e proteção de dados.','Orientações para procurar adultos e serviços de confiança.']},
  cras:{title:'CRAS e CREAS',description:'Centros de referência que integram a rede de assistência social.',items:['O CRAS atua em proteção social básica e acesso a serviços socioassistenciais.','O CREAS atende situações de risco pessoal e social que envolvam violações de direitos.','Consulte unidades e contatos atualizados nos canais oficiais do município.']},
  ubs:{title:'Unidade Básica de Saúde (UBS)',description:'As UBS são pontos de acesso à Atenção Primária do SUS.',items:['Acompanhamento de saúde e ações preventivas.','Orientações sobre saúde da mulher e da família.','Informações de horário, cobertura e localização dependem do município.']},
  contatos:{title:'Contatos confiáveis',description:'Uma rede de apoio pode ajudar a planejar como pedir assistência com segurança.',items:['Identifique pessoas com quem você pode contar.','Combine formas discretas de pedir ajuda.','Em perigo imediato, ligue 190.','Este protótipo não armazena contatos nem envia mensagens.']}
};

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
const moduleDialog = $('#moduleDialog');
const sosDialog = $('#sosDialog');
const accessDialog = $('#accessDialog');
const sidebar = $('#sidebar');
const backdrop = $('#navBackdrop');
const menuButton = $('#menuButton');
const search = $('#globalSearch');
const searchResults = $('#searchResults');

function showDialog(dialog){
  if(!dialog.open) dialog.showModal();
}
function openModule(key){
  const destination={
    seguranca:'seguranca.html',mapa:'mapa-seguro.html',servicos:'recursos.html#servicos',
    saude:'recursos.html#saude',carreira:'recursos.html#carreira',vagas:'vagas-mulheres.html',
    curriculo:'recursos.html#carreira',creches:'mapa-seguro.html?f=childcare',pediatras:'mapa-seguro.html?f=health',
    comunidade:'recursos.html#comunidade',perfil:'recursos.html#perfil',menopausa:'recursos.html#saude',
    jovens:'recursos.html#saude',inclusao:'recursos.html#saude',maes:'recursos.html#carreira',
    'direitos-trabalho':'recursos.html#direitos-trabalho',trabalho:'recursos.html#direitos-trabalho',cras:'mapa-seguro.html?f=social',ubs:'mapa-seguro.html?f=health',
    contatos:'seguranca.html','destaques-home':'recursos.html#servicos',destaques:'recursos.html#servicos','guia-servicos':'recursos.html#servicos',conteudos:'recursos.html#saude'
  };
  if(destination[key]){window.location.href=destination[key];return;}
  closeMenu();
  hideSearch();
  if(key === 'inicio'){window.scrollTo({top:0,behavior:'smooth'});return;}
  const info = MODULES[key];
  if(!info) return;
  $('#moduleTitle').textContent=info.title;
  $('#moduleDescription').textContent=info.description;
  const list=$('#moduleList');
  list.replaceChildren(...info.items.map(value=>{
    const li=document.createElement('li');li.textContent=value;return li;
  }));
  showDialog(moduleDialog);
}
function closeAllDialogs(){
  $$('dialog').forEach(dialog=>{if(dialog.open)dialog.close();});
}
function toggleMenu(){
  const isOpen=sidebar.classList.toggle('open');
  backdrop.hidden=!isOpen;
  menuButton.setAttribute('aria-expanded',String(isOpen));
  if(isOpen) $('.nav-link',sidebar).focus();
}
function closeMenu(){
  sidebar.classList.remove('open');backdrop.hidden=true;menuButton.setAttribute('aria-expanded','false');
}
function quickExit(){
  // replace() evita adicionar a página atual à pilha de navegação durante a saída.
  // Não apaga entradas anteriores do histórico ou rastros do dispositivo.
  window.location.replace('https://www.google.com/');
}
function handleAction(action){
  switch(action){
    case 'sos': closeMenu();showDialog(sosDialog);break;
    case 'quick-exit': quickExit();break;
    case 'accessibility': closeMenu();showDialog(accessDialog);break;
    case 'close-dialog': closeAllDialogs();break;
  }
}

document.addEventListener('click',event=>{
  const open=event.target.closest('[data-open]');
  const action=event.target.closest('[data-action]');
  if(open){openModule(open.dataset.open);return;}
  if(action){handleAction(action.dataset.action);}
  if(!event.target.closest('.search-box')) hideSearch();
});
menuButton.addEventListener('click',toggleMenu);
backdrop.addEventListener('click',closeMenu);
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target===dialog)dialog.close();
}));
document.addEventListener('keydown',event=>{
  if(event.altKey && event.key.toLowerCase()==='x'){
    event.preventDefault();quickExit();return;
  }
  if(event.key==='Escape'){
    hideSearch();closeMenu();
  }
  if(event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
    event.preventDefault();search.focus();
  }
});

function normalizeText(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function hideSearch(){searchResults.hidden=true;search.setAttribute('aria-expanded','false');}
function renderResults(){
  const query=normalizeText(search.value.trim());
  if(query.length<2){hideSearch();return;}
  const matches=Object.entries(MODULES).filter(([key,item])=>key!=='inicio' && normalizeText(`${item.title} ${item.description} ${item.items.join(' ')}`).includes(query)).slice(0,7);
  searchResults.replaceChildren();
  const heading=document.createElement('h3');
  heading.textContent=matches.length?`${matches.length} resultado(s) encontrado(s)`:'Nenhum resultado encontrado';
  searchResults.append(heading);
  for(const [key,item] of matches){
    const button=document.createElement('button');button.type='button';
    const strong=document.createElement('strong');strong.textContent=item.title;
    const small=document.createElement('span');small.textContent=item.description;
    button.append(strong,small);
    button.addEventListener('click',()=>{search.value='';openModule(key);});
    searchResults.append(button);
  }
  searchResults.hidden=false;search.setAttribute('aria-expanded','true');
}
search.addEventListener('input',renderResults);
search.addEventListener('keydown',event=>{
  if(event.key==='Enter' && !searchResults.hidden){
    const first=$('button',searchResults);
    if(first){event.preventDefault();first.click();}
  }
});

function readSaved(key,fallback){
  try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value);}catch{return fallback;}
}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* preferência apenas durante a sessão */}}
const prefs=readSaved('elasplus_preferences',{});
const settings={fontSize: ['normal','large','larger'].includes(prefs.fontSize)?prefs.fontSize:'normal',
  theme: ['purple','pink','green'].includes(prefs.theme)?prefs.theme:'purple',
  contrast:Boolean(prefs.contrast),dyslexia:Boolean(prefs.dyslexia)};
function applySettings(){
  const root=document.documentElement;
  root.dataset.font=settings.fontSize;
  root.dataset.theme=settings.theme;
  root.dataset.contrast=settings.contrast?'high':'normal';
  root.dataset.dyslexia=settings.dyslexia?'yes':'no';
  $('#fontSize').value=settings.fontSize;
  $('#colorTheme').value=settings.theme;
  $('#highContrast').checked=settings.contrast;
  $('#dyslexicFont').checked=settings.dyslexia;
  save('elasplus_preferences',settings);
}
$('#fontSize').addEventListener('change',e=>{settings.fontSize=e.target.value;applySettings();});
$('#colorTheme').addEventListener('change',e=>{settings.theme=e.target.value;applySettings();});
$('#highContrast').addEventListener('change',e=>{settings.contrast=e.target.checked;applySettings();});
$('#dyslexicFont').addEventListener('change',e=>{settings.dyslexia=e.target.checked;applySettings();});
applySettings();

const journey=readSaved('elasplus_journey',{perfil:false,servicos:false,curriculo:false,comunidade:false});
function updateJourney(){
  const inputs=$$('[data-task]');let completed=0;
  for(const input of inputs){input.checked=Boolean(journey[input.dataset.task]);if(input.checked)completed++;}
  const pct=Math.round(completed/inputs.length*100);
  $('#progressValue').textContent=`${pct}%`;
  $('#journeyProgress').style.setProperty('--progress',`${pct}%`);
  $('#journeyProgress').setAttribute('aria-valuenow',String(pct));
  save('elasplus_journey',journey);
}
$$('[data-task]').forEach(input=>input.addEventListener('change',()=>{
  journey[input.dataset.task]=input.checked;updateJourney();
}));
updateJourney();
const nickname=localStorage.getItem('elasplus_nickname');
if(nickname){const top=document.querySelector('.account>span:nth-child(2)');if(top)top.textContent='Olá, '+nickname;const greeting=document.querySelector('#heroHeading');if(greeting){greeting.textContent='Bem-vinda, '+nickname+'! ♥';}}
