/* Alertes bien visibles : bandeau sous l'en-tête + pastille chiffrée sur la nav + badge d'icône + titre. */
(function(){
  var URL_ = "https://rvftqdbdibfylauartii.supabase.co", KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZnRxZGJkaWJmeWxhdWFydGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjEzMjIsImV4cCI6MjEwNjA5NzMyMn0._WLJkWncu1fwMnlakuPFuJr_I-uvgr_TwvMect8E-a0";
  var POLL = 45000, started = false, lastSig = '';
  function sess(){ try{ return JSON.parse(localStorage.getItem('hs_session')||'null'); }catch(e){ return null; } }
  function role(){ return localStorage.getItem('hs_role') || ''; }
  function get(path, tok){
    return fetch(URL_ + path, { headers:{ apikey:KEY, Authorization:'Bearer ' + tok } }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
  }
  function seenSet(k){ try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ return []; } }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var here = (location.pathname.split('/').pop() || 'index.html');

  async function collect(){
    var s = sess(); if(!s || !s.access_token) return [];
    var tok = s.access_token, uid = s.user && s.user.id, r = role(), out = [];
    if(r === 'admin' || r === 'coach'){
      var res = await Promise.all([
        get('/rest/v1/messages?select=conversation_id&sender=eq.user&read=eq.false', tok),
        get('/rest/v1/session_edit_requests?select=id&status=eq.pending', tok),
        get('/rest/v1/coach_contact_requests?select=id&status=neq.handled', tok),
        r === 'admin' ? get('/rest/v1/profiles?select=id,coach_id&role=eq.client', tok) : Promise.resolve([]),
        r === 'admin' ? get('/rest/v1/conversations?select=id,user_id', tok) : Promise.resolve([])
      ]);
      var unread = Array.isArray(res[0]) ? res[0] : [];
      if(r === 'admin' && Array.isArray(res[3]) && Array.isArray(res[4]) && res[3].length){
        var clients = res[3], own = new Set(clients.filter(function(c){ return !c.coach_id; }).map(function(c){ return c.id; }));
        var ownConv = new Set(res[4].filter(function(c){ return own.has(c.user_id) || !clients.some(function(k){ return k.id === c.user_id; }); }).map(function(c){ return c.id; }));
        unread = unread.filter(function(m){ return ownConv.has(m.conversation_id); });
      }
      if(unread.length) out.push({ k:'msg', n:unread.length, ico:'💬', txt: unread.length + ' message' + (unread.length>1?'s':'') + ' non lu' + (unread.length>1?'s':''), go:{ page:'admin.html', tab:'messages', sub:'conversations' } });
      var ed = Array.isArray(res[1]) ? res[1] : [];
      if(ed.length) out.push({ k:'edit', n:ed.length, ico:'✏️', txt: ed.length + ' demande' + (ed.length>1?'s':'') + ' d\'autorisation à traiter', go:{ page:'admin.html', tab:'clients' } });
      var ct = Array.isArray(res[2]) ? res[2] : [];
      if(ct.length) out.push({ k:'contact', n:ct.length, ico:'📩', txt: ct.length + ' demande' + (ct.length>1?'s':'') + ' de contact', go:{ page:'admin.html', tab:'messages', sub:'contacts' } });
      try{
        var tm = await get('/rest/v1/team_messages?select=id&to_id=eq.' + uid + '&read=eq.false', tok);
        if(Array.isArray(tm) && tm.length) out.push({ k:'team', n:tm.length, ico:'👥', txt: tm.length + ' message' + (tm.length>1?'s':'') + ' de l\'équipe', go:{ page:'admin.html', tab:'messages', sub:'team' } });
      }catch(e){}
      return out;
    }
    // client
    var c = await get('/rest/v1/conversations?select=id&user_id=eq.' + uid + '&limit=1', tok);
    if(c && c[0]){
      var um = await get('/rest/v1/messages?select=id&conversation_id=eq.' + c[0].id + '&sender=eq.coach&read=eq.false', tok);
      if(um.length) out.push({ k:'msg', n:um.length, ico:'💬', txt:'Ton coach t\'a écrit (' + um.length + ' message' + (um.length>1?'s':'') + ')', go:{ page:'compte.html', tab:'chat' } });
    }
    var er = await get('/rest/v1/session_edit_requests?select=id,status&user_id=eq.' + uid + '&status=neq.pending', tok);
    var seenE = seenSet('hs_seen_editreq');
    var newE = er.filter(function(x){ return seenE.indexOf(x.id) < 0; });
    if(newE.length) out.push({ k:'edit', n:newE.length, ico:'✅', txt:'Réponse de ton coach à ta demande de modification', go:{ page:'compte.html', tab:'historique' }, markSeen:{ key:'hs_seen_editreq', ids:newE.map(function(x){ return x.id; }) } });
    var pr = await get('/rest/v1/programs?select=id,created_by&owner_user_id=eq.' + uid, tok);
    var seenP = seenSet('hs_seen_programs');
    var newP = pr.filter(function(p){ return seenP.indexOf(p.id) < 0 && p.created_by !== uid; });
    if(newP.length) out.push({ k:'prog', n:newP.length, ico:'📋', txt:'Nouveau programme de ton coach', go:{ page:'programmes.html' } });
    return out;
  }

  function css(){
    if(document.getElementById('hsAlertCss')) return;
    var st = document.createElement('style'); st.id = 'hsAlertCss';
    st.textContent = '#hsAlerts{max-width:1080px;margin:10px auto 0;padding:0 20px;display:flex;flex-direction:column;gap:8px;position:relative;z-index:5}'+
      '.hs-alert{display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;background:#ff5a4e;color:#fff;border:2px solid #fff;padding:12px 14px;font:inherit;font-weight:700;font-size:15px;animation:hsAlertPulse 2.2s ease-in-out infinite;box-shadow:0 4px 18px rgba(255,90,78,.45)}'+
      '.hs-alert .ico{font-size:22px;flex:none}.hs-alert .tx{flex:1}.hs-alert .go{flex:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;border:1px solid #fff;padding:4px 8px}'+
      '.hs-alert .x{flex:none;font-size:18px;opacity:.85;padding:0 4px}'+
      '@keyframes hsAlertPulse{0%,100%{box-shadow:0 4px 18px rgba(255,90,78,.45)}50%{box-shadow:0 4px 26px rgba(255,90,78,.95)}}'+
      '.hs-navbadge{position:absolute;top:-6px;right:2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px !important;background:#ff5a4e;color:#fff;border:2px solid var(--bg,#000);font-size:11px;font-weight:800;line-height:16px;text-align:center;font-family:inherit;letter-spacing:0}'+
      '@media(max-width:700px){#hsAlerts{padding:0 14px}.hs-alert{font-size:14px}}'+
      '@media(prefers-reduced-motion:reduce){.hs-alert{animation:none}}';
    document.head.appendChild(st);
  }
  function go(g){
    if(g.page === here || (g.page === 'index.html' && here === '')){
      window.dispatchEvent(new CustomEvent('hs-alert-go', { detail:g }));
      window.scrollTo(0,0);
    } else {
      location.href = g.page + (g.tab ? '#t=' + g.tab + (g.sub ? '&s=' + g.sub : '') : '');
    }
  }
  function render(items){
    css();
    var dis = []; try{ dis = JSON.parse(sessionStorage.getItem('hs_alert_dis')||'[]'); }catch(e){}
    var total = items.reduce(function(a,i){ return a + i.n; }, 0);
    // titre + badge d'icône
    var base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = total ? '(' + total + ') ' + base : base;
    try{ if(total && navigator.setAppBadge) navigator.setAppBadge(total); else if(!total && navigator.clearAppBadge) navigator.clearAppBadge(); }catch(e){}
    // pastilles sur la nav
    document.querySelectorAll('.hs-navbadge').forEach(function(b){ b.remove(); });
    var navTarget = (role()==='admin'||role()==='coach') ? document.querySelector('.navrow a[href="admin.html"]') : document.querySelector('.navrow a[href="compte.html"]');
    if(navTarget && total){ navTarget.style.position = 'relative'; navTarget.insertAdjacentHTML('beforeend', '<span class="hs-navbadge">' + (total>99?'99+':total) + '</span>'); }
    document.querySelectorAll('.nav-dot').forEach(function(d){ d.remove(); });
    // bandeau
    var box = document.getElementById('hsAlerts');
    if(!box){
      var hdr = document.querySelector('header.top') || document.querySelector('header');
      if(!hdr) return;
      box = document.createElement('div'); box.id = 'hsAlerts'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite');
      hdr.parentNode.insertBefore(box, hdr.nextSibling);
    }
    var sig = items.map(function(i){ return i.k + i.n; }).join('|');
    var vis = items.filter(function(i){ return dis.indexOf(i.k + i.n) < 0; });
    box.style.display = /\/seance/.test(location.hash) ? 'none' : '';
    var pb = document.getElementById('hsPushBar'); if(pb) pb.style.display = box.style.display;
    box.innerHTML = vis.map(function(i, idx){
      return '<button type="button" class="hs-alert" data-i="' + items.indexOf(i) + '"><span class="ico">' + i.ico + '</span><span class="tx">' + esc(i.txt) + '</span><span class="go">Voir</span><span class="x" data-x="' + i.k + i.n + '" aria-label="Masquer">✕</span></button>';
    }).join('');
    box.querySelectorAll('.hs-alert').forEach(function(b){
      b.onclick = function(ev){
        var x = ev.target.closest('[data-x]');
        if(x){ ev.stopPropagation(); var d = []; try{ d = JSON.parse(sessionStorage.getItem('hs_alert_dis')||'[]'); }catch(e){} d.push(x.dataset.x); try{ sessionStorage.setItem('hs_alert_dis', JSON.stringify(d)); }catch(e){} render(items); return; }
        var it = items[+b.dataset.i];
        if(it.markSeen){ var cur = seenSet(it.markSeen.key); it.markSeen.ids.forEach(function(id){ if(cur.indexOf(id)<0) cur.push(id); }); try{ localStorage.setItem(it.markSeen.key, JSON.stringify(cur)); }catch(e){} }
        go(it.go);
      };
    });
    // vibration discrète à l'apparition d'une nouvelle alerte
    if(sig && sig !== lastSig && lastSig !== null && vis.length){ try{ if(navigator.vibrate) navigator.vibrate([120,80,120]); }catch(e){} }
    lastSig = sig;
  }
  async function tick(){
    if(document.hidden) return;
    try{ render(await collect()); }catch(e){}
  }
  function start(){
    if(started) return; started = true; lastSig = null;
    tick(); setInterval(tick, POLL);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) tick(); });
    window.addEventListener('hs-alerts-refresh', tick);
    window.addEventListener('hashchange', function(){ var b = document.getElementById('hsAlerts'); var h = /\/seance/.test(location.hash) ? 'none' : ''; if(b) b.style.display = h; var p = document.getElementById('hsPushBar'); if(p) p.style.display = h; });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // ---------- Notifications push ----------
  var VAPID = "BAkFzCuBc-mD8PEavsv_xnMDm3_eVoI3vUk9sMGmaBK8GGaey-R_eQRfmzTGFRLBamtZkUCAerhDcBInxgEfoPw";
  function b64u(s){ var p = '='.repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g,'+').replace(/_/g,'/'), r = atob(b), o = new Uint8Array(r.length); for(var i=0;i<r.length;i++) o[i] = r.charCodeAt(i); return o; }
  function ab2b64u(buf){ var s = ''; new Uint8Array(buf).forEach(function(c){ s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function standalone(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function pushSupported(){ return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  async function savePushSub(sub){
    var s = sess(); if(!s || !s.access_token) return false;
    var j = sub.toJSON(); if(!j.keys) return false;
    var h = { apikey:KEY, Authorization:'Bearer ' + s.access_token, 'Content-Type':'application/json' };
    try{
      await fetch(URL_ + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(sub.endpoint), { method:'DELETE', headers:h });
      var r = await fetch(URL_ + '/rest/v1/push_subscriptions', { method:'POST', headers:Object.assign({ Prefer:'return=minimal' }, h), body: JSON.stringify({ user_id: s.user.id, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }) });
      if(r.ok){ localStorage.setItem('hs_push_on', s.user.id); return true; }
    }catch(e){}
    return false;
  }
  async function ensureSubscribed(){
    if(!pushSupported() || Notification.permission !== 'granted') return false;
    try{
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64u(VAPID) });
      var s = sess();
      if(s && localStorage.getItem('hs_push_on') !== s.user.id) await savePushSub(sub);
      return true;
    }catch(e){ console.error('push', e); return false; }
  }
  async function enablePush(){
    try{
      var p = await Notification.requestPermission();
      if(p !== 'granted'){ alert('Notifications refusées. Tu peux les réactiver dans les réglages de ton téléphone (Réglages > Notifications > HS Coaching).'); renderPushBar(); return; }
      var ok = await ensureSubscribed();
      renderPushBar();
      if(!ok) alert('Impossible d\'activer les notifications sur cet appareil.');
    }catch(e){ console.error(e); }
  }
  function renderPushBar(){
    var old = document.getElementById('hsPushBar'); if(old) old.remove();
    var s = sess(); if(!s || !s.access_token) return;
    if(!pushSupported()){
      if(!(isIOS() && !standalone())) return;
    } else if(Notification.permission !== 'default') return;
    var hdr = document.querySelector('header.top') || document.querySelector('header'); if(!hdr) return;
    try{ if(sessionStorage.getItem('hs_push_dis') === '1') return; }catch(e){}
    css();
    var bar = document.createElement('div'); bar.id = 'hsPushBar';
    bar.style.cssText = 'max-width:1080px;margin:10px auto 0;padding:0 20px';
    var needInstall = isIOS() && !standalone();
    bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;border:2px solid #f5f5f3;padding:12px 14px;font-size:14.5px;line-height:1.35"><span style="font-size:22px">🔔</span><span style="flex:1">' +
      (needInstall ? '<b>Active les notifications</b><br><span class="hsp-sub" style="opacity:.85">Sur iPhone : touche Partager puis « Sur l\'écran d\'accueil », ouvre l\'appli depuis l\'icône, puis reviens ici.</span>'
                   : '<b>Active les notifications</b><br><span class="hsp-sub" style="opacity:.85">Messages de ton coach, autorisations, fin de repos : même appli fermée.</span>') +
      '</span>' + (needInstall ? '' : '<button type="button" id="hsPushGo" style="font:inherit;font-weight:700;background:#f5f5f3;color:#0b0b0c;border:0;padding:10px 14px;cursor:pointer">ACTIVER</button>') +
      '<span id="hsPushX" style="cursor:pointer;opacity:.7;padding:0 4px" aria-label="Masquer">✕</span></div>';
    hdr.parentNode.insertBefore(bar, hdr.nextSibling);
    var g = document.getElementById('hsPushGo'); if(g) g.onclick = enablePush;
    document.getElementById('hsPushX').onclick = function(){ try{ sessionStorage.setItem('hs_push_dis','1'); }catch(e){} bar.remove(); };
  }
  navigator.serviceWorker && navigator.serviceWorker.addEventListener && navigator.serviceWorker.addEventListener('message', function(e){
    if(e.data && e.data.type === 'hs-go' && e.data.hash){ location.hash = e.data.hash; window.dispatchEvent(new CustomEvent('hs-alert-go', { detail: (function(){ var m = e.data.hash.match(/t=(\w+)/), s = e.data.hash.match(/s=(\w+)/); return { tab: m && m[1], sub: s && s[1] }; })() })); }
  });
  window.HSPush = { enable: enablePush, ensure: ensureSubscribed };
  setTimeout(function(){ ensureSubscribed(); renderPushBar(); }, 1500);
})();
