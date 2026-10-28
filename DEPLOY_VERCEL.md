# Publicar o Elas+ na Vercel (sem banco de dados)

## O que foi ajustado

- `public/` reúne as páginas e os recursos estáticos, mantendo **exatamente** o design original.
- `api/` contém rotas Vercel Functions individuais, compartilhando a implementação de `server.mjs`. Não dependem de rewrites.
- `server.mjs` ainda inicia normalmente com `npm start` na máquina local e agora exporta um handler HTTP para a Vercel.
- A inicialização em Vercel não escreve arquivos no disco. A API de pesquisas e o assistente opcional continuam disponíveis.

**Limitação importante**: na Vercel, sem banco de dados ou outro armazenamento persistente, não é possível guardar/compartilhar relatos entre usuárias com segurança. Por isso, o envio e a moderação de relatos ficam bloqueados no deploy público e informam o motivo. No servidor local, continuam operando nos arquivos JSON, com moderação. Nenhum relato é publicado ou perdido silenciosamente.

## Envio ao GitHub

No PowerShell, dentro da pasta original `ElasPlus_Mapa_Assistente_Separados`, copie **todos os arquivos desta pasta corrigida** (incluindo `public`, `api` e `vercel.json`), substituindo os existentes, e rode:

```powershell
git status
git add .
git commit -m "fix: preparar Elas+ para Vercel sem alterar design"
git push origin main
```

## Importação na Vercel

1. Acesse `vercel.com/new` e importe `alunosinovacaoqueimados-cmyk/Elas-` (autorize esta conta na integração GitHub da Vercel se necessário).
2. **Root Directory**: `./` (raiz do repositório).
3. **Framework Preset**: `Other`. Não defina manualmente `Output Directory` nem comando de build (deixe vazio).
4. Deploy. Teste `/`, `/seguranca.html`, `/mapa-seguro.html` e `/api/status`.
5. Opcional: configure `GEMINI_API_KEY` na Vercel em `Settings → Environment Variables` para ativar a IA remota após consentimento. Nunca coloque essa chave no GitHub.

### Verificar com Node local

```powershell
npm test
npm start
```

`http://localhost:8000` abre o site; o comportamento local de relatórios em JSON permanece disponível. A versão hospedada **não** é um sistema de alerta a emergências nem realiza envio automático de SMS.

## Notas de segurança

- Contatos pessoais não são publicados no mapa.
- Chaves de moderação e arquivos JSON de relatos não devem ir para o GitHub.
- Antes de abrir marcações públicas em produção, implemente armazenamento persistente com autenticação e revisão de segurança/LGPD.
