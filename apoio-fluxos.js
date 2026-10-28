/** Elas+ — encaminhamentos por assunto, sem enviar conversa pela URL.
 * Orientações iniciais, não representam diagnóstico, parecer jurídico ou atendimento de emergência.
 */
export const SUPPORT_FLOWS = Object.freeze({
  urgente: {
    title: 'Primeiro: sua segurança',
    description: 'Se houver perigo imediato, procure um lugar seguro quando possível e ligue 190. O site não aciona serviços automaticamente.',
    actions: [
      { label: 'Ligar 190 · emergência', href: 'tel:190', kind: 'urgent' },
      { label: 'Ligue 180 · orientação', href: 'tel:180' },
      { label: 'Ver delegacias no mapa', href: 'mapa-seguro.html?f=police' }
    ]
  },
  trabalho: {
    title: 'Caminhos para orientação no trabalho',
    description: 'Você pode buscar canais institucionais de confiança e orientação jurídica. Registre informações apenas quando for seguro.',
    actions: [
      { label: 'Defensoria Pública do RJ', href: 'https://www.defensoria.rj.def.br/' },
      { label: 'Encontrar serviços de apoio', href: 'mapa-seguro.html?f=social' },
      { label: 'Acessar serviços públicos', href: 'recursos.html#servicos' }
    ]
  },
  relacionamento: {
    title: 'Apoio e proteção',
    description: 'Considere conversar com uma pessoa de confiança e procurar orientação especializada. Relatos no mapa não substituem serviços oficiais.',
    actions: [
      { label: 'Ligue 180 · orientação', href: 'tel:180' },
      { label: 'Encontrar delegacias', href: 'mapa-seguro.html?f=police' },
      { label: 'Informações oficiais', href: 'https://www.gov.br/mulheres/pt-br/ligue180' }
    ]
  },
  saude: {
    title: 'Atendimento de saúde e acolhimento',
    description: 'Encontre unidades de saúde cadastradas e confirme endereço, horários e serviços antes de sair.',
    actions: [
      { label: 'Buscar unidades de saúde', href: 'mapa-seguro.html?f=health' },
      { label: 'Ver cuidados por fase', href: 'recursos.html#saude' },
      { label: 'Emergência de saúde · 192', href: 'tel:192' }
    ]
  },
  familia: {
    title: 'Apoio para você e sua família',
    description: 'Busque assistência social, creches e outros serviços; a disponibilidade deve ser confirmada com cada instituição.',
    actions: [
      { label: 'Buscar assistência no mapa', href: 'mapa-seguro.html?f=social' },
      { label: 'Buscar creches', href: 'mapa-seguro.html?f=childcare' },
      { label: 'Ver serviços públicos', href: 'recursos.html#servicos' }
    ]
  },
  geral: {
    title: 'Escolha seu próximo passo',
    description: 'Você pode buscar atendimento presencial, consultar os canais oficiais ou continuar a conversa sem informar dados pessoais.',
    actions: [
      { label: 'Buscar serviços próximos', href: 'mapa-seguro.html' },
      { label: 'Ver serviços públicos', href: 'recursos.html#servicos' },
      { label: 'Ligue 180 · orientações', href: 'tel:180' }
    ]
  }
});

export function identifyNeed(input) {
  const s = String(input ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/perigo|socorro|me agred|me bateu|agressao|ameaca|arma|risco imediato|estou sendo seguida|agora.*violencia/.test(s)) return 'urgente';
  if (/assedio.*trabalh|trabalh.*assedio|empreg|chefe|colega.*trabalh|ambiente de trabalho|demissao/.test(s)) return 'trabalho';
  if (/abus|relacionamento|companheir|namor|ex-marido|ex marido|violencia domestica|medida protetiva|protetiv/.test(s)) return 'relacionamento';
  if (/creche|filh|mae solo|maternidade|pediatra|cras|creas|beneficio|mae atipica/.test(s)) return 'familia';
  if (/saude|medic|hospital|ubs|menopausa|climaterio|consulta|gravidez|posto de saude/.test(s)) return 'saude';
  return 'geral';
}

export function nextStepsFor(input) { return SUPPORT_FLOWS[identifyNeed(input)]; }
