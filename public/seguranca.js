/* Elas+ • Assistente e mapa em páginas independentes. Serviços pelo servidor Node, relatos moderados em arquivo JSON. */
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const DEFAULT_CENTER = [-22.718, -43.557]; // centro de demonstração: Queimados/RJ, não a localização da pessoa
const TYPES = {police:{label:'Delegacia ou polícia',icon:'✹'},health:{label:'Saúde',icon:'✚'},pharmacy:{label:'Farmácia',icon:'✚'},social:{label:'Assistência / serviço',icon:'♧'},childcare:{label:'Creche e educação infantil',icon:'⌂'},shop:{label:'Loja ou mercado',icon:'▣'},food:{label:'Alimentação',icon:'☕'},services:{label:'Banco ou serviço local',icon:'▤'},community:{label:'Registro local',icon:'⌖'}};
const state = {map:null, layers:null, userLayer:null, communityLayer:null, poi:[], filter:'all', radius:3000, nameSearch:'', listLimit:20, currentCenter:DEFAULT_CENTER, reports:[], published:[], contacts:[], selectedReportCoord:null,reportDraftMarker:null, reportKind:'positive', picking:false, lastSearchedCenter:null, toastTimeout:null, loadToken:0};
function notify(message){const t=$('#toast');t.textContent=message;t.classList.add('is-visible');clearTimeout(state.toastTimeout);state.toastTimeout=setTimeout(()=>t.classList.remove('is-visible'),4300);}
function escapeHtml(x){return String(x).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));}
function quickExit(){window.location.replace('https://www.google.com/');}
function show(id){const el=$('#'+id);if(el && !el.open)el.showModal();}
function closeMenu(){const s=$('#sidebar');s.classList.remove('open');$('#scrim').hidden=true;$('#menu').setAttribute('aria-expanded','false');}
$('#menu').addEventListener('click',()=>{const isOpen=$('#sidebar').classList.toggle('open');$('#menu').setAttribute('aria-expanded',String(isOpen));$('#scrim').hidden=!isOpen;});
$('#scrim').addEventListener('click',closeMenu);
$$('.sidebar a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]');
  if(btn){const action=btn.dataset.action;
    if(action==='exit')quickExit();
    if(action==='emergency')show('emergencyModal');
    if(action==='report'){if(!contributionsEnabled){notify('Novas marcações exigem armazenamento persistente. Por enquanto, use a busca de serviços.');return;}openReportForm(state.reportKind||'positive');}
    if(action==='plan')show('planModal');
  }
  if(e.target.matches('[data-close]'))e.target.closest('dialog').close();
});
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='x'){e.preventDefault();quickExit();}if(e.key==='Escape')closeMenu();});
// Acessibilidade: ajustes persistentes só da aparência.
const savedPref=(()=>{try{return JSON.parse(localStorage.getItem('elasplus_preferences'))||{}}catch{return {}}})();
const settings={font:({normal:16,large:18,larger:20}[savedPref.fontSize]||16),contrast:Boolean(savedPref.contrast),theme:savedPref.theme||'purple',dyslexia:Boolean(savedPref.dyslexia)};
settings.font=Math.min(22,Math.max(14,settings.font));
function applyPreferences(){const root=document.documentElement;root.style.setProperty('--font-size',settings.font+'px');root.dataset.contrast=settings.contrast?'high':'normal';root.dataset.theme=settings.theme;root.dataset.dyslexia=settings.dyslexia?'yes':'no';$('#contrastToggle').setAttribute('aria-pressed',String(settings.contrast));localStorage.setItem('elasplus_preferences',JSON.stringify({fontSize:settings.font>=20?'larger':settings.font>=18?'large':'normal',contrast:settings.contrast,theme:settings.theme,dyslexia:settings.dyslexia}));} 
$('#fontMinus').addEventListener('click',()=>{settings.font=Math.max(14,settings.font-2);applyPreferences();});
$('#fontPlus').addEventListener('click',()=>{settings.font=Math.min(22,settings.font+2);applyPreferences();});
$('#fontReset').addEventListener('click',()=>{settings.font=16;applyPreferences();});
$('#contrastToggle').addEventListener('click',()=>{settings.contrast=!settings.contrast;applyPreferences();});
try{applyPreferences();}catch{document.documentElement.style.setProperty('--font-size','16px');}

// Assistente local de orientação: nunca se identifica como IA real.
const guidance=[
  {match:/amea[çc]|perigo|me agred|me bateu|agress[aã]o|risco imediato|armad[ao]|socorro/i,answer:'Se você está em perigo agora, priorize sua segurança e ligue 190. Se puder, afaste-se do risco sem se expor. O Ligue 180 (24h) orienta sobre a rede de proteção. Este guia não realiza chamadas ou envia alertas.'},
  {match:/protetiv|medida|afastar|boletim|denunciar|den[úu]ncia/i,answer:'Você pode buscar orientação pelo Ligue 180 ou pela Defensoria Pública e procurar uma delegacia, inclusive especializada quando houver. A autoridade competente pode orientar sobre registro de ocorrência e medidas protetivas. Em emergência, ligue 190. Consulte também a rede local no Mapa Seguro.'},
  {match:/abus|control|relacionamento|companheir|ci[uú]me|humilh|viol[eê]ncia/i,answer:'Controlar suas amizades, intimidar, ameaçar ou humilhar são sinais que merecem atenção. Não precisa lidar com isso sozinha: converse com alguém de confiança, procure orientação pelo 180 e planeje seus próximos passos de forma segura. Se houver risco imediato, ligue 190. Posso ajudar a localizar serviços pelo mapa.'},
  {match:/trabalh|ass[eé]di|chef|empreg|discrimin/i,answer:'No trabalho, registre informações sobre ocorrências apenas se isso for seguro, procure canais institucionais confiáveis e orientação jurídica ou sindical adequada ao caso. A Defensoria e órgãos trabalhistas podem indicar caminhos. Quando envolver ameaça ou violência, priorize a proteção e busque os canais oficiais.'},
  {match:/trans|lgbt|homofob|transfob|preconceito/i,answer:'Você merece atendimento respeitoso. Em casos de discriminação, procure orientação sobre direitos na Defensoria Pública ou em centros especializados e canais oficiais. Use o Mapa Seguro para buscar serviços próximos; confirme antes se o atendimento corresponde à sua necessidade.'},
  {match:/pcd|defici[eê]nc|autis|at[ií]pic|acessib/i,answer:'Para serviços acessíveis, filtre os pontos públicos pelo Mapa Seguro e confirme por telefone rampas, comunicação acessível e outras adaptações antes do deslocamento. A Defensoria e serviços sociais podem ajudar a orientar sobre direitos de acessibilidade.'},
  {match:/perto|mapa|cras|creas|ubs|delegacia|endere[çc]|servi[çc]o|local/i,answer:'Abra o Mapa Seguro, busque sua cidade ou permita a localização e selecione um filtro de delegacias, saúde, assistência ou farmácias. Os pontos vêm do OpenStreetMap e podem estar incompletos; confira os dados antes de sair.'}
];
function guideReply(message){const norm=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'');const found=guidance.find(g=>g.match.test(norm));return found?.answer || 'Obrigada por contar. Posso ajudar com orientações iniciais sobre relações, limites no trabalho, direitos, serviços públicos e formas de buscar apoio. Você pode me dizer, sem dados que identifiquem pessoas, se sua dúvida é sobre segurança, trabalho, saúde ou algum serviço? Em emergência, ligue 190.';}
function addBubble(text,type){const d=document.createElement('div');d.className='bubble '+type;d.textContent=text;$('#chatLog').append(d);$('#chatLog').scrollTop=$('#chatLog').scrollHeight;}
let remoteAIEnabled=false;
let contributionsEnabled=false;
function setContributionAvailability(enabled){
  contributionsEnabled=Boolean(enabled);
  // Não ofereça cadastro de relatos se não há persistência e moderação disponíveis.
  const block=$('.map-contribute'),statusPanel=$('#mapContributionStatus');
  if(block)block.hidden=!contributionsEnabled;
  document.querySelectorAll('[data-action="report"],[data-map-kind]').forEach(btn=>{
    btn.disabled=!contributionsEnabled;
    btn.hidden=!contributionsEnabled;
    btn.setAttribute('aria-disabled',String(!contributionsEnabled));
    btn.title=contributionsEnabled?'Registrar uma experiência para avaliação':'Relatos indisponíveis enquanto não há armazenamento moderado';
  });
  if(statusPanel){
    statusPanel.hidden=contributionsEnabled;
    if(!contributionsEnabled){
      statusPanel.replaceChildren();
      const strong=document.createElement('strong');
      strong.textContent='Relatos comunitários temporariamente desativados.';
      const description=document.createElement('span');
      description.textContent=' A busca por serviços continua disponível. Para publicar experiências com privacidade, precisamos de armazenamento persistente e aprovação humana.';
      statusPanel.append(strong,description);
    }
  }
  const totals=$('#reportTotals');
  if(totals&&!contributionsEnabled)totals.textContent='Sem relatos publicados nesta versão; use os filtros de serviços.';
}
function disableContributions(){setContributionAvailability(false);}

async function detectAI(){
  if(location.protocol==='file:')return;
  try{const res=await fetch('/api/status',{signal:AbortSignal.timeout(3500)});if(!res.ok)return;const data=await res.json();remoteAIEnabled=Boolean(data.aiEnabled);
    if(remoteAIEnabled&&$('#aiConsentLabel')){$('#aiConsentLabel').hidden=false;$('.assistant-panel .beta').textContent='IA OPCIONAL';notify('IA externa disponível. Ative-a somente se desejar enviar sua mensagem ao serviço.');}
  }catch{/* HTML simples: somente guia local */}
}
const supportFlowModule=import('./apoio-fluxos.js').catch(()=>null);
async function showNextSteps(message){
  const area=$('#nextSteps');if(!area)return;
  const module=await supportFlowModule;if(!module)return;
  const flow=module.nextStepsFor(message);area.replaceChildren();
  const title=document.createElement('h3');title.textContent=flow.title;
  const desc=document.createElement('p');desc.textContent=flow.description;
  const links=document.createElement('div');links.className='support-actions';
  for(const item of flow.actions){
    const link=document.createElement('a');link.textContent=item.label;link.href=item.href;
    if(item.href.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer';}
    if(item.kind==='urgent')link.classList.add('support-urgent');
    links.append(link);
  }
  const caveat=document.createElement('small');caveat.textContent='Sugestões informativas. Nenhum relato foi salvo ou enviado ao mapa. Confirme dados dos locais antes da visita.';
  area.append(title,desc,links,caveat);area.hidden=false;
}
async function sendChat(message){const val=message.trim();if(!val)return;addBubble(val,'user');$('#chatInput').value='';
  const sendBtn=$('.send');sendBtn.disabled=true;
  if(remoteAIEnabled && $('#aiConsent').checked){
    try{const res=await fetch('/api/assistente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:val,consent:true}),signal:AbortSignal.timeout(25000)});const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao consultar IA');addBubble(data.answer||'Não foi possível obter uma resposta.','bot');}
    catch(err){addBubble('Não foi possível consultar o modelo externo agora. Segue uma orientação local: '+guideReply(val),'bot');}
  }else addBubble(guideReply(val),'bot');
  await showNextSteps(val);
  sendBtn.disabled=false;
}
$('#chatForm')?.addEventListener('submit',e=>{e.preventDefault();sendChat($('#chatInput').value);});
$$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{const message=btn.dataset.prompt;document.querySelector('#assistente').scrollIntoView({block:'start',behavior:'smooth'});sendChat(message);}));
if ($('#chatForm')) detectAI();
if ($('#map')){
  // O estado seguro é DESATIVADO até confirmação explícita do servidor.
  disableContributions();
  fetch('/api/status',{signal:AbortSignal.timeout(4500)})
    .then(r=>r.ok?r.json():null)
    .then(data=>{if(data?.contributionsEnabled===true)setContributionAvailability(true);})
    .catch(()=>disableContributions());
}

// Mapa Leaflet: dados reais e pontuais via OSM/Overpass; nenhum serviço é inventado.
function markerIcon(type){const value=TYPES[type]||TYPES.social;return L.divIcon({className:'',iconSize:[27,27],iconAnchor:[14,25],popupAnchor:[0,-23],html:`<div class="poi-pin ${type}"><span>${value.icon}</span></div>`});}
function initMap(){if(typeof L==='undefined'){$('#map').innerHTML='<div class="map-unavailable">Não foi possível carregar a biblioteca do mapa. Verifique sua conexão. Você ainda pode consultar serviços oficiais pelo Ligue 180.</div>';status('Mapa indisponível sem a biblioteca online.');const help=$('#offlineSupport');if(help)help.hidden=false;return;}
  $('#map').replaceChildren();state.map=L.map('map',{zoomControl:true,scrollWheelZoom:false}).setView(DEFAULT_CENTER,13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(state.map);
  state.layers=L.layerGroup().addTo(state.map);state.communityLayer=L.layerGroup().addTo(state.map);state.userLayer=L.layerGroup().addTo(state.map);
  state.map.on('moveend',()=>{const center=state.map.getCenter();state.currentCenter=[center.lat,center.lng];renderPlaces();
    if(state.lastSearchedCenter){const moved=state.map.distance(center,state.lastSearchedCenter)>Math.max(500,state.radius*.4);$('#refreshArea').hidden=!moved;}});
  state.map.on('click',e=>{
    if(!state.picking)return; // Tocar no mapa para explorar não inicia uma denúncia ou marcação.
    chooseReportCoord(e.latlng);state.picking=false;setPickingUI(false);show('reportModal');
    notify('Área escolhida. Complete sua contribuição.');
  });
  loadPOIs();
}
function status(text){$('#mapStatus').textContent=text;}
async function loadPublished(){
  try{const r=await fetch('/api/relatos');if(!r.ok)throw Error();const data=await r.json();state.published=Array.isArray(data.reports)?data.reports:[];renderPlaces();renderReports();}
  catch{notify('Não foi possível consultar relatos aprovados agora.');}
}
async function loadPOIs(){
  if(!state.map)return;
  const req=++state.loadToken;const center=state.map.getCenter();
  if($('#serviceDetails')){$('#serviceDetails').replaceChildren();$('#serviceDetails').hidden=true;}
  status('Buscando estabelecimentos próximos...');$('#placeList').innerHTML='<p class="muted">Carregando locais próximos do OpenStreetMap...</p>';
  updateMapFallbackLink();
  const summary=$('#placeResultsSummary');if(summary)summary.textContent='Consultando estabelecimentos...';
  try{
    const type=Object.hasOwn(TYPES,state.filter)&&state.filter!=='community'?state.filter:'all';
    // Reduzir precisão para ~100 m antes de a posição entrar na URL/na infraestrutura externa.
    const approxLat=center.lat.toFixed(3),approxLon=center.lng.toFixed(3);
    const url=`/api/locais?lat=${encodeURIComponent(approxLat)}&lon=${encodeURIComponent(approxLon)}&type=${encodeURIComponent(type)}&radius=${state.radius}`;
    const r=await fetch(url,{signal:AbortSignal.timeout(14500)});
    const data=await r.json();if(req!==state.loadToken)return;
    if(!r.ok)throw Error(data.error||'Consulta indisponível');
    state.poi=(data.places||[]).map(p=>({...p,coord:[p.lat,p.lon],tags:{'addr:street':p.address||''}}));state.lastSearchedCenter=center;$('#refreshArea').hidden=true;state.listLimit=20;
    if($('#offlineSupport'))$('#offlineSupport').hidden=true;
    renderPlaces();status(data.stale?`${state.poi.length} local(is) encontrados em consulta anterior. A fonte está instável: confirme os dados antes de sair.`:data.partial?`${state.poi.length} local(is) indexado(s) nesta área. Fonte: ${data.source||'OpenStreetMap'} (lista parcial). Confirme antes de visitar.`:`${state.poi.length} estabelecimentos encontrados na área consultada. Fonte: OpenStreetMap — confirme antes de visitar.`);
  }catch(e){if(req!==state.loadToken)return;state.poi=[];renderPlaces();if($('#offlineSupport'))$('#offlineSupport').hidden=false;status('Serviços temporariamente indisponíveis nesta área. Use a busca externa no OpenStreetMap ou os contatos oficiais.');notify('A fonte de locais está indisponível agora.');}
}
function updateMapFallbackLink(){
  const anchor=$('#osmFallbackLink');if(!anchor)return;
  const terms={police:'delegacia polícia',health:'hospital posto de saúde',pharmacy:'farmácia',social:'assistência social CRAS',childcare:'creche',shop:'mercado',food:'restaurante',services:'banco'}; 
  const q=([terms[state.filter]||'serviços públicos',$('#placeInput')?.value.trim()||'Queimados, RJ']).filter(Boolean).join(' ');
  anchor.href='https://www.openstreetmap.org/search?query='+encodeURIComponent(q);
  const google=$('#googleFallbackLink');
  if(google)google.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
}
function serviceLinks(place){
  const lat=Number(place.coord[0]), lon=Number(place.coord[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return {map:'#',route:'#',phone:''};
  return {
    map:`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=17/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`,
    route:`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lon)}`,
    phone:String(place.phone||'').replace(/[^0-9+]/g,'')
  };
}
function popupData(place){const links=serviceLinks(place);const phone=links.phone.length>=10?`<br><a href="tel:${escapeHtml(links.phone)}">Ligar para o serviço</a>`:'';
  return `<strong>${escapeHtml(place.name)}</strong><br>${escapeHtml(TYPES[place.type]?.label||'Serviço')}`+
  (place.address?`<br>${escapeHtml(place.address)}`:'')+
  `<br><small>Fonte: OpenStreetMap — informações não verificadas. Confirme antes de visitar.</small>${phone}<br><a href="${links.route}" target="_blank" rel="noopener noreferrer">Como chegar ↗</a>`;
}
function showServiceDetails(place){const panel=$('#serviceDetails');if(!panel)return;
  panel.replaceChildren();const links=serviceLinks(place);
  const title=document.createElement('h3');title.textContent=place.name;
  const category=document.createElement('p');category.textContent=(TYPES[place.type]?.label||'Serviço')+(place.address?' · '+place.address:'');
  const caption=document.createElement('small');caption.textContent='Fonte: OpenStreetMap (colaborativa). Telefone, horários e acessibilidade podem estar incompletos: confirme antes de visitar.';
  const actions=document.createElement('div');actions.className='support-actions';
  function addLink(label,href,external){const a=document.createElement('a');a.textContent=label;a.href=href;if(external){a.target='_blank';a.rel='noopener noreferrer';}actions.append(a);}
  addLink('Como chegar ↗',links.route,true);
  addLink('Abrir no OpenStreetMap ↗',links.map,true);
  if(links.phone.length>=10)addLink('Ligar para o serviço',`tel:${links.phone}`,false);
  panel.append(title,category,actions,caption);panel.hidden=false;
}
const CATEGORY={
  lighting:'Iluminação insuficiente',accessibility:'Acessibilidade',support:'Ponto de apoio',transport:'Transporte e circulação',correction:'Informação a corrigir',
  lighting_ok:'Boa iluminação',movement:'Local movimentado',service_good:'Atendimento útil',harassment:'Assédio em espaço público',service_issue:'Dificuldade com serviço público'
};
const REPORT_OPTIONS={
 positive:[['support','Ponto de apoio ou acolhimento'],['lighting_ok','Local bem iluminado'],['movement','Local movimentado'],['accessibility','Local com acessibilidade'],['service_good','Atendimento público útil']],
 attention:[['lighting','Iluminação insuficiente'],['accessibility','Barreira de acessibilidade'],['transport','Dificuldade de transporte ou circulação'],['harassment','Assédio ou intimidação na região'],['service_issue','Dificuldade no serviço ou atendimento'],['correction','Informação incorreta no mapa']]
};
const KIND_LABEL={positive:'Experiência positiva',attention:'Ponto de atenção',info:'Registro da comunidade'};
const KIND_ICON={positive:'✓',attention:'!',info:'⌖'};
function reportKind(report){return ['positive','attention'].includes(report.kind)?report.kind:'info';}
function communityIcon(kind){return L.divIcon({className:'',iconSize:[29,29],iconAnchor:[15,26],popupAnchor:[0,-24],html:`<div class="poi-pin community-${kind}"><span>${KIND_ICON[kind]}</span></div>`});}
function reportPopup(report){const kind=reportKind(report);const when=report.createdAt?new Date(report.createdAt).toLocaleDateString('pt-BR'):'';
 return `<strong>${escapeHtml(KIND_ICON[kind]+' '+KIND_LABEL[kind])}</strong><br><strong>${escapeHtml(CATEGORY[report.category]||report.category)}</strong><br>${escapeHtml(report.description)}<br><small>Relato comunitário aprovado · região aproximada${when?' · '+escapeHtml(when):''}. Não comprova segurança do local.</small>`;}
function visibleCommunity(){if(!state.map)return[];const bounds=state.map.getBounds().pad(.15);return state.published.filter(r=>Number.isFinite(+r.lat)&&Number.isFinite(+r.lon)&&bounds.contains([+r.lat,+r.lon]));}
function formatDistance(meters){
  const m=Number(meters);if(!Number.isFinite(m)||m<0)return '';
  return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1).replace('.',',')} km`;
}
function normalizeSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function renderPlaces(){
  if(!state.map)return;
  state.layers.clearLayers();state.communityLayer.clearLayers();
  const filter=state.filter;
  const isCommunityFilter=['positive','attention','community'].includes(filter);
  const name=normalizeSearch(state.nameSearch);
  const visible=state.poi
    .filter(p=>filter==='all'||p.type===filter)
    .filter(p=>!name||normalizeSearch(p.name+' '+p.address+' '+(TYPES[p.type]?.label||'')).includes(name))
    .sort((a,b)=>(a.distance||0)-(b.distance||0));
  for(const place of isCommunityFilter?[]:visible){
    if(!place.coord)continue;
    const marker=L.marker(place.coord,{icon:markerIcon(place.type),title:place.name}).addTo(state.layers).bindPopup(popupData(place));
    marker.on('click',()=>showServiceDetails(place));place.marker=marker;
  }
  const reports=visibleCommunity();
  const reportsMatching=reports.filter(r=>filter==='all'||filter==='community'||reportKind(r)===filter);
  for(const r of reportsMatching){
    if(!['all','community','positive','attention'].includes(filter))continue;
    const kind=reportKind(r);
    r.marker=L.marker([r.lat,r.lon],{icon:communityIcon(kind),title:KIND_LABEL[kind]+'; região aproximada'}).bindPopup(reportPopup(r)).addTo(state.communityLayer);
  }
  const totals=$('#reportTotals');totals.replaceChildren();
  const counts={positive:reports.filter(r=>reportKind(r)==='positive').length,attention:reports.filter(r=>reportKind(r)==='attention').length,info:reports.filter(r=>reportKind(r)==='info').length};
  for(const [kind,text] of [['positive','✓ '+counts.positive+' positivas'],['attention','! '+counts.attention+' de atenção'],['info',counts.info+' outros relatos']]){
    if(kind==='info'&&!counts.info)continue;
    const span=document.createElement('span');span.className='report-total '+kind;span.textContent=text;totals.append(span);
  }
  const list=$('#placeList');list.replaceChildren();
  $('#placeListTitle').textContent=isCommunityFilter?'Relatos da região visível':'Estabelecimentos encontrados';
  const summary=$('#placeResultsSummary');
  if(summary)summary.textContent=isCommunityFilter?`${reportsMatching.length} relatos aprovados nesta área; não garantem a segurança do local.`:`${visible.length} resultado(s) • até ${state.radius/1000} km do local pesquisado • ordenados pela proximidade`;
  if(isCommunityFilter){
    if(!reportsMatching.length){const p=document.createElement('p');p.className='muted';p.textContent='Nenhum relato aprovado deste tipo nesta região. Você pode mover o mapa ou escolher outra categoria.';list.append(p);}
    else reportsMatching.slice(-24).reverse().forEach(r=>renderReportPlace(list,r));
    return;
  }
  if(!visible.length){
    const p=document.createElement('p');p.className='muted';p.textContent=state.nameSearch?'Nenhum nome corresponde à pesquisa nesta categoria. Tente outro termo ou selecione Todos os locais.':'Nenhum estabelecimento encontrado neste raio. Experimente ampliar a distância, mudar a categoria ou pesquisar outra cidade.';
    list.append(p);
    const osm=$('#osmFallbackLink');
    if(osm){const link=document.createElement('a');link.href=osm.href;link.target='_blank';link.rel='noopener noreferrer';link.className='map-empty-search';link.textContent='Consultar também no OpenStreetMap ↗';list.append(link);}
    return;
  }
  for(const place of visible.slice(0,state.listLimit)){
    const item=document.createElement('div');item.className='place-result';
    const button=document.createElement('button');button.type='button';button.className='place';button.setAttribute('aria-label','Ver '+place.name+' no mapa');
    const sym=document.createElement('span');sym.className='place-icon';sym.textContent=(TYPES[place.type]||TYPES.social).icon;
    const detail=document.createElement('span');detail.className='place-body';
    const strong=document.createElement('strong');strong.textContent=place.name;
    const small=document.createElement('small');small.textContent=(TYPES[place.type]?.label||'Estabelecimento')+(place.address?' · '+place.address:'');
    detail.append(strong,small);const distance=document.createElement('span');distance.className='place-distance';distance.textContent=formatDistance(place.distance);
    button.append(sym,detail,distance);button.addEventListener('click',()=>{
      state.map.setView(place.coord,16);place.marker?.openPopup();showServiceDetails(place);
      $('#serviceDetails')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    const actions=document.createElement('div');actions.className='place-actions';
    const links=serviceLinks(place);
    const route=document.createElement('a');route.href=links.route;route.target='_blank';route.rel='noopener noreferrer';route.textContent='Como chegar ↗';actions.append(route);
    if(links.phone.length>=10){const phone=document.createElement('a');phone.href='tel:'+links.phone;phone.textContent='Ligar';actions.append(phone);}
    item.append(button,actions);list.append(item);
  }
  if(visible.length>state.listLimit){const more=document.createElement('button');more.type='button';more.className='map-show-more';more.textContent=`Ver mais resultados (${visible.length-state.listLimit} restantes)`;more.addEventListener('click',()=>{state.listLimit+=20;renderPlaces();});list.append(more);}
}
function renderReportPlace(list,r){const kind=reportKind(r);const b=document.createElement('button');b.type='button';b.className='place community-place '+kind;
 const sym=document.createElement('span');sym.className='place-icon '+kind;sym.textContent=KIND_ICON[kind];const detail=document.createElement('span');detail.className='place-body';const strong=document.createElement('strong');strong.textContent=KIND_LABEL[kind]+' · '+(CATEGORY[r.category]||r.category);const small=document.createElement('small');small.textContent=r.description+' · Região aproximada · Relato aprovado';detail.append(strong,small);const arrow=document.createElement('span');arrow.className='place-chevron';arrow.textContent='›';b.append(sym,detail,arrow);b.addEventListener('click',()=>{state.map.setView([r.lat,r.lon],Math.min(state.map.getZoom(),13));r.marker?.openPopup();});list.append(b);}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  state.filter=b.dataset.filter;state.listLimit=20;updateMapFallbackLink();
  $$('[data-filter]').forEach(el=>{const active=el===b;el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));});
  if(['community','positive','attention'].includes(state.filter))renderPlaces();else loadPOIs();
}));
$('#establishmentSearch')?.addEventListener('input',e=>{state.nameSearch=e.target.value;state.listLimit=20;renderPlaces();});
$('#searchRadius')?.addEventListener('change',e=>{state.radius=Number(e.target.value);state.listLimit=20;if(['community','positive','attention'].includes(state.filter))renderPlaces();else loadPOIs();});
$('#placeForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=$('#placeInput').value.trim();if(text.length<3){notify('Informe uma cidade, bairro ou endereço.');return;}status('Procurando local...');updateMapFallbackLink();try{const res=await fetch('/api/buscar?q='+encodeURIComponent(text));const found=await res.json();if(!res.ok)throw Error(found.error||'Consulta indisponível');if(!found.results?.length){status('Local não encontrado. Tente incluir cidade e estado.');return;}const loc=[Number(found.results[0].lat),Number(found.results[0].lon)];state.map?.setView(loc,13);await loadPOIs();}catch{status('Busca indisponível. Tente novamente quando houver conexão.');}});
$('#myLocation')?.addEventListener('click',()=>{if(!navigator.geolocation){notify('Este navegador não oferece geolocalização.');return;}status('Aguardando sua permissão de localização…');navigator.geolocation.getCurrentPosition(async p=>{const coords=[p.coords.latitude,p.coords.longitude];if(state.map){state.map.setView(coords,14);state.userLayer.clearLayers();L.circleMarker(coords,{radius:8,color:'#fff',fillColor:'#287fff',weight:3,fillOpacity:1}).addTo(state.userLayer).bindPopup('Posição autorizada por você. Somente coordenadas aproximadas (~100 m) são consultadas no servidor. Sua posição exata não é publicada.');await loadPOIs();}},()=>{status('Localização negada ou indisponível. Você pode usar a busca por cidade.');},{enableHighAccuracy:false,maximumAge:60000,timeout:11000});});

// Relatos enviados à moderação do servidor, que persiste em JSON local.
function setReportKind(kind){state.reportKind=kind;const input=document.querySelector('input[name="reportKind"][value="'+kind+'"]');if(input)input.checked=true;
 const options=REPORT_OPTIONS[kind]||REPORT_OPTIONS.positive;const select=$('#reportCategory');const previous=select.value;select.replaceChildren();
 for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
 if(options.some(v=>v[0]===previous))select.value=previous;
 $('#reportDescription').placeholder=kind==='positive'?'Ex.: a praça possui iluminação e movimento no início da noite.':'Ex.: trecho com pouca iluminação ou calçada sem acesso por rampa.';
}
function openReportForm(kind){state.picking=false;setPickingUI(false);setReportKind(kind||'positive');updateReportLocationLabel();show('reportModal');}
function chooseReportCoord(latlng){state.selectedReportCoord=latlng;if(state.reportDraftMarker)state.map.removeLayer(state.reportDraftMarker);
 state.reportDraftMarker=L.circleMarker(latlng,{radius:9,color:'#7a2ca7',weight:3,fillColor:'#f58bc2',fillOpacity:.7}).addTo(state.map).bindPopup('Região selecionada para contribuição. A marca será aproximada antes de ser publicada.');updateReportLocationLabel();}
function updateReportLocationLabel(){const c=state.selectedReportCoord||state.map?.getCenter();$('#reportAreaLabel').textContent=c?'Área aproximada selecionada: '+c.lat.toFixed(2)+', '+c.lng.toFixed(2)+'. A localização será arredondada antes de ser armazenada.':'Abra o mapa para selecionar a região.';}
function setPickingUI(active){$('#mapGuidance').classList.toggle('is-picking',active);$('.map-view').classList.toggle('is-picking',active);$('#map').classList.toggle('is-picking',active);$('#mapGuidanceText').textContent=active?'Agora clique ou toque no ponto desejado do mapa para continuar.':'Arraste para explorar; use os botões acima para contribuir.';}
$$('[data-map-kind]').forEach(b=>b.addEventListener('click',()=>{if(!contributionsEnabled){notify('A publicação de relatos precisa de armazenamento persistente.');return;}state.selectedReportCoord=null;openReportForm(b.dataset.mapKind);}));
$$('input[name="reportKind"]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)setReportKind(input.value);}));
$('#selectMapArea')?.addEventListener('click',()=>{if(!state.map){notify('Mapa indisponível. Você precisa carregar o mapa antes de selecionar um local.');return;}state.picking=true;$('#reportModal').close();setPickingUI(true);$('#mapa').scrollIntoView({behavior:'smooth',block:'center'});notify('Toque no mapa para selecionar a região da contribuição.');});
$('#retryPlaces')?.addEventListener('click',()=>loadPOIs());
$('#refreshArea')?.addEventListener('click',()=>loadPOIs());if ($('#refreshArea')) $('#refreshArea').hidden=true;
$('#reportForm')?.addEventListener('submit',async e=>{e.preventDefault();const c=state.selectedReportCoord||state.map?.getCenter();if(!c){notify('Carregue o mapa antes de contribuir.');return;}
 const kind=document.querySelector('input[name="reportKind"]:checked')?.value;const category=$('#reportCategory').value;const description=$('#reportDescription').value.trim();
 if(!kind||!REPORT_OPTIONS[kind]?.some(opt=>opt[0]===category)){notify('Escolha o tipo e a categoria da contribuição.');return;}
 const btn=$('#reportForm button[type=submit]');btn.disabled=true;
 try{const res=await fetch('/api/relatos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,category,description,lat:c.lat,lon:c.lng})});const result=await res.json();if(!res.ok)throw Error(result.error||'Falha no envio.');state.reports.push({kind,category,description,status:'pending'});$('#reportDescription').value='';$('#reportModal').close();renderReports();notify('Contribuição recebida! Ela só aparecerá no mapa após aprovação manual.');state.selectedReportCoord=null;if(state.reportDraftMarker){state.map.removeLayer(state.reportDraftMarker);state.reportDraftMarker=null;}}
 catch(err){notify(err.message||'Não foi possível enviar a contribuição.');}finally{btn.disabled=false;}
});
function renderReports(){const wrap=$('#reportList');wrap.replaceChildren();const pending=state.reports.map(r=>({...r,pending:true}));const items=[...pending,...state.published.slice(-5).reverse()];
  for(const r of items){const item=document.createElement('div');item.className='report-mini';const strong=document.createElement('strong');strong.textContent=KIND_ICON[reportKind(r)]+' '+KIND_LABEL[reportKind(r)]+' · '+(CATEGORY[r.category]||r.category);const desc=document.createElement('span');desc.textContent=r.description;const meta=document.createElement('span');meta.textContent=r.pending?'Aguardando revisão (visível só nesta sessão)':'Aprovado · área aproximada · informação comunitária';item.append(strong,desc,meta);wrap.append(item);}
  if(!items.length)wrap.textContent='Ainda não há relatos aprovados. Contribuições são revisadas antes de aparecer.';
}
// Rede de confiança: somente memória da aba, sem envio de mensagens.
$('#contactForm')?.addEventListener('submit',e=>{e.preventDefault();const name=$('#contactName').value.trim();const phone=$('#contactPhone').value.replace(/\D/g,'');if(phone.length<10||phone.length>13){notify('Informe um telefone válido com DDD.');return;}if(state.contacts.length>=5){notify('Limite de cinco contatos nesta demonstração.');return;}state.contacts.push({name,phone});$('#contactName').value='';$('#contactPhone').value='';renderContacts();notify('Contato adicionado apenas nesta sessão.');});
function renderContacts(){const wrap=$('#savedContacts');wrap.replaceChildren();$('#contactsStatus').textContent=state.contacts.length?`${state.contacts.length} contato(s) configurado(s) nesta sessão`:'Configurar nesta sessão';state.contacts.forEach(c=>{const row=document.createElement('div');row.className='contact-row';const n=document.createElement('strong');n.textContent=c.name;const link=document.createElement('a');link.textContent='Preparar SMS ↗';link.href=`sms:${c.phone}?body=${encodeURIComponent('Preciso de ajuda. Por favor, entre em contato comigo. Mensagem preparada manualmente pelo Elas+; o envio depende da sua confirmação.')}`;row.append(n,link);wrap.append(row);});}

window.addEventListener('load',()=>{if ($('#map')) {initMap();loadPublished();}const queryFilter=new URLSearchParams(location.search).get('f');if(queryFilter&&TYPES[queryFilter]){const b=document.querySelector(`[data-filter="${queryFilter}"]`);if(b)b.click();}updateMapFallbackLink();const nickname=localStorage.getItem('elasplus_nickname');if(nickname){const el=document.querySelector('.account-sidebar strong');if(el)el.textContent=nickname;}});
