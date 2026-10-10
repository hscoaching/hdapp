/* Conseils du coach sur les fiches exercices — HS Coaching */
(function(){
  const GOLD = '#d9b25c';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function css(){
    if(document.getElementById('tpCss')) return;
    const st = document.createElement('style'); st.id = 'tpCss';
    st.textContent = `.tp-h{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);margin:16px 2px 8px}
.tp-c{background:linear-gradient(180deg,rgba(217,178,92,.12),rgba(217,178,92,.04));border:1px solid ${GOLD};padding:11px 13px;margin-bottom:8px;font-size:14px;line-height:1.5}
.tp-c.old{background:var(--surface-2);border-color:var(--line);opacity:.85}
.tp-w{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${GOLD}}
.tp-c.old .tp-w{color:var(--ink-muted)}
.tp-av{width:24px;height:24px;border-radius:50%;background:${GOLD};color:#111;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex:none}
.tp-c.old .tp-av{background:#555;color:#eee}
.tp-d{margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink-muted);font-size:11px}
.tp-t{white-space:pre-wrap;word-break:break-word}
.tp-ed{border:1px solid var(--line);padding:12px;margin-top:6px;background:var(--surface)}
.tp-ed label{display:block;font-size:12px;color:var(--ink-muted);margin:8px 0 4px}
.tp-ed select,.tp-ed textarea{width:100%;box-sizing:border-box;background:var(--surface-2);border:1px solid var(--line);color:var(--ink);padding:10px;font:inherit;font-size:14px}
.tp-ed textarea{min-height:84px;resize:vertical}
.tp-go{display:block;width:100%;margin-top:10px;background:${GOLD};color:#111;border:0;padding:12px;font:inherit;font-weight:800;cursor:pointer}
.tp-go:disabled{opacity:.6}
.tp-li{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.tp-li:last-child{border:0}.tp-li span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.tp-li a{color:var(--ink-muted);text-decoration:underline;cursor:pointer;white-space:nowrap;margin-left:8px}
.tp-m{font-size:12.5px;min-height:16px;margin-top:6px}`;
    document.head.appendChild(st);
  }
  function sess(){ try{ return JSON.parse(localStorage.getItem('hs_session') || 'null'); }catch(e){ return null; } }
  async function rpc(o, fn, args){
    if(typeof o.refresh === 'function'){ try{ await o.refresh(); }catch(e){} }
    let s = sess(); if(!s || !s.access_token) throw new Error('no_session');
    if(s.refresh_token && s.expires_at && s.expires_at * 1000 < Date.now() + 60000){
      try{
        const rr = await fetch(`${o.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: o.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        const d = await rr.json(); if(rr.ok && d.access_token){ localStorage.setItem('hs_session', JSON.stringify(d)); s = d; }
      }catch(e){}
    }
    const r = await fetch(`${o.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: o.key, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
    if(!r.ok) throw new Error('rpc_failed');
    return r.json();
  }
  const fmt = d => { try{ return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }catch(e){ return ''; } };

  // fiche vue par un client : conseils reçus
  function clientHtml(rows){
    if(!rows || !rows.length) return '';
    return `<div class="tp-h">Conseil de ton coach</div>` + rows.map(r => `<div class="tp-c${r.current_coach ? '' : ' old'}"><div class="tp-w"><span class="tp-av">${esc((r.author_name || '?').trim().charAt(0).toUpperCase())}</span>${esc(r.author_name)}${r.current_coach ? '' : ' · ancien coach'}<span class="tp-d">${esc(fmt(r.updated_at))}</span></div><div class="tp-t">${esc(r.body)}</div></div>`).join('');
  }

  // fiche vue par un coach / admin : éditeur
  async function coachBlock(box, exId, o){
    let clients = [], mine = [];
    try{ [clients, mine] = await Promise.all([rpc(o, 'my_tip_clients'), rpc(o, 'my_exercise_tips', { p_exercise: exId })]); }
    catch(e){ return; }   // script SQL pas encore lancé : on n'affiche rien
    let edit = null;
    const draw = () => {
      const opts = `<option value="">Tous mes clients</option>` + clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
      const list = mine.length ? `<div class="tp-h" style="margin-top:14px">Déjà écrits sur cet exercice</div><div class="tp-ed" style="margin-top:0">${mine.map((t, i) => `<div class="tp-li"><span><b>${t.client_id ? esc(t.client_name) : 'Tous mes clients'}</b> · ${esc(t.body.length > 60 ? t.body.slice(0, 60) + '…' : t.body)}</span><span style="flex:none"><a data-e="${i}">Modifier</a><a data-d="${i}">Supprimer</a></span></div>`).join('')}</div>` : '';
      box.innerHTML = `<div class="tp-h">Conseil pour tes clients</div><div class="tp-ed"><label>Pour</label><select id="tpWho">${opts}</select><label>Ton conseil</label><textarea id="tpBody" maxlength="1200" placeholder="Ex. : garde les genoux dans l'axe des pieds…"></textarea><button type="button" class="tp-go" id="tpGo">Enregistrer le conseil</button><div class="tp-m" id="tpMsg"></div></div>${list}`;
      const who = box.querySelector('#tpWho'), body = box.querySelector('#tpBody'), msg = box.querySelector('#tpMsg'), go = box.querySelector('#tpGo');
      const fill = () => { const cur = mine.find(t => (t.client_id || '') === who.value); body.value = cur ? cur.body : ''; };
      who.onchange = fill;
      if(edit != null){ who.value = mine[edit].client_id || ''; fill(); edit = null; }
      go.onclick = async () => {
        go.disabled = true; msg.style.color = ''; msg.textContent = '';
        try{
          await rpc(o, 'save_exercise_tip', { p_exercise: exId, p_client: who.value || null, p_body: body.value });
          mine = await rpc(o, 'my_exercise_tips', { p_exercise: exId });
          const keep = who.value; draw(); box.querySelector('#tpWho').value = keep; box.querySelector('#tpWho').onchange(); const m = box.querySelector('#tpMsg'); m.style.color = GOLD; m.textContent = 'Conseil enregistré ✓';
        }catch(e){ go.disabled = false; msg.style.color = '#e5806f'; msg.textContent = 'Impossible d\'enregistrer. Réessaie.'; }
      };
      box.querySelectorAll('[data-e]').forEach(a => a.onclick = () => { edit = Number(a.dataset.e); draw(); box.querySelector('#tpBody').focus(); });
      box.querySelectorAll('[data-d]').forEach(a => a.onclick = async () => {
        const t = mine[Number(a.dataset.d)]; if(!t || !confirm('Supprimer ce conseil ?')) return;
        try{ await rpc(o, 'save_exercise_tip', { p_exercise: exId, p_client: t.client_id || null, p_body: '' }); mine = await rpc(o, 'my_exercise_tips', { p_exercise: exId }); draw(); }catch(e){}
      });
    };
    draw();
  }

  // point d'entrée : host = <div> vide de la fiche, exId = id de l'exercice, o = { url, key, refresh }
  async function mount(host, exId, o){
    if(!host || !exId) return;
    const s = sess(); if(!s || !s.access_token) return;
    css();
    const role = localStorage.getItem('hs_role');
    try{
      if(role === 'coach' || role === 'admin') await coachBlock(host, exId, o);
      else { const rows = await rpc(o, 'exercise_tips_for_me', { p_exercise: exId }); host.innerHTML = clientHtml(rows); }
    }catch(e){ /* silencieux : pas de conseil ou script SQL pas encore lancé */ }
  }
  window.HSTips = { mount };
})();
