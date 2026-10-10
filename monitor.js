/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// Rapporteur d'erreurs : envoie les plantages de l'appli au coach (table app_errors) pour qu'il soit prévenu.
// Aucune donnée personnelle : message technique, page, navigateur. Limité à 5 envois par chargement de page.
(function(){
  if(window.__hsMon) return; window.__hsMon = true;
  const URL_ = 'https://rvftqdbdibfylauartii.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZnRxZGJkaWJmeWxhdWFydGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjEzMjIsImV4cCI6MjEwNjA5NzMyMn0._WLJkWncu1fwMnlakuPFuJr_I-uvgr_TwvMect8E-a0';
  let sent = 0; const seen = {};
  const IGNORE = /ResizeObserver|Script error|Failed to fetch|Load failed|NetworkError|network|AbortError|The operation was aborted|Non-Error promise|chrome-extension|moz-extension|cancelled|annulé/i;
  function token(){ try{ for(const k of Object.keys(localStorage)){ if(/^sb-.*-auth-token$/.test(k) || k === 'hs_session'){ const v = JSON.parse(localStorage.getItem(k)); const t = v && (v.access_token || (v.session && v.session.access_token)); if(t) return t; } } }catch(e){} return null; }
  function report(kind, msg, src){
    try{
      msg = String(msg || '').trim(); if(!msg || IGNORE.test(msg) || sent >= 5 || navigator.onLine === false) return;
      const key = msg.slice(0, 120) + '|' + location.pathname; if(seen[key]) return; seen[key] = 1; sent++;
      fetch(URL_ + '/rest/v1/rpc/log_app_error', { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + (token() || KEY), 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_kind: kind, p_message: msg, p_source: src || '', p_page: location.pathname.split('/').pop() || 'index', p_ua: navigator.userAgent }) }).catch(() => {});
    }catch(e){}
  }
  window.addEventListener('error', e => { if(e.target && e.target !== window) return; report('error', e.message, (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', e => { const r = e.reason; report('promise', r && (r.message || r.toString()), r && r.stack ? String(r.stack).split('\n')[1] : ''); });
  const ce = console.error; console.error = function(){ try{ const a = arguments[0]; report('caught', a && a.message ? a.message : (typeof a === 'string' ? a : ''), a && a.stack ? String(a.stack).split('\n')[1] : ''); }catch(e){} return ce.apply(console, arguments); };
})();
