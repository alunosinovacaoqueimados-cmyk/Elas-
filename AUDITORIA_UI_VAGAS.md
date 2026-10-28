# Auditoria — design, responsividade e integração do Elas+ Oportunidades

**Data:** 28/10/2026  
**Escopo:** Central de Vagas para Mulheres, integração com Carreira, barra lateral, busca global, filtros, acessibilidade e versões raiz/`public`.

## Diagnóstico e status
| Prioridade | Avaliação | Resultado |
|---|---|---|
| Alta | A versão inicial de vagas tinha uma identidade visual separada da marca Elas+. | **Corrigido no redesign existente na main:** a página agora utiliza `styles.css`, `site-shell.css`, `design-system.css` e o mesmo menu/cabeçalho das outras páginas. |
| Alta | Filtros e resultados competiam por espaço, em especial no celular. | **Corrigido no redesign existente:** coluna de filtros e resultados em desktop; grids adaptáveis, filtros avançados recolhidos em telas pequenas. |
| Alta | Dupla entrada/links repetidos na área de Carreira. | **Corrigido no redesign existente:** banner único que abre a central. |
| Média | Menu lateral tinha dois itens marcados como ativos no HTML (Carreira e Serviços Públicos). | **Corrigido nesta auditoria:** apenas Carreira inicia com destaque. |
| Média | Trecho com estilo inline não reutilizável no CTA externo. | **Corrigido:** classe `jobs-external-cta` no CSS. |
| Média | Não havia um acesso contextual ao criador de currículo na página de vagas. | **Corrigido:** atalho de currículo alinhado à faixa de contexto; quebra responsiva no celular. |
| Média | Filtros automáticos poderiam parecer inativos sem um botão de busca. | **Corrigido:** aviso de que resultados são atualizados automaticamente. |
| Alta | Filtros de experiência enviados ao LinkedIn usavam categorias que não correspondem necessariamente às categorias do Elas+. | **Corrigido:** filtro externo usa termo e localidade; os demais filtros se aplicam exclusivamente ao catálogo interno. |
| Média | Catálogo com formato incorreto era mostrado como vazio; IDs de vagas duplicados podiam repetir anúncios. | **Corrigido:** JSON não-array gera erro de carregamento e registros repetidos são omitidos. |
| Alta | Classificação afirmativa sem categoria explícita poderia ser apresentada como vaga geral. | **Corrigido:** registros precisam de categoria válida. A verificação editorial de anúncios futuros continua necessária. |
| Média | A página não refletia preferências salvas de fonte, tema, contraste e dislexia. | **Corrigido:** aplica preferências já existentes no Elas+. |

## Comportamento visual e de navegação
- Identidade do Elas+ preservada: menu lateral, logotipo, cabeçalho, pesquisa, banner com imagem institucional, tipografia e cores compartilhadas.
- Página centralizada com largura limitada, filtro lateral e resultados em desktop.
- Nas larguras menores, filtros passam acima dos resultados; abaixo de 620 px, cartões e áreas secundárias ficam em uma coluna.
- Os ajustes de responsividade relevantes no CSS aparecem em 1150, 850, 760, 620 e 380 px.
- Menu móvel possui fundo de sobreposição, bloqueio de rolagem, Escape e navegação de foco.
- Resultados exibem carregamento, erro, lista vazia, busca sem correspondências e favoritos.
- Pesquisa externa claramente identificada como não verificada pelo Elas+.

## Integridade e limites do produto
- O catálogo `vagas-catalogo.json` continua vazio. **Não existem anúncios reais cadastrados nesta versão.**
- Um registro exige título, empresa, fonte, URLs HTTPS, datas válidas e categoria declarada.
- O frontend não confirma por conta própria que um anúncio é afirmativo; isso depende de curadoria e confirmação da fonte.
- A página não coleta senha do LinkedIn e não usa uma chave de API privada no navegador.
- Dados externos são renderizados como texto, sem injeção de marcação HTML.
- Favoritos são locais ao navegador.

## Verificações de código
- JS compilável sintaticamente, CSS com blocos equilibrados e HTML com IDs únicos.
- `label for` aponta para controles existentes.
- Arquivos equivalentes da raiz e de `public/` sincronizados.
- Links internos e integração com área de Carreira e busca global identificados.
- Catálogo JSON válido.

## Testes visuais e funcionais pendentes
A auditoria foi realizada sobre o repositório. **Não houve execução em um navegador nem captura de telas de diferentes dispositivos**; a verificação visual definitiva ainda depende de testes reais. Antes de declarar a funcionalidade pronta:
- [ ] Conferir viewport de 320, 375, 620, 768, 1024 e 1440 px em navegador.
- [ ] Garantir ausência de rolagem horizontal e sobreposição de botões no celular.
- [ ] Validar abertura/fechamento do menu, Escape, Tab e Shift+Tab.
- [ ] Testar busca, filtros, limpeza, abas e favoritos com registros autorizados de teste.
- [ ] Verificar links externos, foco do teclado, leitores de tela e saída rápida.
- [ ] Validar publicação e cache da página em produção.
- [ ] Conectar fonte autorizada de vagas reais, com atualização e expiração dos anúncios.

## Conclusão
A interface foi unificada e o código revisado sem desfazer o redesign recentemente incluído no repositório. O principal risco remanescente não é de layout: **sem catálogo de vagas reais e validação editorial, ainda não é um produto pronto para lançamento público como portal de empregos.**
