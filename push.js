// Gemeinsame Hilfen für Handy-Benachrichtigung und Ton (Admin-Bereich und App)
(()=>{
 const urlB64=s=>{const p="=".repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,"+").replace(/_/g,"/"),r=atob(b);return Uint8Array.from([...r].map(c=>c.charCodeAt(0)));};
 const supported=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
 let ctx=null;
 const SPPush={
  supported,
  async register(){if(!("serviceWorker" in navigator))return null;try{return await navigator.serviceWorker.register("sw.js");}catch(e){console.error(e);return null;}},
  async state(){if(!supported())return "unsupported";if(Notification.permission==="denied")return "denied";
   try{const r=await navigator.serviceWorker.getRegistration();const s=r&&await r.pushManager.getSubscription();return s?"on":"off";}catch(_){return "off";}},
  async enable(sb){
   if(!supported())throw new Error("Dieser Browser unterstützt keine Handy-Benachrichtigungen.");
   const perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("Benachrichtigungen wurden nicht erlaubt. Bitte in den Browser-Einstellungen für diese Seite erlauben.");
   const {data,error}=await sb.functions.invoke("push-notify",{body:{action:"key"}});
   if(error||!data||!data.publicKey)throw new Error("Der Push-Schlüssel konnte nicht geladen werden. Ist die Funktion „push-notify“ bereitgestellt und supabase/benachrichtigungen.sql ausgeführt?");
   const reg=await navigator.serviceWorker.ready;const old=await reg.pushManager.getSubscription();if(old)await old.unsubscribe();
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(data.publicKey)});
   const j=sub.toJSON(),{data:{user}}=await sb.auth.getUser();
   const {error:e2}=await sb.from("push_subscriptions").upsert({endpoint:j.endpoint,user_id:user.id,p256dh:j.keys&&j.keys.p256dh,auth:j.keys&&j.keys.auth,user_agent:navigator.userAgent.slice(0,200)},{onConflict:"endpoint"});
   if(e2)throw new Error("Das Gerät konnte nicht gespeichert werden. Wurde supabase/benachrichtigungen.sql ausgeführt?");
  },
  async disable(sb){const r=await navigator.serviceWorker.getRegistration();const s=r&&await r.pushManager.getSubscription();if(s){await sb.from("push_subscriptions").delete().eq("endpoint",s.endpoint);await s.unsubscribe();}},
  async test(sb){const {data,error}=await sb.functions.invoke("push-notify",{body:{action:"test"}});if(error){let m="Test fehlgeschlagen.";try{const j=await error.context.json();if(j.error)m=j.error;}catch(_){}throw new Error(m);}return data;},
  soundOn:()=>localStorage.getItem("sp_sound")==="1",
  setSound(v){localStorage.setItem("sp_sound",v?"1":"0");if(v)this.beep();},
  beep(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();
   [[880,0],[1175,.18],[880,.4],[1175,.58]].forEach(([f,t])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(.35,ctx.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+t+.16);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.18);});}catch(e){console.error(e);}}
 };
 // Browser erlauben Ton erst nach einem Klick: den ersten Klick nutzen, um Audio freizuschalten
 document.addEventListener("click",()=>{try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();}catch(_){}},{once:true});
 window.SPPush=SPPush;SPPush.register();
})();
