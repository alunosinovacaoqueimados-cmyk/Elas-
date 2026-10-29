# Auditoria de produto — Mapa Seguro e Conta Elas+

Data: 28/10/2026 · Projeto: Elas+ · Escopo: Mapa Seguro, autenticação e integração de navegação.

## 1. Diagnóstico de produto

O Elas+ atende a pessoas potencialmente vulneráveis; **não** deve sugerir segurança garantida por marcadores ou por relatos comunitários. A navegação precisa dar acesso rápido a ajuda oficial e não coletar localização sem ação explícita da usuária.

### Mapa Seguro

| Prioridade | Encontrado | Tratamento |
|---|---|---|
| Alta | Mapa estava abaixo de banner, cinco atalhos e vários blocos antes do serviço principal | Cabeçalho compacto e serviços imediatamente visíveis |
| Crítica | `/api/locais` de produção retornou HTTP 503 em busca de delegacias | Instâncias Overpass atualizadas e consultadas em paralelo; **ainda não há confirmação de recuperação**. Link externo ao OpenStreetMap, Google Maps e botão de nova tentativa |
| Alta | A página exibia ações de relatórios e marcações apesar de `/api/status` retornar `contributionsEnabled: false` | Relatos desativados por padrão; só aparecem após confirmação do backend de persistência e moderação |
| Alta | A linguagem podia ser interpretada como selo de segurança de bairros e locais | Mensagem inequívoca: dados colaborativos, não garantem segurança e exigem confirmação |
| Média | Filtros e ferramentas disputavam espaço vertical | Faixa horizontal de categorias, busca da região em evidência, raio e nome como refinamentos |
| Alta | Falhas de API deixavam a usuária sem caminho útil | Estado de erro com fontes externas, órgãos públicos, Ligue 180 e retry |
| Média | Mapa não distinguiu de forma forte a posição padrão do usuário | Posição padrão é Queimados/RJ, sem inferência de localização; localização real requer clique + consentimento |
| Alta | Não há base persistente para marcações na Vercel | Não prometer comunidade ativa; manter publicação bloqueada até autenticação, banco, RLS, fila e moderadores |

**Testes efetuados:** GET `/api/status` na produção: HTTP 200, `contributionsEnabled=false`. GET `/api/buscar?q=Queimados,RJ` em prévia: HTTP 200 com localizações reais. GET `/api/locais` em produção e em prévia depois da primeira troca de instâncias: HTTP 503. **Não declarar a pesquisa de estabelecimentos resolvida sem um teste HTTP 200 com registros reais da região.**

### Login

| Prioridade | Encontrado | Tratamento |
|---|---|---|
| Alta | Visual sem a mesma tipografia, logo e escala da Home | Redesign da identidade Elas+, responsivo |
| Alta | Home e áreas internas não confirmavam de forma integrada a sessão do Login | `auth-shell.js` verifica a conta via Supabase `/auth/v1/user` e atualiza o cabeçalho |
| Alta | Dados de sessão exibidos com base em tokens armazenados, sem exigir confirmação inicial do backend | `auth.js` exige validação remota do usuário após autenticação e restauração |
| Alta | Recuperação de senha tinha dois listeners `submit` acoplados, com captura de evento | Máquina de estados única: entrar, criar conta, solicitar recuperação e trocar senha |
| Alta | Link de recuperação pode conter tokens na URL | Remover fragmento/parâmetros com `history.replaceState` antes de processar a troca; nenhum token inserido em links externos |
| Média | Sessão persistia indefinidamente no navegador sem escolha explícita na UI | `sessionStorage` por padrão e `localStorage` apenas com opção `Permanecer conectada` |
| Média | Falta tratamento de expiração de sessão e rede offline | Refresh token quando necessário e erros amigáveis, sem tratar indisponibilidade de rede como exclusão obrigatória |
| Média | Login parecia requisito para serviços | Acesso a mapa e informações continua público e convidativo, sem cadastro obrigatório |
| Alta | Erros de SMTP, redirect e configuração externos ao código podem bloquear confirmação de e-mail | **Pendente:** teste ponta a ponta no Supabase sem usar credenciais compartilhadas |

**Configuração verificada:** projeto Supabase `lfaawihslefpimqxfowa` responde `ACTIVE_HEALTHY`. Nenhuma tabela de aplicação encontrada no schema `public` durante esta auditoria. Isso significa que **não existe ainda perfil, histórico ou relatos persistidos no banco da aplicação**, independentemente de o login emitir sessão.

## 2. Critérios de aprovação para lançar como produto

### Mapa — bloqueadores
1. Confirmar `GET /api/locais` retornando dados com a localização padrão e ao menos 1 categoria, sem endpoint instável.
2. Garantir disponibilidade de fonte de dados compatível com uso em produção; Overpass público tem limites operacionais e pode ficar indisponível. Considerar fornecedor com SLA/cota contratada para lançamento maior.
3. Não publicar relatos sem autenticação de acesso, regras RLS, consentimento, retenção mínima, denúncias, moderação e revisão de exposição de locais sensíveis.
4. Testar geolocalização negada, mapa sem Leaflet e navegação por teclado.

### Login — bloqueadores
1. Validar em contas de teste com autorização: cadastro, confirmação de e-mail, login, restauração, sair e recuperação de senha.
2. Conferir allowlist de redirects no Supabase: domínio principal do Elas+ e URLs de prévia apenas quando estritamente necessário.
3. Conferir rate limits, configuração de entrega de e-mail e políticas de senha.
4. Implementar políticas de acesso aos dados antes de oferecer perfil pessoal persistente. Login **não é** equivalente a uma área de conta com dados protegidos.

### Design e acessibilidade
- Conferir tamanhos 320, 375, 390, 768, 1024 e 1440 px em navegadores reais.
- Testar menu mobile, escopo de foco nos modais, contraste, teclados, leitores de tela e zoom 200%.
- Validar uso do site com rede lenta, API externa 503 e scripts externos bloqueados.
- Não divulgar recursos em desenvolvimento como se estivessem operacionais.

## 3. Arquitetura sugerida para etapa seguinte

- **Mapa**: catálogo de serviços com fonte e data de atualização → camada de cache/monitoramento → frontend Leaflet; status da fonte visível e opção de pesquisa externa.
- **Relatos**: autenticação → dados mínimos → coordenadas aproximadas no servidor → fila privada → revisão manual → apenas versões aprovadas publicadas. Não coletar relatos de emergência nem identificação de terceiros.
- **Conta**: Supabase Auth → verificação de sessão → políticas RLS por `auth.uid()` → área de preferências com exclusão e exportação. Minimizar dados pessoais.
- **Observabilidade**: métricas agregadas de sucesso/erro de API sem registrar coordenadas precisas ou dados de sessão; alertas de falha por rota.

## 4. Evidências e limites desta revisão

- Alterações implementadas no código do repositório: novas páginas e estilos de login; lógica de autenticação; sessão compartilhada nas páginas; reordenação do Mapa; fallback em indisponibilidade; proteção de relatos desativados.
- Testes de sintaxe, referências DOM, espelhos raiz/`public` e novos testes Node foram preparados.
- **Não houve neste documento** validação visual por screenshot real nem teste real de conta de usuário com credenciais; essas etapas são critérios pendentes.
- A versão de produção só deve ser declarada atualizada após novo deploy `READY` do commit final e checagem de rota.
