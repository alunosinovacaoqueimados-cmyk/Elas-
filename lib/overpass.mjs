/* Consulta resiliente a OpenStreetMap Overpass.
 * Instâncias públicas documentadas: use cache e mantenha tráfego moderado.
 * Com a variável OVERPASS_URL, testes locais usam um único servidor HTTP mockado.
 */
export const PUBLIC_INSTANCES=Object.freeze([
  {url:'https://maps.mail.ru/osm/tools/overpass/api/interpreter',method:'GET'},
  {url:'https://overpass.private.coffee/api/interpreter',method:'POST'},
  {url:'https://overpass-api.de/api/interpreter',method:'POST'}
]);

export async function queryOverpass(query,{endpointOverride,transport,timeout=14500,instances=PUBLIC_INSTANCES}={}){
  if(typeof transport!=='function')throw new TypeError('Transport obrigatório');
  const sources=endpointOverride?[{url:endpointOverride,method:'POST'}]:instances;
  if(!sources.length)throw new Error('Nenhuma fonte Overpass configurada');
  const controllers=sources.map(()=>new AbortController());
  try{
    const result=await Promise.any(sources.map(async({url,method},index)=>{
      const opts={method,signal:controllers[index].signal};
      let target=url;
      if(method==='GET'){
        const parsed=new URL(url);
        parsed.searchParams.set('data',query);
        target=parsed.toString();
      }else if(method==='POST'){
        opts.headers={'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'};
        opts.body=new URLSearchParams({data:query}).toString();
      }else throw new Error('Método de consulta não suportado');
      const payload=await transport(target,opts,timeout);
      if(!Array.isArray(payload?.elements))throw new Error('Resposta Overpass inválida');
      return {elements:payload.elements};
    }));
    return result;
  }catch(error){
    // Jamais incluir a query ou coordenadas nos logs.
    const reasons=error?.errors?.map((err,i)=>'fonte '+(i+1)+': '+(err?.name==='AbortError'?'tempo limite':String(err?.message||'indisponível').slice(0,90))).join(' | ');
    console.warn('[Elas+] Fontes Overpass indisponíveis:',reasons||'Sem resposta');
    throw new Error('Fontes de locais indisponíveis');
  }finally{
    controllers.forEach(controller=>controller.abort());
  }
}
