/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// HS Coaching — suppression d'une séance (avec avertissement + export PDF préalable).
// Utilisé par compte.html (le client supprime ses séances) et admin.html (le coach nettoie l'historique d'un client).
// req(path, opts) doit renvoyer le JSON de la réponse (ou null) et lever une erreur si la requête échoue.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureCss(){
    if(document.getElementById('hsHistCss')) return;
    const st = document.createElement('style'); st.id = 'hsHistCss';
    st.textContent = `
      .hsd-overlay{position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center; padding:16px;}
      .hsd-card{width:100%; max-width:420px; max-height:92vh; overflow-y:auto; background:var(--surface,#16171a); color:var(--ink,#f5f5f5); border:1px solid var(--line,#2c2c30); border-radius:18px; padding:22px;}
      .hsd-card h3{font-size:18px; margin:0 0 6px;}
      .hsd-what{font-size:14px; color:var(--ink-muted,#9a9a9e); margin:0 0 14px; line-height:1.4;}
      .hsd-what b{color:var(--ink,#f5f5f5);}
      .hsd-warn{background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.45); color:#ffb4b4; border-radius:12px; padding:12px 14px; font-size:13.5px; line-height:1.45; margin-bottom:12px;}
      .hsd-warn b{color:#ff9a9a;}
      .hsd-tip{font-size:13px; color:var(--ink-muted,#9a9a9e); margin:0 0 10px;}
      .hsd-btn{display:block; width:100%; box-sizing:border-box; text-align:center; font-family:inherit; font-size:14px; font-weight:700; padding:12px 16px; border-radius:999px; border:1px solid var(--line,#2c2c30); background:var(--surface-2,#1f2024); color:var(--ink,#f5f5f5); cursor:pointer; margin-top:8px;}
      .hsd-btn.danger{background:#d64545; border-color:#d64545; color:#fff;}
      .hsd-btn[disabled]{opacity:.4; cursor:not-allowed;}
      .hsd-check{display:flex; gap:10px; align-items:flex-start; font-size:13.5px; line-height:1.4; margin:14px 0 4px; cursor:pointer;}
      .hsd-check input{margin-top:3px; width:18px; height:18px; flex:none;}
      .hsd-toast{position:fixed; left:50%; bottom:28px; transform:translateX(-50%); background:var(--surface-2,#1f2024); color:var(--ink,#f5f5f5); border:1px solid var(--line,#2c2c30); padding:11px 18px; border-radius:999px; font-size:13.5px; z-index:210; box-shadow:0 8px 24px rgba(0,0,0,.4);}
      #hsPrintArea{display:none;}
      @media print{
        body > *:not(#hsPrintArea){display:none !important;}
        body{background:#fff !important;}
        #hsPrintArea{display:block !important; color:#000; background:#fff; padding:6px 4px; font-family:Inter,Arial,sans-serif;}
        #hsPrintArea h1{font-size:22px; margin:0 0 4px; color:#000;}
        #hsPrintArea .pm{font-size:12px; color:#555; margin-bottom:18px;}
        #hsPrintArea .ps{border-top:1px solid #bbb; padding:12px 0; page-break-inside:avoid;}
        #hsPrintArea .ps h2{font-size:15px; margin:0 0 2px; color:#000;}
        #hsPrintArea .ps .pd{font-size:12px; color:#555; margin-bottom:8px;}
        #hsPrintArea .pe{font-weight:700; font-size:13px; margin:8px 0 3px;}
        #hsPrintArea .pr{display:flex; justify-content:space-between; font-size:12.5px; padding:2px 0; border-bottom:1px dotted #ccc;}
      }
    `;
    document.head.appendChild(st);
  }

  function toast(msg){
    ensureCss();
    const t = document.createElement('div'); t.className = 'hsd-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  function fmtDur(s){
    if(!s.completed_at) return '';
    const ms = s.declared_seconds != null ? s.declared_seconds * 1000 : new Date(s.completed_at) - new Date(s.started_at);
    if(ms <= 2000) return '';
    const tot = Math.round(ms / 1000), h = Math.floor(tot / 3600), m = Math.floor((tot % 3600) / 60), sec = tot % 60;
    return h ? `${h} h ${String(m).padStart(2,'0')} min ${String(sec).padStart(2,'0')} s` : (m ? `${m} min ${String(sec).padStart(2,'0')} s` : `${sec} s`);
  }

  async function pageAll(req, path){
    let out = [];
    for(let i = 0; i < 40; i++){
      const rows = await req(`${path}&limit=1000&offset=${i * 1000}`);
      if(!Array.isArray(rows)) throw new Error('load_failed');
      out = out.concat(rows);
      if(rows.length < 1000) break;
    }
    return out;
  }

  // Export PDF : une séance (sessionId) ou tout l'historique fourni (sessions)
  async function exportPdf(o){
    ensureCss();
    let sessions = o.sessions || [];
    let logs;
    try{
      if(o.sessionId){
        sessions = sessions.filter(s => s.id === o.sessionId);
        logs = await req_(o, `/rest/v1/session_logs?select=session_id,set_number,step,hold_seconds,reps,charge,duration_seconds,completed_at,exercises(name)&session_id=eq.${encodeURIComponent(o.sessionId)}&order=completed_at,id`);
      } else {
        const qq = sel => `/rest/v1/session_logs?select=${sel}&sessions.user_id=eq.${encodeURIComponent(o.userId)}&order=id`;
        const sel0 = 'id,session_id,set_number,step,hold_seconds,reps,charge,duration_seconds,completed_at,exercise_id,exercises(name),sessions!inner(user_id,started_at,date_unknown)';
        try{ logs = await pageAll(o.req, qq(sel0.replace('duration_seconds,', 'duration_seconds,distance_km,'))); }
        catch(e0){ logs = await pageAll(o.req, qq(sel0)); }
      }
    }catch(e){ console.error(e); toast("Export impossible pour le moment."); return false; }
    if(window.HSExport){
      const when = new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
      const ok = await HSExport.pdf({
        title: "Historique d'entraînement" + (o.who ? ' - ' + o.who : ''),
        subtitle: 'HS Coaching - exporté le ' + when,
        filename: HSExport.fileName(o.sessionId ? 'seance' : (o.filePrefix || 'historique'), o.who),
        blocks: HSExport.sessionBlocks(sessions, logs),
        progress: (!o.sessionId && o.progress) ? { who: o.name || o.who, periodDays: 0, sessions: sessions, rows: logs.filter(l => sessions.some(s => s.id === l.session_id)) } : null
      });
      if(ok) return true;
    }
    const bySession = {};
    logs.forEach(l => { (bySession[l.session_id] = bySession[l.session_id] || []).push(l); });
    const blocks = sessions.filter(s => s.completed_at || bySession[s.id]).map(s => {
      const d = new Date(s.started_at);
      const title = (s.programs && s.programs.name ? s.programs.name : 'Séance libre') + (s.day_label ? ' · ' + s.day_label : '');
      const mine = (bySession[s.id] || []).slice().sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at) || a.set_number - b.set_number);
      const byEx = {}; const order = []; let vol = 0;
      mine.forEach(l => {
        const n = (l.exercises && l.exercises.name) || 'Exercice';
        if(!byEx[n]){ byEx[n] = []; order.push(n); }
        byEx[n].push(l);
        if(!l.duration_seconds && l.reps && l.charge) vol += l.reps * l.charge;
      });
      const body = order.map(n => {
        const rows = byEx[n].filter(l => l.reps != null || l.charge != null).sort((a, b) => (a.set_number - b.set_number) || ((a.step || 0) - (b.step || 0)));
        return `<div class="pe">${esc(n)}</div>` + (rows.length ? rows.map(l => `<div class="pr"><span>Série ${l.set_number}${l.step ? '.' + l.step : ''}</span><span>${l.reps != null ? l.reps + ' reps' : '–'}${l.hold_seconds ? ' (' + l.hold_seconds + ' s)' : ''}${l.charge != null ? ' · ' + l.charge + ' kg' : ''}</span></div>`).join('') : '<div class="pr"><span>Rien noté</span></div>');
      }).join('') || '<div class="pr"><span>Aucune série enregistrée</span></div>';
      const meta = [fmtDur(s) ? 'Durée : ' + fmtDur(s) : '', vol ? 'Poids total soulevé : ' + Math.round(vol).toLocaleString('fr-FR') + ' kg' : ''].filter(Boolean).join(' · ');
      return `<div class="ps"><h2>${esc(d.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}))} — ${esc(title)}</h2><div class="pd">${esc(meta)}</div>${body}</div>`;
    }).join('');
    let area = document.getElementById('hsPrintArea');
    if(!area){ area = document.createElement('div'); area.id = 'hsPrintArea'; document.body.appendChild(area); }
    area.innerHTML = `<h1>Historique d'entraînement${o.who ? ' — ' + esc(o.who) : ''}</h1><div class="pm">HS Coaching · exporté le ${new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})} · ${sessions.length} séance${sessions.length > 1 ? 's' : ''}</div>${blocks || '<p>Aucune séance.</p>'}`;
    window.print();
    return true;
  }
  function req_(o, path){ return o.req(path); }

  // Fenêtre de confirmation de suppression
  function confirmDelete(o){
    ensureCss();
    const s = o.session;
    const d = new Date(s.started_at);
    const label = (s.programs && s.programs.name ? s.programs.name : 'Séance libre') + (s.day_label ? ' · ' + s.day_label : '');
    const ov = document.createElement('div'); ov.className = 'hsd-overlay';
    ov.innerHTML = `<div class="hsd-card" role="dialog" aria-modal="true">
      <h3>Supprimer cette séance ?</h3>
      <p class="hsd-what"><b>${esc(label)}</b><br>${esc(d.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}))}${o.who ? '<br>' + esc(o.who) : ''}</p>
      <div class="hsd-warn">⚠️ <b>Suppression définitive.</b> La séance et toutes ses séries (répétitions, charges) seront effacées <b>sans aucun moyen de les récupérer</b>. Les statistiques, la progression et les badges seront recalculés sans elle.</div>
      <p class="hsd-tip">💡 Pense à exporter avant de supprimer.</p>
      <button type="button" class="hsd-btn" id="hsdExport">📄 Exporter cette séance (PDF)</button>
      <label class="hsd-check"><input type="checkbox" id="hsdOk"><span>J'ai compris que la suppression est définitive.</span></label>
      <button type="button" class="hsd-btn danger" id="hsdDel" disabled>Supprimer définitivement</button>
      <button type="button" class="hsd-btn" id="hsdCancel">Annuler</button>
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    ov.querySelector('#hsdCancel').onclick = close;
    ov.querySelector('#hsdOk').onchange = e => { ov.querySelector('#hsdDel').disabled = !e.target.checked; };
    ov.querySelector('#hsdExport').onclick = () => exportPdf({ req: o.req, userId: o.userId, sessions: [s], sessionId: s.id, who: o.who });
    ov.querySelector('#hsdDel').onclick = async () => {
      const btn = ov.querySelector('#hsdDel'); btn.disabled = true; btn.textContent = 'Suppression…';
      try{
        const gone = await o.req(`/rest/v1/sessions?id=eq.${encodeURIComponent(s.id)}`, { method:'DELETE', headers:{ Prefer:'return=representation' } });
        if(!Array.isArray(gone) || !gone.length) throw new Error('not_deleted');
      }catch(e){
        console.error(e);
        btn.disabled = false; btn.textContent = 'Supprimer définitivement';
        toast("La séance n'a pas pu être supprimée. Réessaie.");
        return;
      }
      close();
      toast('Séance supprimée');
      if(typeof o.onDone === 'function') o.onDone();
    };
  }

  // Demande de modification d'une séance terminée (le coach doit approuver)
  function requestEdit(o){
    ensureCss();
    const s = o.session;
    const d = new Date(s.started_at);
    const label = (s.programs && s.programs.name ? s.programs.name : 'Séance libre') + (s.day_label ? ' · ' + s.day_label : '');
    const ov = document.createElement('div'); ov.className = 'hsd-overlay';
    ov.innerHTML = `<div class="hsd-card" role="dialog" aria-modal="true">
      <h3>Demander une modification</h3>
      <p class="hsd-what"><b>${esc(label)}</b><br>${esc(d.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}))}</p>
      <div class="hsd-tip" style="color:var(--ink,#f5f5f5);">Une séance terminée est verrouillée. Explique à ton coach ce que tu veux corriger : il devra l'approuver avant que tu puisses modifier tes séries.</div>
      <textarea id="hsdMsg" rows="4" maxlength="500" placeholder="Ex : j'ai noté 60 kg au lieu de 50 kg sur le développé couché" style="width:100%; box-sizing:border-box; background:var(--surface-2,#1f2024); color:var(--ink,#f5f5f5); border:1px solid var(--line,#2c2c30); border-radius:12px; padding:12px; font-family:inherit; font-size:14px; resize:vertical;"></textarea>
      <button type="button" class="hsd-btn" id="hsdSend" style="background:var(--accent,#fff); color:var(--accent-ink,#0b0b0c);">Envoyer la demande</button>
      <button type="button" class="hsd-btn" id="hsdCancel">Annuler</button>
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    ov.querySelector('#hsdCancel').onclick = close;
    ov.querySelector('#hsdSend').onclick = async () => {
      const msg = ov.querySelector('#hsdMsg').value.trim();
      if(msg.length < 5){ toast('Explique ce que tu veux corriger'); return; }
      const btn = ov.querySelector('#hsdSend'); btn.disabled = true;
      try{
        await o.req('/rest/v1/session_edit_requests', { method:'POST', headers:{ Prefer:'return=minimal' }, body: JSON.stringify({ session_id: s.id, message: msg }) });
      }catch(e){ console.error(e); btn.disabled = false; toast("Envoi impossible. Réessaie."); return; }
      close(); toast('Demande envoyée à ton coach');
      if(typeof o.onDone === 'function') o.onDone();
    };
  }

  // Remet les exercices d'une séance dans l'ordre du programme (puis, pour les exercices ajoutés ou hors programme, dans l'ordre où ils ont été faits).
  // Sans cela, l'affichage dépendait de l'ordre interne de la base et mélangeait les exercices.
  // « ~5/5,4/4,3/3,2/2,1|45° » -> séries variables (même format que programmes.html)
  function parseScheme(r){
    if(typeof r !== 'string' || r.charAt(0) !== '~') return null;
    const [list, note] = r.slice(1).split('|');
    const sets = (list || '').split(',').map(t => { const [a, b] = t.trim().split('/'); const reps = parseInt(a), hold = parseInt(b); return reps > 0 ? { reps, hold: hold > 0 ? hold : 0 } : null; }).filter(Boolean);
    return sets.length ? { sets, note: (note || '').trim() } : null;
  }
  // Déplace un exercice (-1 = monter, +1 = descendre) et enregistre le nouvel ordre de toute la séance. Renvoie la nouvelle liste d'ids.
  async function moveExercise(req, sessionId, orderedIds, exId, dir){
    const ids = orderedIds.slice(), i = ids.indexOf(exId), j = i + dir;
    if(i < 0 || j < 0 || j >= ids.length) return ids;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for(let k = 0; k < ids.length; k++){
      await req(`/rest/v1/session_logs?session_id=eq.${sessionId}&exercise_id=eq.${ids[k]}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body: JSON.stringify({ exercise_order: k + 1 }) });
    }
    return ids;
  }
  async function orderLogs(logs, sessionId, req){
    const list = Array.isArray(logs) ? logs.slice() : [];
    const rank = {}, custom = {}, timed = {}, sst = {}, scheme = {};
    try{
      const ss = await req(`/rest/v1/sessions?select=program_id,day_label&id=eq.${sessionId}`);
      const s = ss && ss[0];
      if(s && s.program_id){
        let pe;
        try{ pe = await req(`/rest/v1/program_exercises?select=exercise_id,variant_exercise_id,order_index,day_label,custom_name,reps,superset_group&program_id=eq.${s.program_id}&order=order_index`); }
        catch(e1){ pe = await req(`/rest/v1/program_exercises?select=exercise_id,variant_exercise_id,order_index,day_label&program_id=eq.${s.program_id}&order=order_index`); }
        const dayPe = (pe || []).filter(x => !s.day_label || !x.day_label || x.day_label === s.day_label);
        // étiquettes de superset : A1, A2, B1… (une lettre par superset, un numéro par exercice), comme dans le programme
        let letter = -1, pos = 0, prevG = null;
        dayPe.forEach(x => {
          const g = x.superset_group;
          if(g == null){ prevG = null; return; }
          if(g === prevG) pos++; else { letter++; pos = 1; prevG = g; }
          if(sst[x.exercise_id] == null) sst[x.exercise_id] = String.fromCharCode(65 + letter) + pos;
          if(x.variant_exercise_id && sst[x.variant_exercise_id] == null) sst[x.variant_exercise_id] = String.fromCharCode(65 + letter) + pos;
        });
        dayPe.forEach((x, i) => {
          if(rank[x.exercise_id] == null){ rank[x.exercise_id] = i; if(x.reps && x.reps.charAt(0) === '~'){ const sc = parseScheme(x.reps); if(sc) scheme[x.exercise_id] = sc; } if(x.custom_name) custom[x.exercise_id] = x.custom_name; if(x.reps && x.reps.charAt(0) !== '~' && /\d\s*(min|sec|s\b|m\b|'|")/i.test(x.reps)) timed[x.exercise_id] = true; }
          if(x.variant_exercise_id && rank[x.variant_exercise_id] == null) rank[x.variant_exercise_id] = i + 0.5;
        });
      }
    }catch(e){ console.error(e); }
    list.forEach(l => { const sc = scheme[l.exercise_id]; const ti = (l.step || l.set_number) - 1; if(sc && sc.sets[ti]){ l.tgt = sc.sets[ti]; l.tgt_note = sc.note; l.tgt_all = sc.sets; } if(sst[l.exercise_id]) l.ss_tag = sst[l.exercise_id]; if(custom[l.exercise_id]) l.custom_name = custom[l.exercise_id]; if(timed[l.exercise_id] || (l.exercises && String(l.exercises.category||'').toLowerCase() === 'cardio')) l.timed = true; });
    const lab = {}; list.forEach(l => { if(l.exercise_label) lab[l.exercise_id] = l.exercise_label; });
    list.forEach(l => { if(lab[l.exercise_id]) l.custom_name = lab[l.exercise_id]; });
    const first = {};
    list.forEach(l => { const t = l.completed_at ? Date.parse(l.completed_at) : 0; if(first[l.exercise_id] == null || t < first[l.exercise_id]) first[l.exercise_id] = t; });
    // ordre choisi à la main (exercise_order) d'abord ; sinon ordre du programme ; puis exercices hors programme
    const ord = {}; list.forEach(l => { if(l.exercise_order != null) ord[l.exercise_id] = l.exercise_order; });
    const R = l => ord[l.exercise_id] != null ? ord[l.exercise_id] : 1000 + (rank[l.exercise_id] == null ? 1e6 : rank[l.exercise_id]);
    return list.sort((a, b) => (R(a) - R(b)) || (first[a.exercise_id] - first[b.exercise_id]) || String(a.exercise_id).localeCompare(String(b.exercise_id)) || (a.set_number - b.set_number) || ((a.step || 0) - (b.step || 0)) || (Date.parse(a.completed_at || 0) - Date.parse(b.completed_at || 0)));
  }

  // Fenêtre de choix d'un exercice (ajout à une séance passée) : filtres par muscle + images, comme dans l'éditeur de programme.
  // Renvoie l'id choisi, ou null si annulé. Les filtres utilisent muscles.js / admin-programmes.js lorsqu'ils sont chargés.
  let EXLIST = null;
  async function pickExercise(req){
    if(!EXLIST){
      try{ EXLIST = await req('/rest/v1/exercises?select=id,name,category,primary_muscles,secondary_muscles,image_url,image_start_url,image_peak_url&order=name&limit=2000') || []; }
      catch(e){ console.error(e); toast("Liste des exercices indisponible. Réessaie."); return null; }
    }
    const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hasF = typeof pickMatchesGroup === 'function' && typeof pickMuscleLabels === 'function' && typeof GROUPS !== 'undefined';
    if(!document.getElementById('hsPickCss')){
      const st = document.createElement('style'); st.id = 'hsPickCss';
      st.textContent = `
        .hsp-chips{display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;}
        .hsp-chip{background:var(--surface-2,#1f2024); border:1px solid var(--line,#2c2c30); color:var(--ink-muted,#9a9a9e); border-radius:99px; padding:6px 12px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit;}
        .hsp-chip.on{background:var(--accent,#fff); border-color:var(--accent,#fff); color:var(--accent-ink,#0b0b0c);}
        .hsp-grid{align-content:start; display:grid; grid-template-columns:repeat(auto-fill,minmax(84px,1fr)); gap:8px; overflow-y:auto; flex:1; padding:2px;}
        .hsp-card{display:flex; flex-direction:column; align-items:center; gap:5px; background:var(--surface-2,#1f2024); border:1.5px solid var(--line,#2c2c30); border-radius:10px; padding:6px; cursor:pointer; text-align:center; font-family:inherit; font-size:10.5px; color:var(--ink,#f5f5f5);}
        .hsp-card:hover,.hsp-card:focus{border-color:var(--accent,#fff);}
        .hsp-card img{width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:6px; background:var(--surface,#16171a);}
        .hsp-card i{width:100%; aspect-ratio:1/1; border-radius:6px; background:var(--surface,#16171a); display:flex; align-items:center; justify-content:center; color:var(--ink-muted,#9a9a9e); font-size:9px; font-style:normal; text-transform:uppercase; letter-spacing:.05em; padding:4px; box-sizing:border-box;}
        .hsp-card span{display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.2;}`;
      document.head.appendChild(st);
    }
    return new Promise(resolve => {
      let g = 'Tous', mu = null;
      const m = document.createElement('div');
      m.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:12px;';
      m.innerHTML = `<div style="background:var(--surface,#16171a);color:var(--ink,#f5f5f5);border:1px solid var(--line,#2c2c30);width:100%;max-width:560px;height:88vh;display:flex;flex-direction:column;padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><b style="font-size:17px;">Ajouter un exercice</b><button type="button" data-x aria-label="Fermer" style="background:none;border:1px solid var(--line,#2c2c30);color:inherit;padding:4px 10px;cursor:pointer;">✕</button></div>
        <input type="text" placeholder="Chercher : nom, muscle…" style="width:100%;box-sizing:border-box;background:var(--surface-2,#1f2024);border:1px solid var(--line,#2c2c30);color:inherit;padding:12px;font:inherit;margin-bottom:8px;">
        <div data-chips class="hsp-chips"></div><div data-sub class="hsp-chips" style="display:none;"></div>
        <div data-list class="hsp-grid"></div></div>`;
      document.body.appendChild(m);
      const done = id => { m.remove(); resolve(id); };
      const grid = m.querySelector('[data-list]'), inp = m.querySelector('input'), chips = m.querySelector('[data-chips]'), sub = m.querySelector('[data-sub]');
      const drawChips = () => {
        if(!hasF){ chips.style.display = 'none'; return; }
        chips.innerHTML = ['Tous', ...GROUPS].map(x => `<button type="button" class="hsp-chip${x === g ? ' on' : ''}" data-g="${esc(x)}">${esc(x)}</button>`).join('');
        if(g === 'Tous'){ sub.style.display = 'none'; sub.innerHTML = ''; return; }
        const c = {};
        EXLIST.filter(e => pickMatchesGroup(e, g)).forEach(e => pickMuscleLabels(e, g).forEach(l => c[l] = (c[l] || 0) + 1));
        let ms = Object.keys(c).sort((a, b) => c[b] - c[a]);
        if(g === 'Pectoraux' && typeof PEC_ORDER !== 'undefined') ms = PEC_ORDER.filter(x => c[x]);
        if(!ms.length){ sub.style.display = 'none'; sub.innerHTML = ''; return; }
        sub.style.display = 'flex';
        sub.innerHTML = ['Tous', ...ms].map(x => `<button type="button" class="hsp-chip${(x === 'Tous' ? mu === null : mu === x) ? ' on' : ''}" data-m="${x === 'Tous' ? '' : esc(x)}">${esc(x)}</button>`).join('');
      };
      const draw = () => {
        const q = norm(inp.value);
        let base = EXLIST;
        if(hasF){ base = base.filter(e => pickMatchesGroup(e, g)); if(g !== 'Tous' && mu) base = base.filter(e => pickMuscleLabels(e, g).includes(mu)); }
        const r = (!q ? base : base.filter(e => norm(e.name).includes(q) || norm(e.category).includes(q) || (e.primary_muscles || []).some(x => norm(x).includes(q)) || (e.secondary_muscles || []).some(x => norm(x).includes(q)))).slice(0, 120);
        grid.innerHTML = r.length ? r.map(e => { const im = e.image_start_url || e.image_url || e.image_peak_url; return `<button type="button" class="hsp-card" data-id="${esc(e.id)}">${im ? `<img src="${esc(im)}" alt="" loading="lazy" onerror="this.outerHTML='<i>${esc(e.category || '')}</i>'">` : `<i>${esc(e.category || '')}</i>`}<span>${esc(e.name)}</span></button>`; }).join('') : '<div style="opacity:.7;padding:10px;grid-column:1/-1;">Aucun exercice trouvé.</div>';
      };
      chips.onclick = ev => { const b = ev.target.closest('[data-g]'); if(!b) return; g = b.dataset.g; mu = null; drawChips(); draw(); };
      sub.onclick = ev => { const b = ev.target.closest('[data-m]'); if(!b) return; mu = b.dataset.m || null; drawChips(); draw(); };
      inp.oninput = draw; drawChips(); draw();
      grid.onclick = ev => { const b = ev.target.closest('[data-id]'); if(b) done(b.dataset.id); };
      m.querySelector('[data-x]').onclick = () => done(null);
      m.onclick = ev => { if(ev.target === m) done(null); };
    });
  }

  window.HSHistory = { confirmDelete, exportPdf, requestEdit, toast, orderLogs, pickExercise, moveExercise, parseScheme };
})();

;try{window.__hs_his='HSC-HST-2026-10-C9B4';}catch(e){}
