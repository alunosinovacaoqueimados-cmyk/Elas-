# PR — Percurso de atendimento Elas+ para apresentação na UFRRJ

## Objetivo

Dar ao protótipo um **fluxo que resolve uma necessidade real**: a usuária descreve uma situação, recebe opções de encaminhamento e chega a serviços próximos com maneiras práticas de contato, mantendo a identidade visual da página inicial.

## Entregas

- Encaminhamentos contextuais no Assistente Elas+ com ações de ligação, acesso a serviços e filtros do Mapa Seguro, sem copiar mensagens pessoais para URLs ou salvar conversas.
- Detalhes de estabelecimento com categoria, endereço quando existir, telefone disponível, **Como chegar** e página no OpenStreetMap.
- Alternativas oficiais quando o mapa ou as consultas externas estiverem indisponíveis.
- Testes para classificação, links permitidos, privacidade e sincronização do HTML/CSS/JS local com `public/`.
- Mantém o layout/identidade visual original, sem dependências NPM extras nem banco de dados.

## Segurança e limites

- Informações de locais vêm do OpenStreetMap e devem ser verificadas pela usuária; não inventar serviço, disponibilidade ou segurança absoluta.
- Nenhum recurso de contato automático com polícia, SMS ou escuta contínua foi criado.
- O encaminhamento por temas usa regras locais e não substitui profissionais.
- Em nuvem, a publicação de relatos permanece desativada até existir armazenamento persistente com controle de acesso e moderação.

## Validação

```bash
npm test
npm start
```

Testar visualmente:
1. `seguranca.html`: clicar em “Sofri assédio no trabalho” e conferir links de apoio.
2. `seguranca.html`: perguntar “Preciso de uma creche” e abrir o mapa filtrado.
3. `mapa-seguro.html`: buscar Queimados, RJ, selecionar serviço real, abrir “Como chegar”.
4. Simular indisponibilidade da API de locais, validar painel com serviços oficiais.
5. Testar em celular, navegação por teclado e saída rápida.

**Não utilizar a demonstração como serviço real de emergência.**
