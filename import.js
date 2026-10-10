/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// HS Coaching — import d'anciennes séances (texte collé ou captures d'écran).
// Les séances importées comptent pour la progression mais JAMAIS pour les badges (source « manual » + imported = true).
// La lecture de captures passe par la fonction Supabase « parse-screenshot » : si elle est supprimée ou sans clé, seul ce bouton se désactive.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = s => parseFloat(String(s).replace(',', '.'));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- Lecture du texte collé (tableau Notes / Excel : une colonne = une séance) ----------
  function parseDate(s){
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(s).trim()); if(!m) return '';
    let y = +m[3]; if(y < 100) y += 2000;
    return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  }
  function parseCharges(cell, n){
    const raw = cell.trim(); if(!raw) return { ch: Array(n).fill(null), note: '', flag: '' };
    if(/^vide$/i.test(raw)) return { ch: Array(n).fill(null), note: 'Poids du corps', flag: '' };
    const toks = raw.split('/').map(t => t.trim()).filter(Boolean);
    let note = '', flag = '';
    const vals = toks.map(t => {
      const m = t.match(/\d+(?:[.,]\d+)?/);
      const txt = t.replace(/\d+(?:[.,]\d+)?/, '').replace(/\s+/g, ' ').trim();
      if(txt) note = note ? note + ' ' + txt : txt;
      return m ? num(m[0]) : null;
    });
    if(note) flag = 'Texte dans la charge : « ' + raw + ' », vérifie le kg';
    let ch;
    if(vals.length === 1) ch = Array(n).fill(vals[0]);
    else if(vals.length === n) ch = vals;
    else { ch = Array.from({ length: n }, (_, i) => vals[Math.min(i, vals.length - 1)] ?? null); flag = (flag ? flag + ' · ' : '') + vals.length + ' charges pour ' + n + ' séries : la dernière est répétée'; }
    return { ch, note, flag };
  }
  function parseReps(cell){
    const out = []; let flag = '';
    cell.split('/').forEach(t => {
      t = t.trim(); if(!t) return;
      const m = t.match(/^(\d+)/);
      if(!m){ flag = 'Valeur ignorée : « ' + t + ' »'; return; }
      let v = +m[1];
      if(v > 60){ flag = 'Valeur étrange : « ' + t + ' »'; v = parseInt(String(v).slice(0, String(v).length / 2)) || v; }
      if(/\(/.test(t)) flag = flag || 'Précision entre parenthèses : « ' + t + ' »';
      out.push(v);
    });
    return { reps: out, flag };
  }
  function parseText(text){
    const lines = text.replace(/\r/g, '').split('\n');
    const sess = {}, order = [], issues = [];
    let section = null, header = [];
    const sOf = (sec, col) => {
      const k = sec + '|' + col;
      if(!sess[k]){ const h = header[col] || {}; sess[k] = { section: sec, label: h.label || '', date: h.date || '', rows: [] }; order.push(k); }
      return sess[k];
    };
    for(let i = 0; i < lines.length; i++){
      const c = lines[i].split('\t').map(x => x.trim()); const first = c[0] || ''; const rest = c.slice(1);
      if(!c.some(Boolean)){ if(section) header = []; continue; }
      if(first && !rest.some(Boolean) && !/^\d+x\d+$/i.test(first)){ section = first; header = []; continue; }
      if(!first){ header = rest.map(x => ({ date: parseDate(x), label: parseDate(x) ? '' : x })); continue; }
      if(/^\d+x\d+$/i.test(first)) continue;
      const next = (lines[i + 1] || '').split('\t').map(x => x.trim());
      if(!/^\d+x\d+$/i.test(next[0] || '')){ issues.push('Ligne ignorée : ' + first); continue; }
      const repsCells = next.slice(1);
      const width = Math.max(rest.length, repsCells.length);
      for(let col = 0; col < width; col++){
        const chCell = rest[col] || '', rpCell = repsCells[col] || '';
        if(!chCell && !rpCell) continue;
        if(!/\d/.test(rpCell)) continue;
        const R = parseReps(rpCell), C = parseCharges(chCell, R.reps.length);
        sOf(section || 'Séance', col).rows.push({ ex: first, note: C.note, flag: [R.flag, C.flag].filter(Boolean).join(' · '), sets: R.reps.map((r, k) => ({ reps: r, kg: C.ch[k], sec: null })) });
      }
      i++;
    }
    return { list: order.map(k => sess[k]).filter(s => s.rows.length), issues };
  }
  // Résultat JSON de la lecture d'image -> même structure
  function fromVision(sessions){
    return (sessions || []).map(s => ({
      section: s.label || 'Séance importée', label: '', date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : '',
      rows: (s.exercises || []).filter(e => e && e.name && (e.sets || []).length).map(e => ({
        ex: String(e.name), note: e.note || '', flag: '',
        sets: e.sets.map(t => ({ reps: Number.isFinite(+t.reps) && t.reps !== null ? Math.round(+t.reps) : null, kg: Number.isFinite(+t.kg) && t.kg !== null ? +t.kg : null, sec: Number.isFinite(+t.seconds) && t.seconds ? Math.round(+t.seconds) : null }))
      })).filter(e => e.sets.length)
    })).filter(s => s.rows.length);
  }

  // ---------- Correspondance avec la bibliothèque ----------
  let LIB = null;
  async function loadLib(req){
    if(LIB) return LIB;
    LIB = await req('/rest/v1/exercises?select=id,name&order=name&limit=2000');
    LIB.forEach(e => e._n = norm(e.name));
    return LIB;
  }
  function guess(name){
    const n = norm(name); if(!n || !LIB) return null;
    const exact = LIB.find(e => e._n === n); if(exact) return exact;
    const tk = new Set(n.split(' ').filter(w => w.length > 1));
    let best = null, bs = 0;
    LIB.forEach(e => {
      const et = new Set(e._n.split(' ').filter(w => w.length > 1));
      let inter = 0; tk.forEach(w => { if(et.has(w) || (w.length >= 5 && [...et].some(x => x.length >= 5 && x.slice(0, 5) === w.slice(0, 5)))) inter++; });
      const sc = inter / Math.max(1, new Set([...tk, ...et]).size);
      if(sc > bs){ bs = sc; best = e; }
    });
    return bs >= 0.5 ? best : null;
  }

  // ---------- Images ----------
  function shrink(file){
    return new Promise((ok, ko) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok({ media_type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('image')); };
      img.src = url;
    });
  }

  // ---------- Interface ----------
  const CSS = `.imp-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;overflow:auto;padding:14px}
  .imp-box{max-width:720px;margin:0 auto;background:var(--bg,#0b0b0c);border:1px solid var(--line,#2c2c30);border-radius:16px;padding:16px}
  .imp-box h2{font-size:20px;margin:0 0 6px}.imp-box p{margin:0 0 10px;font-size:13.5px;color:var(--ink-muted,#9a9a9e)}
  .imp-warn{border:1px solid var(--accent,#fff);border-radius:12px;padding:10px 12px;font-size:13.5px;margin:10px 0}
  .imp-box textarea{width:100%;height:150px;background:var(--surface,#16171a);color:var(--ink,#f5f5f5);border:1px solid var(--line,#2c2c30);border-radius:10px;padding:10px;font:12px monospace}
  .imp-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
  .imp-sess{border:1px solid var(--line,#2c2c30);border-radius:12px;margin:8px 0;background:var(--surface,#16171a)}
  .imp-sess>summary{padding:10px 12px;cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;list-style:none}
  .imp-sess>summary::-webkit-details-marker{display:none}.imp-sess .t{font-weight:700}.imp-sess .m{font-size:12px;color:var(--ink-muted,#9a9a9e)}
  .imp-sess table{width:100%;border-collapse:collapse;font-size:13px}.imp-sess td,.imp-sess th{padding:5px 8px;border-top:1px solid var(--line,#2c2c30);text-align:left}
  .imp-sess th{font-size:11px;color:var(--ink-muted,#9a9a9e);font-weight:500}
  .imp-box input[type=number],.imp-box input[type=date],.imp-box input[type=text]{background:var(--bg,#0b0b0c);color:var(--ink,#f5f5f5);border:1px solid var(--line,#2c2c30);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px}
  .imp-map{display:flex;gap:8px;align-items:center;margin:5px 0;font-size:13px;flex-wrap:wrap}.imp-map span.n{min-width:140px;font-weight:600}.imp-map input{flex:1;min-width:180px}
  .imp-bad{border-color:#ffb020!important}.imp-flag{color:#ffb020;font-size:12px}`;

  function open(o){
    // o = { req(path, opts) -> json, fn(name, body) -> Response, userId, onDone() }
    if(!document.getElementById('imp-css')){ const st = document.createElement('style'); st.id = 'imp-css'; st.textContent = CSS; document.head.appendChild(st); }
    const ov = document.createElement('div'); ov.className = 'imp-ov';
    ov.innerHTML = '<div class="imp-box"></div>'; document.body.appendChild(ov);
    const box = ov.firstChild; let data = { list: [], issues: [] };
    const close = () => ov.remove();
    const toast = m => (window.HSHistory && HSHistory.toast) ? HSHistory.toast(m) : alert(m);

    const WARN = '<div class="imp-warn">ℹ️ Les séances importées comptent pour ta <b>progression</b> (courbes, records, volume) mais <b>pas pour les badges</b>. La date est facultative.</div>';
    function stepInput(msg){
      box.innerHTML = `<h2>Importer d'anciennes séances</h2><p>Colle tes notes (tableau Notes, Excel…).</p>${WARN}${msg ? `<p class="imp-flag">${esc(msg)}</p>` : ''}
        <textarea id="impTxt" placeholder="Colle ici ton tableau…" spellcheck="false"></textarea>
        <div class="imp-row"><button type="button" class="btn btn-accent" id="impGo">Analyser le texte</button>
        <button type="button" class="btn btn-ghost" id="impX">Annuler</button></div><div id="impSt" class="imp-flag" style="margin-top:8px"></div>`;
      box.querySelector('#impX').onclick = close;
      box.querySelector('#impGo').onclick = async () => {
        const t = box.querySelector('#impTxt').value; if(!t.trim()){ toast('Colle d\'abord ton texte'); return; }
        data = parseText(t); await stepPreview(); };
    }
    async function stepPreview(){
      box.innerHTML = '<p>Chargement…</p>';
      try{ await loadLib(o.req); }catch(e){ console.error(e); stepInput('Impossible de charger la bibliothèque d\'exercices. Réessaie.'); return; }
      if(!data.list.length){ stepInput('Aucune séance reconnue dans ce texte.'); return; }
      const names = [...new Set(data.list.flatMap(s => s.rows.map(r => r.ex)))];
      const map = {}; names.forEach(n => { const g = guess(n); map[n] = g ? g.name : ''; });
      const dl = '<datalist id="impLib">' + LIB.map(e => `<option value="${esc(e.name)}">`).join('') + '</datalist>';
      const nSets = data.list.reduce((a, s) => a + s.rows.reduce((b, r) => b + r.sets.length, 0), 0);
      box.innerHTML = `<h2>Vérifie avant d'importer</h2>${WARN}
        <p><b>${data.list.length}</b> séance${data.list.length > 1 ? 's' : ''} · <b>${nSets}</b> séries${data.issues.length ? ` · <span class="imp-flag">${data.issues.length} ligne(s) non comprise(s)</span>` : ''}</p>
        <h3 style="font-size:15px;margin:12px 0 4px">1. Relie chaque exercice à ta bibliothèque</h3>
        <p>Tape pour chercher. Un exercice non relié sera ignoré.</p>${dl}
        <div id="impMaps">${names.map((n, i) => `<div class="imp-map"><span class="n">${esc(n)}</span><input type="text" list="impLib" data-n="${i}" value="${esc(map[n])}" placeholder="Choisir dans la bibliothèque" class="${map[n] ? '' : 'imp-bad'}"></div>`).join('')}</div>
        <h3 style="font-size:15px;margin:14px 0 4px">2. Dates (facultatif)</h3>
        <div class="imp-row" style="margin-top:0"><input type="date" id="impD0"><input type="number" id="impStep" value="7" style="width:70px" min="1"><span class="m" style="font-size:12px">jours entre séances</span><button type="button" class="btn btn-ghost btn-sm" id="impFill">Remplir les dates vides</button></div>
        <p style="margin-top:6px">Sans date, la séance est classée « Date inconnue » et sert quand même à ta progression.</p>
        <div id="impList"></div>
        <div class="imp-row"><button type="button" class="btn btn-accent" id="impSave">Importer</button><button type="button" class="btn btn-ghost" id="impBack">Retour</button></div><div id="impSt" class="imp-flag" style="margin-top:8px"></div>`;
      const nameOf = i => names[+i];
      box.querySelectorAll('#impMaps input').forEach(inp => inp.oninput = () => { map[nameOf(inp.dataset.n)] = inp.value; inp.classList.toggle('imp-bad', !LIB.some(e => e.name.toLowerCase() === inp.value.trim().toLowerCase())); });
      const drawList = () => {
        box.querySelector('#impList').innerHTML = data.list.map((s, i) => `<details class="imp-sess"><summary><span class="t">${esc(s.section)}${s.label ? ' · ' + esc(s.label) : ''}</span><span class="m">${s.rows.length} exercice${s.rows.length > 1 ? 's' : ''}</span>${s.rows.some(r => r.flag) ? '<span class="imp-flag">⚠️</span>' : ''}<input type="date" value="${s.date || ''}" style="margin-left:auto" onclick="event.stopPropagation()" onchange="this.dataset.i;window.__imp[${i}].date=this.value"></summary>
          <table><tr><th>Exercice</th><th>Série</th><th>Reps</th><th>kg</th></tr>${s.rows.map((r, ri) => r.sets.map((t, k) => `<tr><td>${k === 0 ? esc(r.ex) + (r.note ? ` <span class="m">(${esc(r.note)})</span>` : '') : ''}</td><td>${k + 1}</td>${t.sec ? `<td colspan="2">${esc(t.sec >= 60 ? Math.floor(t.sec / 60) + ' min' + (t.sec % 60 ? ' ' + t.sec % 60 + ' s' : '') : t.sec + ' s')}</td>` : `<td><input type="number" style="width:64px" value="${t.reps ?? ''}" oninput="window.__imp[${i}].rows[${ri}].sets[${k}].reps=this.value===''?null:+this.value"></td><td><input type="number" step="0.25" style="width:72px" value="${t.kg ?? ''}" placeholder="–" oninput="window.__imp[${i}].rows[${ri}].sets[${k}].kg=this.value===''?null:+this.value"></td>`}</tr>`).join('') + (r.flag ? `<tr><td colspan="4" class="imp-flag">⚠️ ${esc(r.flag)}</td></tr>` : '')).join('')}</table></details>`).join('');
      };
      window.__imp = data.list; drawList();
      box.querySelector('#impBack').onclick = () => stepInput();
      box.querySelector('#impFill').onclick = () => {
        const d0 = box.querySelector('#impD0').value, step = parseInt(box.querySelector('#impStep').value) || 7;
        if(!d0){ toast('Choisis une date de départ'); return; }
        const cnt = {}; data.list.forEach(s => { const i = cnt[s.section] = (cnt[s.section] ?? -1) + 1; if(!s.date){ const d = new Date(d0 + 'T12:00:00'); d.setDate(d.getDate() + i * step); s.date = d.toISOString().slice(0, 10); } });
        const open = [...box.querySelectorAll('details[open]')].map(x => x.querySelector('.t').textContent); drawList();
        box.querySelectorAll('details.imp-sess').forEach(x => { if(open.includes(x.querySelector('.t').textContent)) x.open = true; });
      };
      box.querySelector('#impSave').onclick = () => save(names, map);
    }
    async function save(names, map){
      const st = box.querySelector('#impSt'), btn = box.querySelector('#impSave');
      const idOf = {}; names.forEach(n => { const e = LIB.find(x => x.name.toLowerCase() === String(map[n] || '').trim().toLowerCase()); if(e) idOf[n] = e.id; });
      const todo = data.list.map(s => ({ s, rows: s.rows.filter(r => idOf[r.ex]) })).filter(x => x.rows.length);
      if(!todo.length){ st.textContent = 'Relie au moins un exercice à ta bibliothèque.'; return; }
      btn.disabled = true; const now = Date.now(); let ok = 0;
      try{
        for(let i = 0; i < todo.length; i++){
          const { s, rows } = todo[i]; st.textContent = `Import ${i + 1}/${todo.length}…`;
          const unknown = !s.date;
          const startedAt = unknown ? new Date(now - (todo.length - i) * 1000) : new Date(s.date + 'T12:00:00');
          const created = await o.req('/rest/v1/sessions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ program_id: null, day_label: s.section + (s.label ? ' · ' + s.label : ''), started_at: (startedAt > new Date() ? new Date() : startedAt).toISOString(), source: 'manual', imported: true, date_unknown: unknown, declared_seconds: 0, user_id: o.userId }) });
          const sid = created[0].id;
          const logs = [];
          rows.forEach(r => r.sets.forEach((t, k) => { if(t.reps == null && t.kg == null && !t.sec) return; logs.push({ session_id: sid, exercise_id: idOf[r.ex], set_number: k + 1, reps: t.sec ? null : t.reps, charge: t.sec ? null : t.kg, duration_seconds: t.sec || null }); }));
          if(logs.length) await o.req('/rest/v1/session_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(logs) });
          await o.req(`/rest/v1/sessions?id=eq.${sid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ completed_at: new Date().toISOString(), declared_seconds: 0 }) });
          ok++;
        }
      }catch(e){ console.error(e); st.textContent = `Import interrompu après ${ok} séance(s). Réessaie ou contacte ton coach.`; btn.disabled = false; if(ok && o.onDone) o.onDone(); return; }
      toast(ok + ' séance' + (ok > 1 ? 's' : '') + ' importée' + (ok > 1 ? 's' : '') + ' ✓'); close(); if(o.onDone) o.onDone();
    }
    stepInput();
  }
  window.HSImport = { open, parseText, fromVision };
})();
