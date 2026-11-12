// Service Worker: zeigt Handy-Benachrichtigungen für neue Aufträge
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{}); // nötig, damit Chrome die Seite als App installieren darf
self.addEventListener("push",e=>{
  e.waitUntil(self.registration.showNotification("Neuer Auftrag",{
    body:"Es ist eine neue Anfrage bei StagePulse Events eingegangen.",
    icon:"assets/icon-192.png",badge:"assets/badge-96.png",tag:"new-inquiry",renotify:true,
    vibrate:[250,120,250,120,500],requireInteraction:true,data:{url:"app.html"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if(/app\.html|admin\.html/.test(c.url)&&"focus" in c)return c.focus();}
    return self.clients.openWindow("app.html");}));
});
