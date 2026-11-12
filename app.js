(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();
  const menu = $(".menu-toggle"), nav = $(".main-nav");
  menu.addEventListener("click", () => { const open=nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
  $$(".main-nav a").forEach(a => a.addEventListener("click",()=>nav.classList.remove("open")));
  const form=$("#inquiry-form"), steps=$$(".form-step",form), progress=$(".form-progress i",form);
  let step=1;
  const showStep=n=>{step=n;steps.forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===n));progress.style.width=n===1?"50%":"100%";$(".form-top span:last-child",form).textContent=n===1?"01 — 02":"02 — 02";};
  $$(".inquiry-shortcut").forEach(btn=>btn.addEventListener("click",()=>{$$('[name="services"]',form).forEach(c=>c.checked=c.value===btn.dataset.service);$("#anfrage").scrollIntoView({behavior:"smooth"});}));
  $(".form-next",form).addEventListener("click",()=>{const required=["event_type","event_date","venue"];let valid=true;required.forEach(n=>{const el=form.elements[n];if(!el.value.trim()){el.reportValidity();valid=false;}});if(!$$('[name="services"]:checked',form).length){showError("Bitte wähle mindestens eine Dienstleistung aus.");valid=false;}if(valid){$(".form-error",form).hidden=true;showStep(2);}});
  $(".form-back",form).addEventListener("click",()=>showStep(1));
  function showError(msg){const el=$(".form-error",form);el.textContent=msg;el.hidden=false;}
  form.addEventListener("submit",async e=>{
    e.preventDefault();$(".form-error",form).hidden=true;
    if(!form.reportValidity())return;
    const cfg=window.STAGEPULSE_CONFIG||{};
    if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){showError("Das Anfrage-System ist noch nicht verbunden. Bitte kontaktiere uns direkt per Telefon oder E-Mail.");return;}
    const data=new FormData(form);
    const payload={full_name:data.get("full_name"),phone:data.get("phone"),email:data.get("email"),event_type:data.get("event_type"),event_date:data.get("event_date"),venue:data.get("venue"),services:data.getAll("services"),quantities:data.get("quantities"),guest_count:data.get("guest_count")?Number(data.get("guest_count")):null,message:data.get("message")};
    const submit=$('button[type="submit"]',form);submit.disabled=true;submit.textContent="Wird gesendet …";
    try{
      const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
      const {data:result,error}=await client.functions.invoke("submit-inquiry",{body:payload});
      if(error)throw error;
      steps.forEach(s=>s.classList.remove("active"));$(".form-success",form).hidden=false;progress.style.width="100%";form.reset();
    }catch(err){console.error(err);showError("Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut oder nutze Telefon/E-Mail.");}
    finally{submit.disabled=false;submit.innerHTML='Anfrage senden <span>↗</span>';}
  });
  const row=$("#occ-row"),cnt=$("#occ-count");
  if(row){const cards=$$(".occ-card",row),pad=n=>String(n).padStart(2,"0");
    const cur=()=>Math.min(cards.length-1,Math.round(row.scrollLeft/(cards[0].offsetWidth+16)));
    const upd=()=>{cnt.textContent=pad(cur()+1)+" / "+pad(cards.length)};
    const go=d=>row.scrollBy({left:d*(cards[0].offsetWidth+16),behavior:"smooth"});
    $("#occ-prev").onclick=()=>go(-1);$("#occ-next").onclick=()=>go(1);row.addEventListener("scroll",upd,{passive:true});}
  $$(".adv-filter button").forEach(b=>b.addEventListener("click",()=>{const team=b.dataset.f==="team";$$(".adv-filter button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$$(".adv").forEach(c=>c.hidden=b.dataset.f!=="all"&&c.dataset.c!==b.dataset.f);const g=$("#adv-grid"),tp=$("#team-panel");if(g)g.hidden=team;if(tp)tp.hidden=!team;}));
  const refreshers=[],registerRefresh=f=>refreshers.push(f);let sbShared=null;const getSb=()=>sbShared||(sbShared=window.supabase.createClient(window.STAGEPULSE_CONFIG.SUPABASE_URL,window.STAGEPULSE_CONFIG.SUPABASE_ANON_KEY));
  const teamBox=$("#team-list");
  if(teamBox){let tSig="";const loadTeam=async()=>{const cT=window.STAGEPULSE_CONFIG||{},hx=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x])),none=()=>{teamBox.innerHTML='<p class="events-empty">Unser Team stellen wir hier bald vor.</p>'};
    if(!window.supabase||!cT.SUPABASE_URL||cT.SUPABASE_URL.includes("DEIN-PROJEKT")){none();return;}
    try{const sbT=getSb(),{data,error}=await sbT.from("team_members").select("name,role,description,photo_path").eq("published",true).order("sort_order",{ascending:true});if(error)throw error;const sg=JSON.stringify(data||[]);if(sg===tSig)return;tSig=sg;if(!data||!data.length){none();return;}
      teamBox.innerHTML=data.map(m=>`<article class="team-row"><figure class="team-photo">${m.photo_path?`<img src="${cT.SUPABASE_URL}/storage/v1/object/public/moments/${encodeURIComponent(m.photo_path)}" alt="${hx(m.name)}${m.role?", "+hx(m.role):""}" loading="lazy" decoding="async">`:""}</figure><div class="team-text">${m.role?`<p class="team-role">${hx(m.role)}</p>`:""}<h3>${hx(m.name)}</h3>${m.description?`<p>${hx(m.description).replace(/\n/g,"<br>")}</p>`:""}</div></article>`).join("");}
    catch(e){console.error(e);if(!tSig)none();}};registerRefresh(loadTeam);loadTeam();}
  const refreshAll=()=>refreshers.forEach(f=>{try{f();}catch(_){}});
  const cLive=window.STAGEPULSE_CONFIG||{};
  if(window.supabase&&cLive.SUPABASE_URL&&!cLive.SUPABASE_URL.includes("DEIN-PROJEKT")){
    setInterval(()=>{if(!document.hidden)refreshAll();},30000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshAll();});
    try{let tm;const kick=()=>{clearTimeout(tm);tm=setTimeout(refreshAll,400);};
      getSb().channel("stagepulse-live").on("postgres_changes",{event:"*",schema:"public",table:"public_events"},kick).on("postgres_changes",{event:"*",schema:"public",table:"moment_slots"},kick).on("postgres_changes",{event:"*",schema:"public",table:"team_members"},kick).subscribe();}catch(e){console.error(e);}
  }
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches){const ms=$$(".moment");let t=false;const par=()=>{ms.forEach(m=>{const r=m.getBoundingClientRect();m.style.setProperty("--py",(((r.top+r.height/2)-innerHeight/2)*-.06).toFixed(1)+"px")});t=false};addEventListener("scroll",()=>{if(!t){t=true;requestAnimationFrame(par)}},{passive:true});par();}
  const momentSlots=$$("[data-slot]"),cfg0=window.STAGEPULSE_CONFIG||{};
  if(momentSlots.length&&window.supabase&&cfg0.SUPABASE_URL&&!cfg0.SUPABASE_URL.includes("DEIN-PROJEKT")){momentSlots.forEach(f=>{f.dataset.ph=f.innerHTML;});
    const loadMoments=async()=>{try{
    const {data,error}=await getSb().from("moment_slots").select("slot,image_path,alt_text");if(error)throw error;
    const by={};(data||[]).forEach(s=>by[s.slot]=s);
    momentSlots.forEach(fig=>{const s=by[fig.dataset.slot],key=s&&s.image_path?s.image_path+"|"+(s.alt_text||""):"";if((fig.dataset.cur||"")===key)return;fig.dataset.cur=key;
      if(!key){fig.classList.add("moment-slot");fig.innerHTML=fig.dataset.ph;return;}
      const img=document.createElement("img");img.src=cfg0.SUPABASE_URL+"/storage/v1/object/public/moments/"+encodeURIComponent(s.image_path);img.alt=s.alt_text||"Moment bei einem StagePulse Event";img.loading="lazy";img.decoding="async";
      fig.classList.remove("moment-slot");fig.replaceChildren(img);if(s.alt_text){const cap=document.createElement("figcaption");cap.textContent=s.alt_text;fig.append(cap);}});
  }catch(e){console.error(e);}};registerRefresh(loadMoments);loadMoments();}
  let evData=[],evSig="";const evBox=$("#event-list");
  if(evBox){const loadEvents=async()=>{
    const cfg=window.STAGEPULSE_CONFIG||{},esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
    const empty=()=>{evBox.innerHTML='<p class="events-empty">Aktuell sind keine öffentlichen Events geplant. Schau bald wieder vorbei!</p>'};
    if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){empty();return;}
    try{
      const sb=getSb(),today=new Date().toLocaleDateString("sv-SE");
      const {data,error}=await sb.from("public_events").select("title,event_date,start_time,location,description,link_url").eq("published",true).gte("event_date",today).order("event_date",{ascending:true}).order("start_time",{ascending:true,nullsFirst:false}).limit(6);
      if(error)throw error;const sig=JSON.stringify(data||[]);if(sig===evSig)return;evSig=sig;if(!data||!data.length){empty();return;}
      const mon=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
      evData=data;
      evBox.innerHTML=data.map((e,i)=>{const [y,m,d]=e.event_date.split("-");const time=e.start_time?e.start_time.slice(0,5)+" Uhr · ":"";
        return `<article class="event-card" data-i="${i}"><time class="event-date" datetime="${esc(e.event_date)}"><b>${Number(d)}</b><span>${mon[Number(m)-1]}</span></time><div class="event-body"><h3>${esc(e.title)}</h3><p class="event-meta">${time}${esc(e.location)}</p>${e.description?`<p class="event-short">${esc(e.description)}</p>`:""}<button type="button" class="event-open">Details &amp; Route ↗</button></div></article>`;}).join("");
    }catch(err){console.error(err);if(!evSig)empty();}
  };registerRefresh(loadEvents);loadEvents();}
  const ed=$("#event-dialog");
  if(evBox&&ed){
    const mapBox=$("#ed-map"),enc=encodeURIComponent,h=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
    const openEv=i=>{const e=evData[i];if(!e)return;const [y,m,d]=e.event_date.split("-");
      $("#ed-date").textContent=new Date(+y,m-1,+d).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
      $("#ed-title").textContent=e.title;
      $("#ed-meta").textContent=(e.start_time?e.start_time.slice(0,5)+" Uhr · ":"")+e.location;
      const desc=$("#ed-desc");desc.textContent=e.description||"";desc.hidden=!e.description;
      const link=/^https?:\/\//i.test(e.link_url||"")?`<a class="button button-ghost" href="${h(e.link_url)}" target="_blank" rel="noopener noreferrer">Mehr Infos ↗</a>`:"";
      $("#ed-actions").innerHTML=`<a class="button button-primary" href="https://www.google.com/maps/dir/?api=1&destination=${enc(e.location)}" target="_blank" rel="noopener noreferrer">Route starten ↗</a>${link}`;
      mapBox.dataset.loc=e.location;
      mapBox.innerHTML='<div class="map-consent"><p>Die Karte wird von Google Maps geladen. Dabei werden Daten an Google übertragen (<a href="datenschutz.html" target="_blank" rel="noopener">Datenschutz</a>).</p><button type="button" class="button button-ghost" id="ed-map-load">Karte laden</button></div>';
      ed.scrollTop=0;ed.showModal();};
    mapBox.addEventListener("click",ev=>{if(!ev.target.closest("#ed-map-load"))return;const f=document.createElement("iframe");f.src="https://maps.google.com/maps?q="+enc(mapBox.dataset.loc)+"&hl=de&z=15&output=embed";f.title="Karte: "+mapBox.dataset.loc;f.loading="lazy";f.referrerPolicy="no-referrer-when-downgrade";f.allowFullscreen=true;mapBox.replaceChildren(f);});
    evBox.addEventListener("click",ev=>{const c=ev.target.closest(".event-card");if(c)openEv(Number(c.dataset.i));});
    $("#ed-close").addEventListener("click",()=>ed.close());
    ed.addEventListener("click",ev=>{if(ev.target===ed)ed.close();});
    ed.addEventListener("close",()=>mapBox.replaceChildren());
  }
  const dialog=$("#notice-dialog");$(".dialog-close").addEventListener("click",()=>dialog.close());
})();