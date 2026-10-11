// Public anonymous telemetry. Raw events and service credentials stay server-side.
const origins = new Set(['https://ahmed.aldhaferi.net','https://aldhaferi.net','https://www.aldhaferi.net','https://art2.aldhaferi.net','https://aldhaferik.github.io']);
const books = new Set(['horses','proverbs-words-1','hare','hida-bedu','hida','dhabb','jerboas','proverbs-2','proverbs-words-2','desert-literature']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function hash(value:string,secret:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://aldhaferi.net','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(!origins.has(origin))return reply({error:'origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'method not allowed'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>2048)return reply({error:'request too large'},413);
  const reader=req.body?.getReader();if(!reader)return reply({error:'invalid request'},400);
  let text='';let bytes=0;const decoder=new TextDecoder();
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>2048){await reader.cancel();return reply({error:'request too large'},413);}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();
  const b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'invalid request'},400);
  if(!books.has(b.book_id)||!['get','read','download','open'].includes(b.kind))return reply({error:'invalid event'},400);
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const url=Deno.env.get('SUPABASE_URL');
  if(!secret||!url)return reply({error:'unavailable'},503);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown';
  const args:Record<string,unknown>={p_book:b.book_id,p_kind:b.kind,p_actor:await hash('rate:'+new Date().toISOString().slice(0,10)+':'+ip,secret)};
  if(b.kind!=='get'){
   if(typeof b.visitor_id!=='string'||typeof b.event_id!=='string'||!uuid.test(b.visitor_id)||!uuid.test(b.event_id))return reply({error:'invalid identifier'},400);
   args.p_visitor=await hash('visitor:'+b.visitor_id,secret);
   args.p_event=b.event_id;
  }
  const response=await fetch(url+'/rest/v1/rpc/library_activity',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(args)});
  if(!response.ok){console.error('stats database status',response.status);return reply({error:'unavailable'},503);}
  const result=await response.json();if(result.limited)return reply({error:'rate limited'},429);
  return reply(result);
 }catch{return reply({error:'invalid request'},400);}
});
