# Elas+ — Plataforma integrada (Node.js, sem banco de dados)

**Versão funcional de desenvolvimento local:** tela inicial, Relações e Segurança, Mapa Seguro, serviços, carreira, saúde, comunidade e perfil, com identidade visual da **tela inicial original**, aplicada a todas as páginas, incluindo moderação (menu lateral, logotipo, barra de busca e botões de cabeçalho). Não é um sistema de socorro nem um serviço de atendimento profissional.

## Iniciar no Windows (sem instalar dependências)

**Pré-requisito:** Node.js 20+ instalado e internet para mapas e consultas externas.

1. Extraia o ZIP. Entre na pasta `ElasPlus_Mapa_Participativo`.
2. Clique duas vezes em `INICIAR_ELAS.bat`, **ou** abra o PowerShell nessa pasta e execute:
   ```powershell
   node server.mjs
   ```
3. Abra **http://localhost:8000**. Para encerrar, pressione `Ctrl+C` no terminal.

Não é necessário `npm install`. Alternativamente, `npm start` e `npm test` funcionam. Node atende **somente seu computador** por padrão (`127.0.0.1`).

## Páginas e recursos

| Página | O que funciona |
| --- | --- |
| `/index.html` | Página inicial, busca de áreas, atalhos, progresso local, aparência e acesso a todas as seções. |
| `/seguranca.html` | Guia local de orientação, opção de IA externa com consentimento, SOS como atalhos oficiais, Mapa Seguro, busca, filtros, geolocalização voluntária, seleção de região por clique e formulário de relatos. |
| `/recursos.html#servicos` | Links para canais públicos e acesso aos filtros de unidades próximas. |
| `/recursos.html#carreira` | Editor de currículo com visualização instantânea, salvamento opcional neste navegador e impressão/exportação PDF via diálogo do navegador. |
| `/recursos.html#saude` | Conteúdos informativos selecionáveis, rotas para unidades de saúde. |
| `/recursos.html#comunidade` | Consulta pública dos relatos aprovados pela moderação. |
| `/recursos.html#perfil` | Nome de exibição, temas de interesse, fonte, cores, contraste e limpeza dos dados locais. |
| `/moderacao.html` | Painel da moderação com token local: aprovar ou rejeitar registros antes de publicação. |

### Onde ficam os dados (sem banco)

- As preferências de interface, o nome e **currículo salvo por decisão da pessoa** ficam no `localStorage` do navegador, não são enviados ao servidor.
- Conversas do **guia local** não são armazenadas pelo servidor.
- Relatos enviados são guardados em **`storage/reports.json`**, um arquivo JSON do computador que executa o Node. As coordenadas são reduzidas para duas casas decimais (~1 km) **antes de gravar** e os relatos ficam pendentes até aprovação manual.
- O servidor não coleta dados de identificação para contribuições. O sistema rejeita padrões comuns de telefone, link e e-mail, mas **não detecta todos os dados pessoais**: é necessária moderação humana.
- Para apagar contribuições do servidor, o administrador precisa editar/remover as entradas do JSON, ou excluir o arquivo quando o servidor estiver parado. Não publique esse diretório.

### Mapa Seguro participativo — experiências positivas e pontos de atenção

Na aba **Relações e Segurança → Mapa Seguro**, a usuária pode:

1. Escolher **“✓ Marcar experiência positiva”** (por exemplo, atendimento acolhedor, iluminação adequada e ponto de apoio) ou **“! Sinalizar ponto de atenção”** (por exemplo, iluminação ruim, barreira de acessibilidade, dificuldade em atendimento e assédio na região).
2. Selecionar a categoria, escrever uma descrição breve e **escolher um ponto tocando no mapa**. O formulário deixa claro que a posição salva será aproximada.
3. Enviar para revisão; a contribuição fica pendente, não aparece imediatamente para outras usuárias.
4. Após aprovação por um moderador, os marcadores **verdes** representam experiências positivas, os **laranjas** representam pontos de atenção e os registros antigos permanecem neutros. Os filtros permitem encontrar cada tipo, com totais da região visível.
5. Arrastar o mapa e clicar em **“Buscar serviços nesta área”** para atualizar a lista de serviços da região desejada.

**Importante:** marcas são experiências pessoais moderadas, não atestados oficiais de segurança, verificação de crimes ou classificação definitiva de ruas. Evite afirmar que um endereço é totalmente seguro, especialmente em emergências. As coordenadas são arredondadas antes do armazenamento, e o mapa não coleta automaticamente identidades nem endereços exatos dos autores.

### Como aprovar contribuições

1. Na primeira execução, o servidor cria **`storage/moderator-token.txt`**, com uma senha aleatória de uso local, legível no computador. Não a compartilhe.
2. Acesse **http://localhost:8000/moderacao.html**.
3. No computador, leia a senha: no PowerShell, `Get-Content .\storage\moderator-token.txt`.
4. Informe a senha e analise os relatos. **Só os aprovados** aparecem no mapa e na Comunidade.
5. Também pode definir a variável `ELAS_ADMIN_TOKEN` no ambiente (mínimo de 16 caracteres), em vez da senha gerada. Reinicie o servidor ao trocar a configuração.

**Importante:** não disponibilize este servidor publicamente sem HTTPS, autenticação real para moderadores, monitoramento, revisão LGPD e mecanismos de prevenção de abuso.

### Mapas e serviços reais

O Node é intermediário para consultas de município/bairro ao **Nominatim** e locais cadastrados no **OpenStreetMap/Overpass**. A interface mostra apenas resultados recebidos, sem inventar endereços, vagas de creche, preços ou horários. Os dados podem estar desatualizados ou incompletos.

- O servidor aplica cache (geocodificação: 24 h; pontos: 30 min), controle básico por IP e **no máximo uma consulta Nominatim por vez, com intervalo mínimo de 1,2 s**.
- A pesquisa é executada a pedido da usuária, sem autocomplete automático. A consulta de pontos da área usa uma região aproximada, por eficiência; nenhuma localização GPS é coletada sem autorização.
- O mapa requer conexão para a biblioteca Leaflet, os blocos do OpenStreetMap e os dados externos.
- Fontes públicas gratuitas têm limites e podem falhar; para operação com público relevante, contrate ou hospede serviços adequados e configure termos de uso.
- Fonte de mapas e dados: OpenStreetMap (ODbL), com atribuição na interface. Políticas: https://operations.osmfoundation.org/policies/nominatim/ e https://wiki.openstreetmap.org/wiki/Overpass_API.

### IA verdadeira (opcional)

Sem chave, o chat apresenta **orientações locais predefinidas**. Para conectar o Gemini, escolha um modelo ao qual sua própria conta tenha acesso e configure **somente no servidor**:

```powershell
$env:GEMINI_API_KEY="SUA_CHAVE_DO_GOOGLE_AI_STUDIO"
$env:GEMINI_MODEL="UM_MODELO_DISPONIVEL_NA_SUA_CONTA"
node server.mjs
```

Ao habilitar, o chat revela a opção de **consentimento por mensagem**: só envia o texto ao serviço externo quando a usuária marcar. A plataforma não mantém histórico dessas mensagens no arquivo JSON. O provedor externo tem suas próprias políticas de processamento e retenção, que devem ser avaliadas antes de uma implantação real.

### Emergência e recursos ainda não integrados

- **190**: encaminhamento para ligação pelo próprio aparelho, quando suportado; **180**: orientação/denúncias por canais oficiais. **O Elas+ não chama a polícia, não grava áudio, não monitora comando por voz e não manda SMS automaticamente.**
- Os contatos confiáveis permanecem apenas na memória da aba e podem abrir o app de SMS com texto preparado, para envio manual. A **saída rápida** abre outra página, mas **não apaga histórico**.
- Não há login real, chat comunitário aberto, chat clínico, verificação oficial de horários, vagas, preços ou serviço de emergência garantido.
- O portal roda localmente como MVP funcional. Antes de lançar ao público: HTTPS, controles de autenticação, auditoria de privacidade, backups, moderação estruturada, legislação aplicável e revisão por especialistas.

## Arquivos principais

```
ElasPlus_Mapa_Participativo/
  index.html, app.js, styles.css
  seguranca.html, seguranca.js, seguranca.css
  recursos.html, recursos.js, recursos.css
  unificado.css, design-system.css
  site-shell.css, site-shell.js
  moderacao.html, moderacao.js
  server.mjs
  storage/reports.json                 (gerado/atualizado localmente)
  storage/moderator-token.txt          (gerado automaticamente no primeiro start, NÃO compartilhe)
  assets/*.webp
  tests/server.test.mjs
  INICIAR_ELAS.bat
```

## Testes

`npm test` roda testes automatizados de APIs, arquivos protegidos, busca por fonte simulada, criação de relatos e aprovação com token. Testes com serviços externos de produção exigem internet e suas condições de uso. Essas verificações **não equivalem a uma auditoria de segurança ou acessibilidade**.

## Identidade visual — referência oficial

A página `index.html` é a referência de design. Em `seguranca.html` e `recursos.html`, a navegação lateral, marca e barra superior usam a **mesma estrutura de `index.html`**, complementada por `site-shell.css` e `site-shell.js`. Os módulos internos podem ter cartões específicos para suas necessidades, mas não devem criar outro menu, logotipo ou cabeçalho.

A busca das páginas internas permite navegar para áreas e serviços realmente implementados. O Mapa Seguro continua dependente de dados externos e internet; registros continuam pendentes de aprovação.

Os testes automáticos verificam APIs e também a consistência do cabeçalho/menu entre páginas.


## Design unificado (esta entrega)

Todas as telas (`index.html`, `seguranca.html`, `recursos.html`, `moderacao.html`) utilizam o mesmo logotipo, navegação lateral, barra de pesquisa, cabeçalho, cores, tipografia, cartões e espaçamentos da tela inicial. A folha `design-system.css` centraliza as regras compartilhadas, preservando as interações das áreas internas. Foram verificadas visualmente em desktop e celular.


## Páginas separadas (atualização)

- `seguranca.html`: Assistente Elas+ e plano de segurança. Não carrega nem exibe o mapa.
- `mapa-seguro.html`: Mapa Seguro com busca de serviços, filtros, pontos de atenção e experiências positivas, registro e moderação. Não exibe chat.
- A opção **Mapa Participativo** foi retirada. O nome oficial para a ferramenta é **Mapa Seguro**.
- A página inicial continua como referência visual para o menu, cabeçalho, cores e componentes.
- Execute `node server.mjs` (ou `INICIAR_ELAS.bat`) e acesse `http://localhost:8000`.
- Serviços externos precisam de internet; IA real necessita de chave e consentimento. O SOS não envia mensagens automaticamente.
