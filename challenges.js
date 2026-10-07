// Challenges / événements : un exercice à tenir ou un maximum de reps en temps limité, avec classement.
// window.HSChallenges.render(box, { fetcher, userId }) — fetcher(path, init) renvoie une Response (clé API + jeton de l'utilisateur).
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MEDAL = ['🥇','🥈','🥉'];
  let CTX = null, BOX = null;

  function fmtTime(s){ s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(x).padStart(2,'0'); }
  function fmtVal(c, v){ return c.kind === 'hold' ? fmtTime(v) : v + ' rep' + (v > 1 ? 's' : ''); }
  function kindLabel(c){
    return c.kind === 'hold' ? `${esc(c.exercise_name)} · tiens le plus longtemps possible`
      : `${esc(c.exercise_name)} · un maximum de répétitions en ${fmtTime(c.time_limit_seconds)}`;
  }
  const dFmt = d => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  function status(c){ const n = Date.now(); return n < new Date(c.starts_at) ? 'soon' : (n > new Date(c.ends_at) ? 'ended' : 'live'); }

  async function rpc(name, body){
    const r = await CTX.fetcher('/rest/v1/rpc/' + name, { method:'POST', body: JSON.stringify(body || {}) });
    const t = await r.text();
    if(!r.ok){ let m = t; try{ m = JSON.parse(t).message || t; }catch(e){} throw new Error(m); }
    return t ? JSON.parse(t) : null;
  }
  async function get(path){ const r = await CTX.fetcher(path); if(!r.ok) throw new Error('load_failed'); return r.json(); }

  function ensureCss(){
    if(document.getElementById('hsChCss')) return;
    const st = document.createElement('style'); st.id = 'hsChCss';
    st.textContent = `
      .chl-card{border:1px solid var(--line,#2c2c30);border-radius:16px;padding:14px;margin-bottom:12px;cursor:pointer;background:var(--surface,#16171a)}
      .chl-card h3{margin:0 0 4px;font-size:17px}
      .chl-sub{font-size:13px;opacity:.75}
      .chl-pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid var(--line,#2c2c30);margin-bottom:8px}
      .chl-pill.live{background:var(--accent,#d9ff3f);color:#111;border-color:transparent}
      .chl-h{font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:18px 0 8px}
      .chl-bar{height:8px;border-radius:99px;background:var(--surface-2,#222);overflow:hidden}
      .chl-bar>i{display:block;height:100%;background:var(--accent,#d9ff3f);border-radius:99px}
      .chl-reward{padding:12px 14px;border:1px dashed var(--accent,#d9ff3f);border-radius:14px;margin:12px 0;font-size:14px}
      .chl-pod{display:flex;gap:8px;align-items:flex-end;margin:12px 0}
      .chl-pod>div{flex:1;text-align:center;border:1px solid var(--line,#2c2c30);border-radius:14px;padding:10px 4px;background:var(--surface,#16171a)}
      .chl-pod .m{font-size:26px}.chl-pod .n{font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chl-pod .v{font-size:13px;opacity:.8}
      .chl-row{display:flex;align-items:center;gap:10px;padding:8px 2px;font-size:14px}
      .chl-row .rk{width:26px;font-weight:800;text-align:center;flex:none}
      .chl-row .nm{flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .chl-row .bw{flex:1}.chl-row .vl{flex:none;font-weight:700;font-variant-numeric:tabular-nums}
      .chl-row.me{background:rgba(217,255,63,.09);border-radius:10px}
      .chl-btn{width:100%;padding:14px;border-radius:12px;border:0;background:var(--accent,#d9ff3f);color:#111;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit;margin:6px 0}
      .chl-btn.ghost{background:transparent;color:inherit;border:1px solid var(--line,#2c2c30)}
      .chl-btn:disabled{opacity:.5}
      .chl-ov{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:1400;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center}
      .chl-big{font-size:84px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
      .chl-ov.flash{animation:chlFlash .5s ease-in-out 4}
      @keyframes chlFlash{0%,100%{background:rgba(0,0,0,.92)}50%{background:#22c55e}}
      .chl-in{width:140px;font-size:40px;text-align:center;background:var(--surface-2,#222);border:1px solid var(--line,#2c2c30);border-radius:14px;color:inherit;padding:10px;font-family:inherit}`;
    document.head.appendChild(st);
  }

  async function render(box, ctx){
    CTX = ctx; BOX = box; ensureCss();
    box.innerHTML = '<div class="empty">Chargement…</div>';
    try{ await list(); }catch(e){ console.error(e); box.innerHTML = '<div class="empty">Impossible de charger les challenges. Réessaie.</div>'; }
  }

  async function list(){
    const [chs, mine] = await Promise.all([
      get('/rest/v1/challenges?select=*&is_published=eq.true&order=starts_at.desc&limit=60'),
      get(`/rest/v1/challenge_participants?select=challenge_id&user_id=eq.${CTX.userId}`).catch(() => [])
    ]);
    const joined = new Set(mine.map(m => m.challenge_id));
    if(!chs.length){ BOX.innerHTML = '<div class="empty">Aucun challenge pour le moment. Reviens bientôt, le coach en organise de temps en temps. 💪</div>'; return; }
    const card = c => { const s = status(c); return `<div class="chl-card" data-id="${c.id}">
      <span class="chl-pill ${s}">${s === 'live' ? 'En cours' : s === 'soon' ? 'À venir' : 'Terminé'}</span>${joined.has(c.id) ? ' <span class="chl-pill">Inscrit</span>' : ''}
      <h3>${esc(c.badge_icon)} ${esc(c.title)}</h3><div class="chl-sub">${kindLabel(c)}</div>
      <div class="chl-sub" style="margin-top:4px">${dFmt(c.starts_at)} → ${dFmt(c.ends_at)}</div>
      ${c.reward_text ? `<div class="chl-sub" style="margin-top:6px">🎁 ${esc(c.reward_text)}</div>` : ''}</div>`; };
    const sec = (t, arr) => arr.length ? `<div class="chl-h">${t}</div>${arr.map(card).join('')}` : '';
    BOX.innerHTML = sec('En cours', chs.filter(c => status(c) === 'live')) + sec('À venir', chs.filter(c => status(c) === 'soon')) + sec('Terminés', chs.filter(c => status(c) === 'ended'));
    BOX.querySelectorAll('.chl-card').forEach(el => el.onclick = () => detail(chs.find(c => c.id === el.dataset.id), joined.has(el.dataset.id)));
  }

  async function detail(c, isJoined){
    BOX.innerHTML = '<div class="empty">Chargement…</div>';
    let lb = [], atts = [];
    try{
      [lb, atts] = await Promise.all([
        rpc('challenge_leaderboard', { p_id: c.id }),
        get(`/rest/v1/challenge_attempts?select=started_at,finished_at,value,removed&challenge_id=eq.${c.id}&user_id=eq.${CTX.userId}&order=started_at.desc`).catch(() => [])
      ]);
    }catch(e){ console.error(e); BOX.innerHTML = '<div class="empty">Impossible de charger le challenge. Réessaie.</div>'; return; }
    const s = status(c), top = lb[0] ? lb[0].best : 0;
    const today = new Date().toDateString();
    const usedToday = atts.filter(a => new Date(a.started_at).toDateString() === today).length;
    const myBest = (lb.find(r => r.is_me) || {}).best;
    const total = new Date(c.ends_at) - new Date(c.starts_at), done = Math.min(total, Math.max(0, Date.now() - new Date(c.starts_at)));
    const left = Math.ceil((new Date(c.ends_at) - Date.now()) / 864e5);
    const pod = lb.filter(r => r.rnk <= 3).slice(0, 3);
    BOX.innerHTML = `
      <a class="backlink" id="chBack" style="cursor:pointer;display:inline-block;margin-bottom:10px">← Tous les challenges</a>
      <div class="chl-pill ${s}">${s === 'live' ? 'En cours' : s === 'soon' ? 'À venir' : 'Terminé'}</div>
      <h2 style="margin:0 0 4px">${esc(c.badge_icon)} ${esc(c.title)}</h2>
      <div class="chl-sub">${kindLabel(c)}</div>
      ${c.description ? `<p style="font-size:14px;line-height:1.45;white-space:pre-line">${esc(c.description)}</p>` : ''}
      <div class="chl-bar" style="margin-top:10px"><i style="width:${s === 'ended' ? 100 : Math.round(done / total * 100)}%"></i></div>
      <div class="chl-sub" style="margin-top:4px">${dFmt(c.starts_at)} → ${dFmt(c.ends_at)} · ${s === 'live' ? (left <= 1 ? 'dernier jour !' : 'encore ' + left + ' jours') : s === 'soon' ? 'commence bientôt' : 'terminé'}</div>
      ${c.reward_text ? `<div class="chl-reward">🎁 <b>À gagner :</b> ${esc(c.reward_text)}<div class="chl-sub" style="margin-top:4px">+ un badge exclusif « ${esc(c.title)} » pour tous ceux qui relèvent le défi.</div></div>` : `<div class="chl-reward">🏅 Un badge exclusif « ${esc(c.title)} » pour tous ceux qui relèvent le défi.</div>`}
      ${s === 'ended' ? '' : (isJoined
        ? (s === 'live' ? `<button class="chl-btn" id="chGo" ${usedToday >= 3 ? 'disabled' : ''}>▶ Lancer un essai</button><div class="chl-sub" style="text-align:center">Essais aujourd'hui : ${usedToday}/3 · seul ton meilleur résultat compte</div>` : '<div class="chl-sub">Tu es inscrit. Rendez-vous au lancement !</div>')
        : `<button class="chl-btn" id="chJoin">Je participe</button><div class="chl-sub" style="text-align:center">Ton prénom et l'initiale de ton nom apparaîtront dans le classement.</div>`)}
      ${myBest ? `<div style="margin:12px 0;font-weight:700">Ton meilleur résultat : ${fmtVal(c, myBest)}</div>` : ''}
      <div class="chl-h">Classement</div>
      ${pod.length ? `<div class="chl-pod">${pod.map(r => `<div><div class="m">${MEDAL[r.rnk - 1]}</div><div class="n">${esc(r.name)}</div><div class="v">${fmtVal(c, r.best)}</div></div>`).join('')}</div>` : ''}
      ${lb.length ? lb.map(r => `<div class="chl-row ${r.is_me ? 'me' : ''}"><span class="rk">${r.rnk}</span><span class="nm">${esc(r.name)}${r.is_me ? ' (toi)' : ''}</span><span class="bw"><div class="chl-bar"><i style="width:${top ? Math.max(4, Math.round(r.best / top * 100)) : 0}%"></i></div></span><span class="vl">${fmtVal(c, r.best)}</span></div>`).join('') : '<div class="chl-sub">Personne n\'a encore de résultat. Sois le premier !</div>'}`;
    BOX.querySelector('#chBack').onclick = () => list();
    const j = BOX.querySelector('#chJoin');
    if(j) j.onclick = async () => { j.disabled = true; try{ await rpc('challenge_join', { p_id: c.id }); detail(c, true); }catch(e){ j.disabled = false; alert(e.message); } };
    const g = BOX.querySelector('#chGo');
    if(g) g.onclick = () => attempt(c);
  }

  // ---- Essai plein écran ----
  function overlay(){ const o = document.createElement('div'); o.className = 'chl-ov'; document.body.appendChild(o); return o; }
  async function wake(){ try{ if(navigator.wakeLock) return await navigator.wakeLock.request('screen'); }catch(e){} return null; }
  function vib(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

  async function attempt(c){
    const ov = overlay(), lock = await wake();
    const done = (refresh) => { try{ if(lock) lock.release(); }catch(e){} ov.remove(); if(refresh) detail(c, true); };
    ov.innerHTML = `<div><div style="font-size:18px;opacity:.8;margin-bottom:10px">${esc(c.exercise_name)}</div><div class="chl-big" id="chN">3</div>
      <div style="margin-top:14px;opacity:.7">Mets-toi en position…</div><button class="chl-btn ghost" id="chX" style="margin-top:24px">Annuler</button></div>`;
    let cancelled = false;
    ov.querySelector('#chX').onclick = () => { cancelled = true; done(false); };
    for(let i = 3; i >= 1; i--){
      if(cancelled) return;
      ov.querySelector('#chN').textContent = i; vib(60);
      await new Promise(r => setTimeout(r, 1000));
    }
    if(cancelled) return;
    let id;
    try{ id = await rpc('challenge_start', { p_id: c.id }); }catch(e){ done(false); alert(e.message); return; }
    const t0 = Date.now();
    vib(200);
    if(c.kind === 'hold'){
      ov.innerHTML = `<div><div style="font-size:18px;opacity:.8;margin-bottom:10px">${esc(c.exercise_name)} · tiens bon !</div><div class="chl-big" id="chT">0:00</div>
        <button class="chl-btn" id="chStop" style="margin-top:30px;background:#ef4444;color:#fff">■ J'ai lâché</button></div>`;
      const tick = setInterval(() => { const e = ov.querySelector('#chT'); if(e) e.textContent = fmtTime((Date.now() - t0) / 1000); }, 200);
      ov.querySelector('#chStop').onclick = async () => {
        clearInterval(tick);
        const sec = Math.floor((Date.now() - t0) / 1000);
        await finish(id, sec, c, ov, done);
      };
    } else {
      const limit = c.time_limit_seconds;
      ov.innerHTML = `<div><div style="font-size:18px;opacity:.8;margin-bottom:10px">${esc(c.exercise_name)} · compte tes reps !</div><div class="chl-big" id="chT">${fmtTime(limit)}</div></div>`;
      await new Promise(res => {
        const tick = setInterval(() => {
          const left = limit - (Date.now() - t0) / 1000;
          const e = ov.querySelector('#chT'); if(e) e.textContent = fmtTime(Math.ceil(Math.max(0, left)));
          if(left <= 0){ clearInterval(tick); res(); }
        }, 200);
      });
      vib([300,120,300,120,300]); ov.classList.add('flash');
      ov.innerHTML = `<div><div style="font-size:22px;font-weight:800;margin-bottom:14px">⏱ Temps écoulé !</div><div style="margin-bottom:10px">Combien de répétitions as-tu faites ?</div>
        <input class="chl-in" id="chReps" type="number" inputmode="numeric" min="0" max="999" placeholder="0"><button class="chl-btn" id="chOk" style="margin-top:18px">Valider mon résultat</button></div>`;
      const inp = ov.querySelector('#chReps'); inp.focus();
      ov.querySelector('#chOk').onclick = async () => { const v = parseInt(inp.value); if(!(v >= 0)){ inp.focus(); return; } await finish(id, v, c, ov, done); };
    }
  }
  async function finish(id, value, c, ov, done){
    try{
      const v = await rpc('challenge_finish', { p_attempt: id, p_value: value });
      ov.classList.remove('flash');
      ov.innerHTML = `<div><div style="font-size:20px;opacity:.8">Résultat enregistré</div><div class="chl-big" style="margin:12px 0">${fmtVal(c, v)}</div>
        <button class="chl-btn" id="chDone">Voir le classement</button></div>`;
      ov.querySelector('#chDone').onclick = () => done(true);
    }catch(e){
      ov.innerHTML = `<div><div style="font-size:18px;margin-bottom:14px">Résultat non enregistré</div><div class="chl-sub" style="margin-bottom:16px">${esc(e.message)}</div><button class="chl-btn" id="chDone">Fermer</button></div>`;
      ov.querySelector('#chDone').onclick = () => done(true);
    }
  }

  window.HSChallenges = { render };
})();
