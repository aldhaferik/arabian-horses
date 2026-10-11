// Shared counters; never substitute invented/local counts when the API is unavailable.
(()=>{
 const config=window.LIBRARY_STATS_CONFIG;
 const status=document.getElementById('stats-status');
 const ids=['reader-opens','download-requests','direct-opens'];
 const formatter=new Intl.NumberFormat('ar');
 const selected=()=>document.querySelector('[data-book][aria-current="true"]')?.dataset.book||'horses';
 let visitor;try{visitor=localStorage.getItem('library-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('library-visitor',visitor);}}catch{visitor=crypto.randomUUID();}
 const totals=new Map();const seen=new Map();let current='';let generation=0;const inflight=new Map();
 function placeholder(message){ids.forEach(id=>document.getElementById(id).textContent='—');status.textContent=message;}
 function paint(data,book,g){if(book!==current||g!==generation)return;const prior=totals.get(book)||{};for(const key of ['reader_opens','download_requests','direct_opens'])data[key]=Math.max(data[key],prior[key]||0);totals.set(book,data);ids.forEach((id,index)=>document.getElementById(id).textContent=formatter.format(data[['reader_opens','download_requests','direct_opens'][index]]));const date=new Date(data.started_at);status.textContent='منذ '+date.toLocaleDateString('ar',{year:'numeric',month:'long',day:'numeric'});}
 async function call(book,kind='get',event=crypto.randomUUID()){
  if(!config?.endpoint||!config?.anonKey)throw new Error('not configured');
  const response=await fetch(config.endpoint,{method:'POST',headers:{Authorization:'Bearer '+config.anonKey,apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({book_id:book,kind,visitor_id:visitor,event_id:event}),signal:AbortSignal.timeout(10000),keepalive:kind!=='get'});
  if(!response.ok)throw new Error('unavailable');
  const data=await response.json();if(['reader_opens','download_requests','direct_opens'].some(k=>!Number.isSafeInteger(data[k])||data[k]<0))throw new Error('invalid response');return data;
 }
 async function refresh(){const book=current,g=generation;try{paint(await call(book),book,g);}catch{if(book===current&&g===generation)placeholder('الإحصاءات غير متاحة مؤقتاً');}}
 function select(){const book=selected();if(book===current)return;current=book;generation++;placeholder('جارٍ تحميل الإحصاءات…');refresh();}
 async function record(kind){const book=current,g=generation,key=book+':'+kind;const ttl=kind==='read'?1800000:5000;if(inflight.has(key)||Date.now()-(seen.get(key)||0)<ttl)return;
  const id=crypto.randomUUID();inflight.set(key,id);
  try{let data;try{data=await call(book,kind,id);}catch{data=await call(book,kind,id);}seen.set(key,Date.now());paint(data,book,g);}catch{if(book===current&&g===generation)status.textContent='تعذر تحديث الإحصاءات؛ يمكنك متابعة القراءة';}finally{inflight.delete(key);}
 }
 window.addEventListener('message',event=>{
  const frame=document.getElementById('reader');const url=new URL(frame.src,location.href);
  if(event.source!==frame.contentWindow||event.origin!==url.origin||event.data?.source!=='historian-library')return;
  const expected=new URL(url.searchParams.get('file'),url).pathname.split('/').pop();if(event.data.file!==expected)return;
  if(event.data.kind==='read'||event.data.kind==='download')record(event.data.kind);
 });
 function requestStatus(){const frame=document.getElementById('reader');frame.contentWindow.postMessage({source:'historian-library',kind:'status'},new URL(frame.src,location.href).origin);}document.getElementById('reader').addEventListener('load',requestStatus);requestStatus();
 document.getElementById('download-pdf').addEventListener('click',()=>record('download'));
 document.getElementById('open-pdf').addEventListener('click',()=>record('open'));
 new MutationObserver(select).observe(document.getElementById('book-title'),{childList:true,subtree:true,characterData:true});
 window.addEventListener('popstate',select);select();setInterval(()=>{if(!document.hidden)refresh();},60000);
})();
