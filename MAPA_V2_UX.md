# Elas+ — Mapa Seguro: busca de estabelecimentos (v2)

## O que mudou

- Categorias diretas: farmácias, lojas/mercados, delegacias, saúde, alimentação, assistência, creches, bancos e outros serviços, além dos relatos moderados.
- Pesquisa por bairro ou cidade; opção de localização do navegador apenas com autorização.
- Pesquisa por nome na listagem e limite de 1, 3 ou 5 km ao redor do local **consultado**.
- Resultados ordenados por proximidade, opção de ver mais, abrir no mapa, ligar (se houver telefone) e traçar rota.
- Botões de relato positivo/ponto de atenção continuam separados dos resultados de estabelecimentos; tocar no mapa sem selecionar "contribuir" não inicia uma marcação.
- HTML, CSS e JS espelhados em `public/` para a Vercel; visual da página inicial preservado.

## Fontes e limitações

- Os estabelecimentos são consultados na API Overpass do **OpenStreetMap** por meio do servidor Node/Vercel, sem dados inventados.
- As coordenadas e distâncias são aproximadas (distância em linha reta, **não** tempo de trajeto). A lista pode estar incompleta e telefones/horários não são garantidos.
- APIs públicas têm indisponibilidades e limites de uso; a consulta possui cache temporário, controle de taxa e máximo de resultados por requisição. Não há garantia de cobertura total nem avaliação de segurança de um estabelecimento.
- Os relatos participativos continuam sujeitos a moderação. Na Vercel, sem armazenamento persistente, as contribuições estão desabilitadas; não aparecem como se estivessem publicadas.
- O projeto não aciona automaticamente polícia, contatos de emergência ou SMS.

## Como testar

```powershell
npm test
npm start
```

Abra `http://localhost:8000/mapa-seguro.html`. Busque por “Queimados, RJ”, escolha “Farmácias” ou “Lojas e mercados” e abra um local para ver rota/contato quando disponível. Depois tente ampliar de 1 para 5 km e buscar pelo nome. É necessária conexão para mapa e pontos reais.

## Antes de publicar

Verifique o consumo e as condições dos serviços OpenStreetMap/Overpass e considere provedor de mapas adequado ao tráfego esperado. Teste em celulares reais e confirme os endereços institucionais mais relevantes antes de apresentar como serviço de apoio.
