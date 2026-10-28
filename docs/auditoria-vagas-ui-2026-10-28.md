# Auditoria de UI/UX e responsividade — Elas+ Oportunidades
**Data:** 28/10/2026  
**Escopo:** página `vagas-mulheres.html`, estilos, interações e fluxo a partir de Carreira / home.  
**Método:** leitura do código, comparação com o design system do Elas+, inspeção estática de estrutura, sintaxe e referências. **Ainda não é um laudo de teste visual em navegadores reais.**

## Diagnóstico e ações implementadas

| ID | Gravidade | Constatação | Correção |
| --- | --- | --- | --- |
| UI-01 | Alta | Página anterior parecia site separado: não usava sidebar, topo e linguagem visual da home | Página reconstruída com a estrutura de navegação e design system do Elas+ |
| UI-02 | Alta | Resultado vazio podia ocupar apenas metade do grid | Estado vazio passou a ocupar toda a largura disponível |
| UI-03 | Alta | Área Carreira tinha formulário LinkedIn e card da central separados, duplicando a entrada | Fluxo consolidado em um banner responsivo para a central |
| UI-04 | Alta | Layout anterior tinha filtros extensos e pouco hierarquizados | Busca principal, filtros avançados, barra de resultados e abas com hierarquia clara |
| UI-05 | Média | Vários pontos de entrada levavam a páginas distintas | Atalho da home e busca global agora levam à central |
| UI-06 | Média | Sidebar mobile da página nova não tinha comportamento compartilhado garantido | Botão mobile, backdrop, Escape, foco por Tab e fechamento ao ampliar tela |
| UI-07 | Média | Botão de saída rápida perderia rótulo visual no celular | Rótulo acessível explícito e atalho Alt+X implementados |
| UI-08 | Média | Resultados seriam anunciados em duplicidade por leitores de tela | Contagem com aria-live; listagem sem anúncio duplicado |
| UI-09 | Alta | Exclusão dos dados locais do perfil não removia favoritos de vagas | Favoritos incluídos na ação de exclusão e na descrição ao usuário |
| UI-10 | Média | Fonte original não era clicável nos cartões de vaga | Link visível para consultar a origem do anúncio |
| UI-11 | Média | Regras de layout desktop ignoravam tablet e celulares menores | Breakpoints específicos: 1150, 850, 760, 620 e 380 pixels |
| UI-12 | Alta | Ainda não existe catálogo com anúncios reais autorizados | **Pendente:** `vagas-catalogo.json` permanece vazio; não inserir registros fictícios |

## Verificações estáticas concluídas
- Arquivos raiz e `public/` comparados: **sem divergências**.
- JavaScript da central, recursos, home e busca global: **sintaxe compilável**.
- IDs duplicados: **nenhum**.
- Referências de rótulos ARIA e `label for` não resolvidas: **nenhuma**.
- Ícones SVG usados sem definição: **nenhum**.
- Chaves CSS: **balanceadas**.
- Criação de cartões via `textContent`, sem uso de `innerHTML` em dados externos.
- Links externos de candidatura requerem HTTPS e usam `noopener noreferrer`.
- Registros expirados não entram no catálogo; não há vagas simuladas.
- Abas de todas/salvas e filtros mantidos.

## Pendências antes de declarar a interface aprovada em produção

1. Testar visualmente em navegador real em larguras 320px, 375px, 390px, 768px, 1024px e 1440px, verificando rolagem horizontal, sobreposições, foco e visual da hero.
2. Validar os fluxos com dados reais autorizados: preenchimento, filtro, data, selo afirmativo e favoritos.
3. Testar carregamento sob conexão lenta, falha de catálogo, sem JavaScript, navegação por teclado e leitores de tela.
4. Integrar uma fonte autorizada de anúncios de vagas e definir um processo de validação de afirmações de recrutamento exclusivo/afirmativo.
5. Validar publicação e cache na hospedagem; a alteração no GitHub não confirma deploy.

## Critério de produto

Não divulgar a funcionalidade como \"portal completo de vagas ativas\" enquanto o catálogo estiver vazio. No estado atual, trata-se de uma central de oportunidades com estrutura de catálogo e pesquisa complementar em plataforma externa.
