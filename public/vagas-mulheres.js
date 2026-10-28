/* Elas+ Oportunidades: catálogo transparente, filtros locais e navegação responsiva. */
'use strict';
(() => {
const byId = id => document.getElementById(id);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const savedKey = 'elas_jobs_saved_v1';
const fields = ['keyword', 'location', 'modality', 'level', 'focus'];
const allowedCategories = new Set(['geral', 'afirmativa_mulheres', 'diversidade']);
const allowedModalities = new Set(['remoto', 'hibrido', 'presencial']);
const allowedLevels = new Set(['estagio', 'junior', 'pleno', 'senior']);
let jobs = [];
let loadState = 'loading';
let activeView = 'all';

function favoriteIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    return Array.isArray(saved) ? saved.filter(v => typeof v === 'string') : [];
  } catch { return []; }
}
function toggleFavorite(id) {
  const current = favoriteIds();
  const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id];
  try { localStorage.setItem(savedKey, JSON.stringify(next)); }
  catch { /* o site continua usável sem armazenamento local */ }
  render();
}
function dateValue(value, endOfDay = false) {
  if (typeof value !== 'string') return NaN;
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay ? value + 'T23:59:59Z' : value;
  return Date.parse(raw);
}
function isValidJob(job) {
  if (!job || typeof job !== 'object') return false;
  const required = ['id', 'title', 'company', 'source', 'source_url', 'apply_url', 'verified_at', 'expires_at'];
  if (required.some(k => typeof job[k] !== 'string' || !job[k].trim())) return false;
  if (job.category && !allowedCategories.has(job.category)) return false;
  if (job.modality && !allowedModalities.has(job.modality)) return false;
  if (job.level && !allowedLevels.has(job.level)) return false;
  try {
    const source = new URL(job.source_url);
    const apply = new URL(job.apply_url);
    if (source.protocol !== 'https:' || apply.protocol !== 'https:') return false;
    const now = Date.now();
    const verified = dateValue(job.verified_at);
    const expires = dateValue(job.expires_at, true);
    return Number.isFinite(verified) && Number.isFinite(expires) && verified <= now && expires > now;
  } catch { return false; }
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function formatDate(value) {
  const date = new Date(dateValue(value));
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function externalUrl(override) {
  const params = new URLSearchParams();
  const keyword = override === undefined ? byId('keyword').value.trim() : override;
  const focus = byId('focus').value;
  const suffix = { geral: '', afirmativa_mulheres: 'programa para mulheres', diversidade: 'diversidade e inclusão' }[focus] || '';
  params.set('keywords', [keyword, suffix].filter(Boolean).join(' ') || 'vagas');
  const location = byId('location').value.trim();
  if (location) params.set('location', location);
  const modality = { presencial: '1', remoto: '2', hibrido: '3' }[byId('modality').value];
  const level = { estagio: '1', junior: '2', pleno: '3', senior: '4' }[byId('level').value];
  if (modality) params.set('f_WT', modality);
  if (level) params.set('f_E', level);
  return 'https://www.linkedin.com/jobs/search/?' + params.toString();
}
function updateExternalLinks() {
  const url = externalUrl();
  byId('externalSearchLink').href = url;
  const emptyLink = byId('emptyExternalLink');
  if (emptyLink) emptyLink.href = url;
}
function cardFor(job) {
  const article = node('article', undefined, 'jobs-card');
  const title = node('h3', job.title);
  const company = node('p', job.company, 'jobs-meta');
  const particulars = node('p',
    [job.location || 'Local não informado',
      { remoto: 'Remoto', hibrido: 'Híbrido', presencial: 'Presencial' }[job.modality] || 'Modalidade não informada',
      { estagio: 'Estágio', junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior' }[job.level] || 'Nível não informado'].join(' · '),
    'jobs-meta');
  const categoryLabels = { afirmativa_mulheres: 'Afirmativa para mulheres', diversidade: 'Programa de diversidade', geral: 'Vaga geral' };
  const badge = node('span', categoryLabels[job.category] || 'Vaga geral', 'jobs-category');
  badge.dataset.category = job.category || 'geral';
  article.append(title, company, particulars, badge);
  if (job.description) article.append(node('p', String(job.description)));
  const sourceLine = node('p', 'Fonte: ', 'jobs-meta');
  const sourceLink = node('a', job.source, 'jobs-source-link');
  sourceLink.href = job.source_url;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLine.append(sourceLink, document.createTextNode(' · Verificada em ' + formatDate(job.verified_at) + ' · Até ' + formatDate(job.expires_at)));
  article.append(sourceLine);
  const actions = node('div', undefined, 'jobs-card-actions');
  const link = node('a', 'Ver vaga e candidatar-se ↗', 'jobs-button');
  link.href = job.apply_url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const isSaved = favoriteIds().includes(job.id);
  const favorite = node('button', isSaved ? '★ Salva' : '☆ Salvar', 'jobs-button jobs-button-secondary');
  favorite.type = 'button';
  favorite.setAttribute('aria-pressed', String(isSaved));
  favorite.setAttribute('aria-label', (isSaved ? 'Remover dos favoritos: ' : 'Salvar nos favoritos: ') + job.title);
  favorite.addEventListener('click', () => toggleFavorite(job.id));
  actions.append(link, favorite);
  article.append(actions);
  return article;
}
function emptyState() {
  const wrap = node('div', undefined, 'jobs-empty');
  const symbol = node('span', '✦', 'jobs-empty-symbol');
  symbol.setAttribute('aria-hidden', 'true');
  const title = node('h3');
  const message = node('p');
  if (loadState === 'error') {
    title.textContent = 'Não foi possível carregar as oportunidades';
    message.textContent = 'Houve uma falha ao consultar o catálogo. Você ainda pode pesquisar vagas diretamente no LinkedIn.';
  } else if (activeView === 'saved') {
    title.textContent = 'Nenhuma vaga salva por enquanto';
    message.textContent = 'Quando encontrar oportunidades no catálogo, use o botão Salvar para reuni-las aqui.';
  } else if (!jobs.length) {
    title.textContent = 'Estamos preparando as primeiras vagas';
    message.textContent = 'Ainda não existem anúncios verificados no catálogo do Elas+. Enquanto isso, você pode pesquisar oportunidades no LinkedIn.';
  } else {
    title.textContent = 'Nenhuma vaga com esses filtros';
    message.textContent = 'Tente mudar a localização, o cargo ou o tipo de oportunidade para ampliar sua busca.';
  }
  wrap.append(symbol, title, message);
  const actions = node('div', undefined, 'jobs-empty-actions');
  const link = node('a', 'Buscar vagas no LinkedIn ↗', 'jobs-button');
  link.id = 'emptyExternalLink';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.href = externalUrl();
  actions.append(link);
  if (jobs.length && activeView === 'all') {
    const clear = node('button', 'Limpar filtros', 'jobs-button jobs-button-secondary');
    clear.type = 'button';
    clear.addEventListener('click', resetFilters);
    actions.append(clear);
  }
  wrap.append(actions);
  return wrap;
}
function render() {
  const cards = byId('cards');
  cards.replaceChildren();
  const keyword = normalize(byId('keyword').value.trim());
  const city = normalize(byId('location').value.trim());
  const modality = byId('modality').value;
  const level = byId('level').value;
  const focus = byId('focus').value;
  const saved = new Set(favoriteIds());
  const matching = jobs.filter(job =>
    (!keyword || normalize([job.title, job.company, job.description].join(' ')).includes(keyword)) &&
    (!city || normalize(job.location).includes(city)) &&
    (!modality || modality === job.modality) &&
    (!level || level === job.level) &&
    (!focus || focus === (job.category || 'geral')) &&
    (activeView !== 'saved' || saved.has(job.id)));
  byId('count').textContent = loadState === 'loading' ? 'Carregando…' : matching.length + (matching.length === 1 ? ' vaga' : ' vagas');
  byId('resultsDescription').textContent = activeView === 'saved' ? 'As oportunidades que você guardou neste navegador.' : 'Explore vagas verificadas ou amplie sua busca em fontes externas.';
  if (loadState === 'loading') {
    const loading = node('p', 'Consultando oportunidades disponíveis…', 'jobs-empty');
    loading.setAttribute('role', 'status');
    cards.append(loading);
  } else if (!matching.length) {
    cards.append(emptyState());
  } else {
    cards.append(...matching.map(cardFor));
  }
  updateExternalLinks();
}
function resetFilters() {
  byId('filters').reset();
  render();
}
fields.forEach(id => byId(id).addEventListener(id === 'keyword' || id === 'location' ? 'input' : 'change', render));
byId('filters').addEventListener('submit', e => e.preventDefault());
byId('clearFilters').addEventListener('click', resetFilters);
function setView(view) {
  activeView = view;
  for (const button of document.querySelectorAll('.jobs-tab')) {
    const selected = button.dataset.view === view;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  byId('jobsResults').setAttribute('aria-labelledby', view === 'saved' ? 'tabSaved' : 'tabAll');
  render();
}
document.querySelectorAll('.jobs-tab').forEach(tab => {
  tab.tabIndex = tab.dataset.view === 'all' ? 0 : -1;
  tab.addEventListener('click', () => setView(tab.dataset.view));
  tab.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const other = tab.dataset.view === 'all' ? 'saved' : 'all';
    setView(other);
    byId(other === 'all' ? 'tabAll' : 'tabSaved').focus();
  });
});
document.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => {
  const target = externalUrl(button.dataset.suggestion);
  window.open(target, '_blank', 'noopener,noreferrer');
}));

// Menu compartilhado: em páginas internas os eventos não estão ligados automaticamente.
const sidebar = byId('sidebar');
const menuButton = byId('menu');
const backdrop = byId('scrim');
function closeMenu() {
  sidebar.classList.remove('open');
  document.body.classList.remove('jobs-menu-open');
  backdrop.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
}
function toggleMenu() {
  const open = sidebar.classList.toggle('open');
  backdrop.hidden = !open;
  document.body.classList.toggle('jobs-menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  if (open) sidebar.querySelector('a.nav-link')?.focus();
}
menuButton?.addEventListener('click', toggleMenu);
backdrop?.addEventListener('click', closeMenu);
sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
function quickExit() { window.location.replace('https://www.google.com/'); }
document.querySelectorAll('[data-action="exit"]').forEach(button => button.addEventListener('click', quickExit));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sidebar.classList.contains('open')) { closeMenu(); menuButton.focus(); }
  if (event.key === 'Tab' && sidebar.classList.contains('open')) {
    const items = [...sidebar.querySelectorAll('a[href],button:not([disabled])')];
    if (items.length) {
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  if (event.altKey && event.key.toLowerCase() === 'x') { event.preventDefault(); quickExit(); }
});
const careerLink = sidebar?.querySelector('a[href="recursos.html#carreira"]');
if (careerLink) { careerLink.classList.add('active'); careerLink.setAttribute('aria-current', 'page'); }
const mobileQuery = matchMedia('(max-width: 620px)');
function adaptMoreFilters() { byId('advancedFilters').open = !mobileQuery.matches; }
adaptMoreFilters();
mobileQuery.addEventListener?.('change', adaptMoreFilters);
matchMedia('(max-width: 760px)').addEventListener?.('change', event => { if (!event.matches) closeMenu(); });
fetch('vagas-catalogo.json', { cache: 'no-store' })
  .then(response => { if (!response.ok) throw Error('Catálogo indisponível'); return response.json(); })
  .then(data => { jobs = (Array.isArray(data) ? data : []).filter(isValidJob); loadState = 'ready'; render(); })
  .catch(() => { loadState = 'error'; render(); });
render();
})();
