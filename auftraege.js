// Mitarbeiter-App: Aufträge (mit Status), Events eintragen, Fotos „Momente“ verwalten
(() => {
 const $=s=>document.querySelector(s),cfg=window.STAGEPULSE_CONFIG||{};
 if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){$("#login-error").textContent="Supabase ist noch nicht konfiguriert.";return;}
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=s=>s?new Date(s).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}):"—";
 const dde=d=>{if(!d)return "—";const [y,m,t]=String(d).split("-");return t+"."+m+"."+y;};
 const statuses=["Neu","Angenommen","In Bearbeitung","Abgeschlossen","Abgelehnt"];
 let requests=[],knownIds=null,unseen=0,live=false,cur=null,events=[],editingEv=null,slots={};const fresh=new Set(),baseTitle=document.title;
 async function fnError(error,fn){try{const r=error&&error.context;if(r&&typeof r.json==="function"){if(r.status===404)return "Die Funktion „"+fn+"“ ist in Supabase noch nicht bereitgestellt.";const j=await r.json();if(j&&j.error)return j.error;}}catch(_){}return "Verbindung zur Funktion „"+fn+"“ fehlgeschlagen.";}
 const pubUrl=p=>cfg.SUPABASE_URL+"/storage/v1/object/public/moments/"+p;

 /* ---------- Anmeldung ---------- */
 async function init(){const {data:{session}}=await sb.auth.getSession();if(session)await enter(session.user);}
 async function enter(user){
  const {data:p}=await sb.from("profiles").select("role,active").eq("id",user.id).single();
  if(!p||!p.active||!["admin","employee"].includes(p.role)){await sb.auth.signOut();$("#login-panel").hidden=false;$("#app-main").hidden=true;$("#tabbar").hidden=true;$("#logout").hidden=true;$("#login-error").textContent="Kein Zugang. Diese App ist nur für aktive Mitarbeiter.";return;}
  $("#login-panel").hidden=true;$("#app-main").hidden=false;$("#tabbar").hidden=false;$("#logout").hidden=false;$("#user-label").textContent=user.email;
  showTab((location.hash||"").replace("#","")||"auftraege");
  await Promise.all([load(),loadEvents(),loadMoments()]);startLive();updateNotifyUI();
 }
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
  if(error){$("#login-error").textContent="Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";return;}$("#login-error").textContent="";await enter(data.user);});
 $("#logout").addEventListener("click",async()=>{await sb.auth.signOut();location.reload();});

 /* ---------- Bereiche ---------- */
 function showTab(n){if(!["auftraege","events","bilder"].includes(n))n="auftraege";["auftraege","events","bilder"].forEach(t=>{$("#tab-"+t).hidden=t!==n;$("#nav-"+t).setAttribute("aria-current",String(t===n));});window.scrollTo(0,0);}
 ["auftraege","events","bilder"].forEach(t=>$("#nav-"+t).addEventListener("click",()=>showTab(t)));

 /* ---------- Aufträge ---------- */
 async function load(){
  const {data,error}=await sb.from("inquiries").select("id,full_name,email,phone,event_type,event_date,venue,services,quantities,guest_count,message,status,created_at").order("created_at",{ascending:false});
  if(error){$("#app-error").textContent="Aufträge konnten nicht geladen werden.";return;}$("#app-error").textContent="";requests=data||[];detectNew();render();
 }
 function detectNew(){const ids=new Set(requests.map(r=>r.id));
  if(knownIds){const nw=requests.filter(r=>!knownIds.has(r.id));if(nw.length){nw.forEach(r=>fresh.add(r.id));unseen+=nw.length;if(window.SPPush&&SPPush.soundOn())SPPush.beep();document.title="("+unseen+") Neuer Auftrag";$("#app-info").textContent="🔔 Neuer Auftrag von "+nw.map(r=>r.full_name).join(", ");}}
  knownIds=ids;}
 function render(){$("#list").innerHTML=requests.length?requests.map(r=>`<button class="app-card${fresh.has(r.id)?" fresh":""}" data-id="${r.id}"><div class="app-card-top"><strong>${esc(r.full_name)}</strong><span class="status status-${esc(r.status.toLowerCase().replaceAll(" ","-"))}">${esc(r.status)}</span></div><p>${esc((r.services||[]).join(", "))}</p><p>${esc(r.event_type)} · ${dde(r.event_date)} · ${esc(r.venue||"")}</p><p class="when">Eingegangen ${fmt(r.created_at)}</p></button>`).join(""):'<p class="app-empty">Noch keine Aufträge.</p>';}
 const cell=(l,v)=>`<div class="detail-cell"><small>${l}</small><p>${esc(v||"—")}</p></div>`;
 $("#list").addEventListener("click",ev=>{const c=ev.target.closest(".app-card");if(!c)return;const r=requests.find(x=>x.id===c.dataset.id);if(!r)return;cur=r;
  fresh.delete(r.id);if(!fresh.size){unseen=0;document.title=baseTitle;$("#app-info").textContent="";}render();
  $("#d-name").textContent=r.full_name;
  $("#d-body").innerHTML=[cell("Dienstleistungen",(r.services||[]).join(", ")),cell("Veranstaltung",r.event_type+" · "+dde(r.event_date)),cell("Ort",r.venue),cell("Gästezahl",r.guest_count),cell("Mengen / Anzahl",r.quantities),cell("Nachricht",r.message),cell("Telefon",r.phone),cell("E-Mail",r.email),cell("Eingegangen",fmt(r.created_at))].join("");
  $("#d-actions").innerHTML=`<a class="button button-primary" href="tel:${esc(String(r.phone||"").replace(/[^+\d]/g,""))}">Anrufen</a><a class="button button-ghost" href="mailto:${esc(r.email)}">E-Mail schreiben</a>`;
  $("#d-status").innerHTML=statuses.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("");$("#d-error").textContent="";
  $("#detail").showModal();});
 $("#d-save").addEventListener("click",async()=>{if(!cur)return;const b=$("#d-save"),status=$("#d-status").value;b.disabled=true;$("#d-error").textContent="";
  const {data,error}=await sb.functions.invoke("manage-inquiry",{body:{action:"status",inquiry_id:cur.id,status}});b.disabled=false;
  if(error){$("#d-error").textContent=await fnError(error,"manage-inquiry");return;}
  $("#detail").close();await load();
  const ok=$("#app-info"),er=$("#app-error");ok.textContent="";
  if(data&&data.mail==="sent")ok.textContent="✓ Status gespeichert. Bestätigungs-E-Mail an "+data.to+" gesendet.";
  else if(data&&data.mail==="failed")er.textContent="Status gespeichert, aber die E-Mail an "+data.to+" konnte nicht gesendet werden. "+(data.mail_error||"");
  else ok.textContent="✓ Status gespeichert.";});
 $("#d-close").addEventListener("click",()=>$("#detail").close());$("#detail").addEventListener("click",e=>{if(e.target.id==="detail")$("#detail").close();});
 $("#reload").addEventListener("click",()=>{load();loadEvents();loadMoments();});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(knownIds)load();if(unseen&&!fresh.size){unseen=0;document.title=baseTitle;}}});
 function startLive(){if(live)return;live=true;
  try{sb.channel("inquiries-app").on("postgres_changes",{event:"*",schema:"public",table:"inquiries"},()=>load()).subscribe();}catch(e){console.error(e);}
  setInterval(()=>{if(!document.hidden)load();},30000);}

 /* ---------- Events ---------- */
 async function loadEvents(){const {data,error}=await sb.from("public_events").select("*").order("event_date",{ascending:true});if(error){$("#ev-list").innerHTML='<p class="admin-error">Events konnten nicht geladen werden. Wurde supabase/events.sql ausgeführt?</p>';return;}events=data||[];renderEvents();}
 function renderEvents(){const today=new Date().toLocaleDateString("sv-SE");
  $("#ev-list").innerHTML=events.length?events.map(e=>{const past=e.event_date<today,on=e.published&&!past,label=past?"Vergangen":e.published?"Online":"Entwurf";
   return `<article class="request-row event-row" data-id="${e.id}"><div><h3>${esc(e.title)}</h3><p>${dde(e.event_date)}${e.start_time?" · "+esc(e.start_time.slice(0,5))+" Uhr":""} · ${esc(e.location)}</p></div><span class="status status-big ${on?"status-online":past?"status-past":"status-draft"}"><i class="dot"></i>${label}</span><div class="row-actions"><button class="button button-ghost" data-act="edit">Bearbeiten</button><button class="button button-ghost btn-danger" data-act="del">Löschen</button></div></article>`;}).join(""):'<p class="app-empty">Noch keine Events eingetragen.</p>';}
 function openEv(e){editingEv=e||null;const f=$("#ev-form").elements;$("#ev-form").reset();$("#ev-title").textContent=e?"Event bearbeiten":"Neues Event";$("#ev-save").textContent=e?"Änderungen speichern":"Event speichern";$("#ev-error").textContent="";
  if(e){f.title.value=e.title;f.event_date.value=e.event_date;f.start_time.value=e.start_time?e.start_time.slice(0,5):"";f.location.value=e.location;f.description.value=e.description||"";f.link_url.value=e.link_url||"";f.published.checked=e.published;}else f.published.checked=true;
  $("#ev-dialog").showModal();}
 $("#ev-new").addEventListener("click",()=>openEv(null));
 $("#ev-close").addEventListener("click",()=>$("#ev-dialog").close());
 $("#ev-list").addEventListener("click",async ev=>{const btn=ev.target.closest("button[data-act]");if(!btn)return;const id=btn.closest(".event-row").dataset.id,e=events.find(x=>x.id===id);if(!e)return;
  if(btn.dataset.act==="edit")openEv(e);
  else if(confirm("Event „"+e.title+"“ wirklich löschen?")){const {error}=await sb.from("public_events").delete().eq("id",id);if(error){$("#app-error").textContent="Löschen fehlgeschlagen.";return;}await loadEvents();}});
 $("#ev-form").addEventListener("submit",async ev=>{ev.preventDefault();const f=ev.currentTarget.elements,err=$("#ev-error"),btn=$("#ev-save");err.textContent="";
  const link=f.link_url.value.trim();if(link&&!/^https?:\/\//i.test(link)){err.textContent="Der Link muss mit https:// beginnen.";return;}
  const row={title:f.title.value.trim(),event_date:f.event_date.value,start_time:f.start_time.value||null,location:f.location.value.trim(),description:f.description.value.trim()||null,link_url:link||null,published:f.published.checked};
  const {data:{user}}=await sb.auth.getUser();btn.disabled=true;
  const {error}=editingEv?await sb.from("public_events").update(row).eq("id",editingEv.id):await sb.from("public_events").insert({...row,created_by:user.email});btn.disabled=false;
  if(error){err.textContent="Event konnte nicht gespeichert werden.";return;}$("#ev-dialog").close();await loadEvents();});

 /* ---------- Momente (Fotos) ---------- */
 async function loadMoments(){const {data,error}=await sb.from("moment_slots").select("*");if(error)$("#moment-error").textContent="Bilder konnten nicht geladen werden. Wurde supabase/admin-erweiterung.sql ausgeführt?";slots={};(data||[]).forEach(s=>slots[s.slot]=s);renderMoments();}
 function renderMoments(){$("#moment-grid").innerHTML=[1,2,3,4,5,6].map(n=>{const s=slots[n]||{},has=!!s.image_path;
  return `<article class="slot-card" data-slot="${n}"><h4>Bildplatz ${n}</h4><div class="slot-preview">${has?`<img src="${esc(pubUrl(s.image_path))}" alt="Vorschau Bildplatz ${n}">`:"<span>Noch kein Bild</span>"}</div><label>Bildtext (erscheint unter dem Bild)<input class="slot-alt" maxlength="200" value="${esc(s.alt_text||"")}" placeholder="z. B. Stadtfest 2026"></label><div class="row-actions"><label class="button button-primary file-btn">${has?"Foto austauschen":"Foto hinzufügen"}<input type="file" accept="image/*" hidden></label><button class="button button-ghost btn-danger" data-act="rm" ${has?"":"disabled"}>Löschen</button></div></article>`;}).join("");}
 async function toImage(file,max=1600){const bmp=await createImageBitmap(file),sc=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  const w=await new Promise(r=>c.toBlob(r,"image/webp",.82));if(w&&w.type==="image/webp")return {blob:w,ext:"webp"};return {blob:await new Promise(r=>c.toBlob(r,"image/jpeg",.85)),ext:"jpg"};}
 $("#moment-grid").addEventListener("change",async ev=>{const card=ev.target.closest(".slot-card");if(!card)return;const n=Number(card.dataset.slot),err=$("#moment-error");err.textContent="";
  if(ev.target.matches(".slot-alt")){if(slots[n]?.image_path){const {error}=await sb.from("moment_slots").update({alt_text:ev.target.value.trim()||null,updated_at:new Date().toISOString()}).eq("slot",n);if(error)err.textContent="Bildtext konnte nicht gespeichert werden.";else slots[n].alt_text=ev.target.value.trim();}return;}
  if(!ev.target.matches("input[type=file]"))return;const file=ev.target.files[0];if(!file)return;
  if(!file.type.startsWith("image/")||file.size>25*1024*1024){err.textContent="Bitte ein Foto (JPG, PNG oder WebP) bis 25 MB wählen.";return;}
  card.classList.add("busy");
  try{const {blob,ext}=await toImage(file),path=`slot-${n}-${Date.now()}.${ext}`;
   const up=await sb.storage.from("moments").upload(path,blob,{contentType:blob.type,cacheControl:"31536000"});if(up.error)throw up.error;
   const old=slots[n]?.image_path,alt=card.querySelector(".slot-alt").value.trim()||null;
   const {error}=await sb.from("moment_slots").upsert({slot:n,image_path:path,alt_text:alt,updated_at:new Date().toISOString()},{onConflict:"slot"});if(error)throw error;
   if(old)await sb.storage.from("moments").remove([old]);
  }catch(e){console.error(e);err.textContent="Foto konnte nicht gespeichert werden. Wurde supabase/admin-erweiterung.sql ausgeführt?";}
  await loadMoments();});
 $("#moment-grid").addEventListener("click",async ev=>{const btn=ev.target.closest('button[data-act="rm"]');if(!btn)return;const n=Number(btn.closest(".slot-card").dataset.slot),s=slots[n];if(!s?.image_path)return;
  if(!confirm("Foto von Bildplatz "+n+" wirklich löschen?"))return;const err=$("#moment-error");err.textContent="";
  const r1=await sb.storage.from("moments").remove([s.image_path]);const {error}=await sb.from("moment_slots").update({image_path:null,updated_at:new Date().toISOString()}).eq("slot",n);
  if(r1.error||error)err.textContent="Löschen fehlgeschlagen.";await loadMoments();});

 /* ---------- Ton und Handy-Benachrichtigung ---------- */
 async function updateNotifyUI(){const S=window.SPPush;if(!S)return;$("#sound-toggle").textContent="Ton: "+(S.soundOn()?"an":"aus");
  const st=await S.state(),b=$("#push-toggle"),m=$("#notify-msg");$("#push-test").hidden=st!=="on";
  if(st==="unsupported"){b.disabled=true;b.textContent="Benachrichtigung nicht verfügbar";m.textContent="Dieser Browser unterstützt keine Benachrichtigungen.";}
  else if(st==="denied"){b.disabled=true;b.textContent="Benachrichtigungen blockiert";m.textContent="Bitte in den Android-Einstellungen für diese App Benachrichtigungen erlauben.";}
  else if(st==="on"){b.disabled=false;b.textContent="Benachrichtigung: an";m.textContent="Dieses Gerät meldet sich bei jedem neuen Auftrag. Tippen zum Ausschalten.";}
  else{b.disabled=false;b.textContent="Benachrichtigung aktivieren";m.textContent="";}}
 $("#sound-toggle").addEventListener("click",()=>{SPPush.setSound(!SPPush.soundOn());updateNotifyUI();});
 $("#push-toggle").addEventListener("click",async()=>{const b=$("#push-toggle"),m=$("#notify-msg");b.disabled=true;try{if(await SPPush.state()==="on")await SPPush.disable(sb);else await SPPush.enable(sb);m.textContent="";}catch(e){m.textContent=e.message;}b.disabled=false;await updateNotifyUI();});
 $("#push-test").addEventListener("click",async()=>{const m=$("#notify-msg");m.textContent="Test wird gesendet …";try{const r=await SPPush.test(sb);m.textContent=r.sent?"✓ Test gesendet.":"Der Push-Dienst hat den Test nicht angenommen. Bitte aus- und wieder einschalten.";}catch(e){m.textContent=e.message;}});
 init();
})();
