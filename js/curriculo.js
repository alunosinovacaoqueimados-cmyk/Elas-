(() => {
'use strict';
const byId = id => document.getElementById(id);
const form = byId('cvForm'), output = byId('cvOutput'), status = byId('cvStatus');
if (!form || !output || !status) { console.error('Currículo Elas+: elementos faltando'); return; }
const getData = () => Object.fromEntries(new FormData(form).entries());
const updatePreview = () => {
  const d = getData();
  output.className = 'cvpreview cv-' + (d.template || 'classic');
  output.replaceChildren();
  const add = (tag, value) => { const node = document.createElement(tag); node.textContent = value || ''; output.appendChild(node); };
  add('h2', d.name || 'Seu nome');
  if (d.role) add('p', d.role);
  const contact = [d.email, d.phone, d.city, d.portfolio].filter(Boolean).join(' • ');
  if (contact) add('p', contact);
  [['summary','Resumo profissional'],['experience','Experiência'],['education','Formação'],['skills','Habilidades'],['projects','Projetos, cursos e certificados']].forEach(([key,title]) => {
    if ((d[key] || '').trim()) { add('h3', title); add('p', d[key]); }
  });
  if (!Object.values(d).some(value => String(value || '').trim())) add('p', 'Preencha os campos para gerar a prévia.');
};
const saveLocally = d => { try { localStorage.setItem('elasplus_cv', JSON.stringify(d)); return true; } catch { return false; } };
const downloadText = () => {
  try {
    const d = getData();
    if (!d.name.trim()) { status.textContent = 'Digite seu nome antes de baixar o currículo.'; form.elements.name.focus(); return; }
    const sections = [
      d.name, d.role, [d.email,d.phone,d.city,d.portfolio].filter(Boolean).join(' | '),
      '', 'RESUMO PROFISSIONAL', d.summary, '', 'EXPERIÊNCIA', d.experience,
      '', 'FORMAÇÃO', d.education, '', 'HABILIDADES', d.skills, '',
      'PROJETOS, CURSOS E CERTIFICADOS', d.projects
    ].filter(v => v !== null && v !== undefined);
    const blob = new Blob(['\ufeff' + sections.join('\n').trim()], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (d.name.replace(/[^a-z0-9_-]+/gi,'_') || 'curriculo') + '.txt';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const saved = saveLocally(d);
    status.textContent = 'Download iniciado! Confira a pasta Downloads.' + (saved ? ' Dados também salvos neste navegador.' : '');
  } catch (err) { console.error(err); status.textContent = 'Não foi possível baixar. Tente novamente ou use Imprimir / salvar PDF.'; }
};
const saveDraft = () => { const d = getData(); if (!d.name.trim()) { status.textContent = 'Informe seu nome para salvar este currículo.'; form.elements.name.focus(); return; } const ok = saveLocally(d); status.textContent = ok ? 'Currículo salvo neste navegador! Você pode voltar e recuperar seus dados neste dispositivo.' : 'Não foi possível salvar localmente. Verifique as permissões do navegador.'; };
const restoreDraft = () => { try { const d = JSON.parse(localStorage.getItem('elasplus_cv') || 'null'); if (!d) { status.textContent = 'Nenhum currículo salvo foi encontrado neste navegador.'; return; } Object.entries(d).forEach(([key,value]) => { const field = form.elements.namedItem(key); if (field) field.value = value; }); updatePreview(); status.textContent = 'Currículo recuperado com sucesso!'; } catch { status.textContent = 'Não foi possível recuperar os dados salvos.'; } };
const clearForm = () => {
  form.reset();
  try { localStorage.removeItem('elasplus_cv'); } catch {}
  updatePreview();
  status.textContent = 'Formulário limpo e rascunho local removido.';
};
const printCv = () => {
  const d = getData();
  if (!d.name.trim()) { status.textContent = 'Preencha seu nome antes de exportar o PDF.'; form.elements.name.focus(); return; }
  saveLocally(d);
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sections = [['Resumo profissional',d.summary],['Experiência',d.experience],['Formação',d.education],['Habilidades',d.skills],['Projetos, cursos e certificados',d.projects]];
  const contact = [d.email,d.phone,d.city,d.portfolio].filter(Boolean).map(esc).join(' • ');
  const body = sections.filter(([,value]) => String(value || '').trim()).map(([title,value]) => '<section><h2>'+esc(title)+'</h2><p>'+esc(value).replace(/\n/g,'<br>')+'</p></section>').join('');
  const popup = window.open('', '_blank');
  if (!popup) { status.textContent = 'O navegador bloqueou a janela de PDF. Permita pop-ups para este site e tente novamente.'; return; }
  popup.document.open();
  popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Currículo - '+esc(d.name)+'</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:10.5pt/1.45 Arial,Helvetica,sans-serif;color:#202020;margin:0}.toolbar{position:sticky;top:0;padding:12px;background:#f2f2f2;text-align:center;margin-bottom:20px}.toolbar button{padding:10px 16px;border:0;border-radius:8px;background:#6c247b;color:white;font-weight:bold;cursor:pointer}.resume{max-width:800px;margin:auto}h1{font-size:22pt;margin:0 0 4px} .role{font-size:12pt;margin:0 0 8px;color:#444} .contact{font-size:9.5pt;margin:0 0 18px;color:#555;overflow-wrap:anywhere}section{margin:0 0 12px;break-inside:avoid}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #999;padding-bottom:4px;margin:14px 0 6px}p{margin:0;overflow-wrap:anywhere}@media print{.toolbar{display:none}.resume{max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar como PDF</button><span> · Escolha “Salvar como PDF” no destino da impressão.</span></div><main class="resume"><h1>'+esc(d.name)+'</h1><p class="role">'+esc(d.role)+'</p><p class="contact">'+contact+'</p>'+body+'</main></body></html>');
  popup.document.close();
  status.textContent = 'Currículo pronto em uma página limpa. Na nova janela, clique em “Imprimir / Salvar como PDF”.';
};
form.addEventListener('input', () => { updatePreview(); saveLocally(getData()); });
byId('saveDraft')?.addEventListener('click', saveDraft);
byId('restoreDraft')?.addEventListener('click', restoreDraft);
byId('saveCv')?.addEventListener('click', downloadText);
byId('clearCv')?.addEventListener('click', clearForm);
byId('printCv')?.addEventListener('click', printCv);
byId('copyCv')?.addEventListener('click', async () => {
  const d = getData(), text = [d.name,d.role,[d.email,d.phone,d.city,d.portfolio].filter(Boolean).join(' | '),d.summary,d.experience,d.education,d.skills,d.projects].filter(Boolean).join('\n\n');
  try { await navigator.clipboard.writeText(text); byId('liStatus').textContent = 'Currículo copiado! Agora você pode colar no LinkedIn.'; }
  catch { byId('liStatus').textContent = 'Permissão de cópia indisponível. Copie o texto da prévia manualmente.'; }
});
try {
  const saved = JSON.parse(localStorage.getItem('elasplus_cv') || 'null');
  if (saved) Object.entries(saved).forEach(([key,value]) => { const field = form.elements.namedItem(key); if (field) field.value = value; });
} catch(err) { console.warn('Dados salvos não puderam ser recuperados', err); }
updatePreview();
})()