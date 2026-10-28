# Auditoria de interface — Elas+ Oportunidades
**Data:** 28/10/2026  
**Escopo:** `vagas-mulheres.html`, `vagas-mulheres.css`, `vagas-mulheres.js`, navegação compartilhada, chamada na área de Carreira e espelhos em `public/`.

## Diagnóstico anterior
| Gravidade | Constatação | Resolução nesta revisão |
|---|---|---|
| Alta | Página de vagas tinha cabeçalho, tipografia, paleta e espaçamentos independentes do restante do Elas+. | Reuso da barra superior, menu lateral, sprites SVG, estilos base e identidade do Elas+. |
| Alta | Filtros extensos ocupavam demais a viewport em telas pequenas. | Busca principal destacada; filtros avançados com divulgação progressiva no celular. |
| Alta | Duas áreas concorrentes de vagas na seção Carreira (formulário LinkedIn e cartão da central). | Unificação em uma única chamada de ação responsiva. |
| Alta | Catálogo vazio parecia falha de funcionamento e não oferecia próxima ação clara. | Estados explícitos para carregamento, vazio, sem correspondência, favoritos e falha; link externo identificado. |
| Média | Cartões genéricos e desequilibrados. | Grade adaptativa, metadados estruturados, rótulos, origem, link da fonte, candidatura e favoritos. |
| Média | Menu mobile e navegação entre páginas sem comportamento consistente. | Mesmo menu do sistema; overlay, Escape, foco por teclado e estado ativo de Carreira. |
| Média | Busca global do site não abria diretamente a Central de Vagas. | Destino de busca integrado ao `site-shell.js`; atalho da home corrigido. |
| Média | Estilos `style` inline dificultavam manutenção do layout. | Estilos específicos isolados em `vagas-mulheres.css`. |
| Média | Anúncios de leitores de tela redundantes e falta de foco após a busca. | Status em `aria-live` no contador e foco no título dos resultados após envio. |

## Estrutura visual final
- Identidade compartilhada: menu, cabeçalho, logo, buscador global, saída rápida, fontes e componentes de cor.
- Banner integrado com arte já usada na plataforma, título curto e contextualização.
- Área principal com busca por profissão e região, filtros avançados, resultados e favoritos.
- Área de apoio com currículo, pesquisas externas claramente identificadas e critérios de classificação.
- Sem dois formulários externos duplicados na área de Carreira.
- CSS isolado com pontos de quebra em 1240, 1130, 930, 760, 590 e 360 px; até 590 px, cards e campos passam a uma coluna.

## Regras de integridade funcional
- O catálogo continua inicialmente vazio (`vagas-catalogo.json`), para não exibir vagas fictícias.
- Uma vaga cadastrada só é listada se tiver identificador, título, empresa, fonte, links HTTPS, data de registro e data futura de encerramento.
- Categorias: vaga geral, afirmativa para mulheres e programa de diversidade; a classificação deve ser conferida editorialmente contra a fonte original.
- Filtros processam registros locais; buscas no LinkedIn são uma opção externa separada.
- Favoritos ficam no armazenamento do navegador, sem cadastro ou senha do LinkedIn.
- Dados de vagas são apresentados via `textContent`, sem HTML externo inserido na página.

## Auditoria estática
- Comparação de arquivos equivalentes em raiz e `public/`.
- Verificação de identificadores HTML duplicados, destinos de `label for`, controles necessários e recursos CSS/JS esperados.
- Compilação sintática do JavaScript e verificação de catálogo JSON.
- Inspeção das regras de responsividade, hierarquia visual e ativação de links internos.

## Pendências não resolvidas pelo redesign
1. **Catálogo real:** integrar fontes autorizadas e processo de curadoria de vagas; sem isso, não há anúncios próprios disponíveis.
2. **QA visual real:** testar em navegadores e dispositivos nas larguras 320, 375, 590, 768, 1024 e 1440 px. Esta auditoria é de código; não corresponde a teste visual em navegador.
3. **Testes funcionais ponta a ponta:** verificar navegação, favoritos, teclado, link externo, estados de erro e publicação real em hospedagem.
4. **Validação editorial:** confirmar com o anúncio original antes de classificar qualquer oferta como afirmativa ou direcionada a mulheres.
5. **Integração de backend:** catalogação e atualização automática confiáveis ainda não existem.

## Roteiro de teste manual
- [ ] 320 e 375 px: sem rolagem horizontal, campos e botões completos, filtros avançados recolhidos.
- [ ] 590 e 768 px: cards e painéis reorganizados sem sobreposição.
- [ ] 1024 e 1440 px: alinhamento, espaço lateral, leitura de títulos e cartões.
- [ ] Menu lateral: abrir, fechar, Escape, Tab e Shift+Tab com foco visível.
- [ ] Busca global: digitar 'vagas' e abrir Central de Vagas.
- [ ] Carreira: confirmar uma única chamada para oportunidades.
- [ ] Filtros: alterar, limpar, alternar entre todas e favoritas.
- [ ] Catálogo vazio: exibir mensagem clara e CTA de busca externa.
- [ ] Fonte e candidatura: links HTTPS externos e sem acesso a credenciais.
- [ ] Saída rápida: verificar clique e atalho Alt+X.
- [ ] Navegadores Chrome, Firefox e Safari, caso disponíveis.
- [ ] Hospedagem: verificar deploy e caminhos relativos em produção.
