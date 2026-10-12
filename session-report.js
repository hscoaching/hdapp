/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// HS Coaching — compte rendu de séance consultable dans l'appli (sans export) : chiffres clés, volume par exercice,
// détail des séries en colonnes, comparaison avec la dernière séance du même programme, répartition par muscle.
// Dépend de history.js (HSHistory.orderLogs). Graphiques en HTML/CSS pur : pas de bibliothèque, fonctionne hors ligne.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nf = n => Math.round(n).toLocaleString('fr-FR');
  const fmtDur = sec => { sec = Math.round(sec || 0); const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60; return h ? `${h} h ${String(m).padStart(2,'0')}` : (m ? (s && m < 10 ? `${m} min ${s}s` : `${m} min`) : `${s}s`); };
  const SEL = 'id,session_id,exercise_id,set_number,reps,charge,duration_seconds,hold_seconds,exercise_order,completed_at,exercises(name,category,primary_muscles)';

  function ensureCss(){
    if(document.getElementById('hsRepCss')) return;
    const st = document.createElement('style'); st.id = 'hsRepCss';
    st.textContent = `
      .hsr-ov{position:fixed; inset:0; z-index:250; background:rgba(0,0,0,.82); display:flex; align-items:flex-start; justify-content:center; overflow-y:auto; padding:16px;}
      .hsr-card{width:100%; max-width:640px; background:var(--surface,#16171a); color:var(--ink,#f5f5f5); border:1px solid var(--line,#2c2c30); padding:20px; margin:auto 0;}
      .hsr-top{display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:14px;}
      .hsr-top h3{font-size:20px; margin:0; line-height:1.2;}
      .hsr-top small{display:block; color:var(--ink-muted,#9a9a9e); font-size:13px; margin-top:4px;}
      .hsr-x{background:none; border:1px solid var(--line,#2c2c30); color:inherit; padding:6px 12px; cursor:pointer; font:inherit;}
      .hsr-kpis{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:6px;}
      .hsr-kpi{border:1px solid var(--line,#2c2c30); padding:10px 8px; text-align:center;}
      .hsr-kpi b{display:block; font-size:20px; line-height:1.2;}
      .hsr-kpi span{font-size:11px; color:var(--ink-muted,#9a9a9e); letter-spacing:.05em; text-transform:uppercase;}
      .hsr-kpi i{display:block; font-style:normal; font-size:11px; margin-top:2px;}
      .hsr h4{font-size:13px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-muted,#9a9a9e); margin:22px 0 10px;}
      .hsr-row{margin-bottom:10px;}
      .hsr-lab{display:flex; justify-content:space-between; gap:8px; font-size:14px; margin-bottom:4px;}
      .hsr-lab b{font-weight:600;}
      .hsr-lab span{color:var(--ink-muted,#9a9a9e); white-space:nowrap;}
      .hsr-track{position:relative; height:12px; background:rgba(255,255,255,.07);}
      .hsr-prev{position:absolute; left:0; top:0; bottom:0; background:rgba(255,255,255,.18);}
      .hsr-fill{position:absolute; left:0; top:3px; bottom:3px; background:var(--accent,#fff);}
      .hsr-up{color:#7dd68a;} .hsr-down{color:#ff9a9a;} .hsr-same{color:var(--ink-muted,#9a9a9e);}
      .hsr-ex{border:1px solid var(--line,#2c2c30); padding:12px; margin-bottom:10px;}
      .hsr-ex-h{display:flex; justify-content:space-between; gap:8px; align-items:baseline; margin-bottom:8px;}
      .hsr-ex-h b{font-size:15px;}
      .hsr-ex-h span{font-size:12px; color:var(--ink-muted,#9a9a9e);}
      .hsr-cols{display:flex; align-items:flex-end; gap:6px; height:78px;}
      .hsr-col{flex:1; min-width:18px; max-width:56px; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%;}
      .hsr-bar{width:64%; background:var(--accent,#fff); min-height:3px;}
      .hsr-bar.t{background:#8fb4ff;}
      .hsr-cv{font-size:11px; margin-bottom:3px; white-space:nowrap;}
      .hsr-cl{display:flex; gap:6px; margin-top:4px;}
      .hsr-cl span{flex:1; min-width:18px; max-width:56px; text-align:center; font-size:11px; color:var(--ink-muted,#9a9a9e);}
      .hsr-note{font-size:12px; color:var(--ink-muted,#9a9a9e); margin-top:8px;}
      .hsr-chip{display:inline-block; font-size:10px; font-weight:800; letter-spacing:.06em; padding:2px 7px; border-radius:999px; border:1px solid currentColor; vertical-align:middle; margin-right:6px;}
      .hsr-leg{font-size:12px; color:var(--ink-muted,#9a9a9e); margin:-4px 0 12px;}
      .hsr-leg i{display:inline-block; width:10px; height:10px; vertical-align:middle; margin:0 4px 0 0;}
    `;
    document.head.appendChild(st);
  }

  // Agrège les séries d'une séance par exercice (ordre du programme conservé : les logs arrivent déjà triés)
  function aggregate(logs){
    const map = new Map();
    logs.forEach(l => {
      const hasData = l.reps != null || l.charge != null || l.duration_seconds;
      if(!hasData) return;
      if(!map.has(l.exercise_id)) map.set(l.exercise_id, { id: l.exercise_id, name: l.custom_name || (l.exercises && l.exercises.name) || 'Exercice', fiche: l.custom_name && l.exercises && l.exercises.name !== l.custom_name ? l.exercises.name : '', tag: l.ss_tag || '', muscles: (l.exercises && l.exercises.primary_muscles) || [], sets: [], vol: 0, reps: 0, secs: 0, best: 0 });
      const e = map.get(l.exercise_id);
      e.sets.push(l);
      if(l.duration_seconds){ e.secs += l.duration_seconds; }
      else if(l.reps && l.charge){ e.vol += l.reps * l.charge; }
      if(l.reps) e.reps += l.reps;
      if(l.charge && l.charge > e.best) e.best = Number(l.charge);
    });
    map.forEach(e => e.sets.sort((a, b) => a.set_number - b.set_number));
    return [...map.values()];
  }

  function deltaHtml(cur, prev, unit){
    if(!prev) return '';
    const d = cur - prev;
    if(Math.abs(d) < 0.0001) return `<span class="hsr-same"> = comme la dernière fois</span>`;
    const pct = Math.round((d / prev) * 100);
    return `<span class="${d > 0 ? 'hsr-up' : 'hsr-down'}"> ${d > 0 ? '▲ +' : '▼ '}${unit === 'kg' ? nf(d) + ' kg' : pct + ' %'}${unit === 'kg' ? ' (' + (pct > 0 ? '+' : '') + pct + ' %)' : ''}</span>`;
  }

  async function open(o){
    ensureCss();
    const s = o.session, req = o.req;
    const old = document.getElementById('hsRepOv'); if(old) old.remove();
    const ov = document.createElement('div'); ov.id = 'hsRepOv'; ov.className = 'hsr-ov';
    ov.innerHTML = `<div class="hsr-card hsr"><div class="hsr-top"><div><h3>Compte rendu</h3><small>Chargement…</small></div><button type="button" class="hsr-x" aria-label="Fermer">✕</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.body.style.overflow = ''; };
    ov.querySelector('.hsr-x').onclick = close;
    ov.onclick = ev => { if(ev.target === ov) close(); };
    document.body.style.overflow = 'hidden';
    const card = ov.querySelector('.hsr-card');

    let logs, prevLogs = null, prevSession = null;
    try{
      logs = await req(`/rest/v1/session_logs?select=${SEL}&session_id=eq.${s.id}&order=set_number`);
      logs = await HSHistory.orderLogs(logs, s.id, req);
    }catch(e){ console.error(e); card.querySelector('small').textContent = 'Impossible de charger la séance. Réessaie.'; return; }

    // dernière séance du même programme / même séance, pour comparer
    try{
      if(s.program_id && !s.date_unknown && s.started_at){
        const dayF = s.day_label ? `&day_label=eq.${encodeURIComponent(s.day_label)}` : '&day_label=is.null';
        const uf = o.userId ? `&user_id=eq.${o.userId}` : '';
        const ps = await req(`/rest/v1/sessions?select=id,started_at,completed_at,declared_seconds&program_id=eq.${s.program_id}${dayF}${uf}&completed_at=not.is.null&started_at=lt.${encodeURIComponent(s.started_at)}&order=started_at.desc&limit=1`);
        if(ps && ps[0]){ prevSession = ps[0]; prevLogs = await req(`/rest/v1/session_logs?select=${SEL}&session_id=eq.${ps[0].id}&order=set_number`); }
      }
    }catch(e){ console.error(e); prevLogs = null; }

    const ex = aggregate(logs);
    if(!ex.length){ card.innerHTML = `<div class="hsr-top"><div><h3>Compte rendu</h3><small>Aucune série renseignée pour cette séance.</small></div><button type="button" class="hsr-x" aria-label="Fermer">✕</button></div>`; card.querySelector('.hsr-x').onclick = close; return; }
    const prevMap = new Map(prevLogs ? aggregate(prevLogs).map(e => [e.id, e]) : []);
    const prevAll = prevLogs ? aggregate(prevLogs) : [];

    const totVol = ex.reduce((a, e) => a + e.vol, 0), totSets = ex.reduce((a, e) => a + e.sets.length, 0), totReps = ex.reduce((a, e) => a + e.reps, 0);
    // comparaison honnête : uniquement sur les exercices présents dans les deux séances
    const common = ex.filter(e => prevMap.has(e.id) && e.vol > 0 && prevMap.get(e.id).vol > 0);
    const prevVol = common.reduce((a, e) => a + prevMap.get(e.id).vol, 0), curCommonVol = common.reduce((a, e) => a + e.vol, 0);
    const dur = o.durationSec || 0;
    const dt = s.date_unknown ? 'Date inconnue' : new Date(s.started_at).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const title = s.day_label || (s.programs && s.programs.name) || 'Séance';

    const kpi = (v, l, extra) => `<div class="hsr-kpi"><b>${v}</b><span>${l}</span>${extra ? `<i>${extra}</i>` : ''}</div>`;
    const kpis = `<div class="hsr-kpis">${[
      dur ? kpi(fmtDur(dur), 'Durée') : '',
      kpi(String(ex.length), ex.length > 1 ? 'Exercices' : 'Exercice'),
      kpi(String(totSets), totSets > 1 ? 'Séries' : 'Série'),
      totReps ? kpi(nf(totReps), 'Répétitions') : '',
      totVol ? kpi(nf(totVol) + ' kg', 'Poids soulevé', prevVol ? deltaHtml(curCommonVol, prevVol, 'pct') : '') : ''
    ].join('')}</div>`;

    // 1) Volume par exercice (barre claire = dernière séance)
    const lifts = ex.filter(e => e.vol > 0);
    const maxV = Math.max(1, ...lifts.map(e => e.vol), ...lifts.map(e => (prevMap.get(e.id) || { vol: 0 }).vol));
    const volHtml = lifts.length ? lifts.map(e => {
      const p = prevMap.get(e.id), pv = p ? p.vol : 0;
      return `<div class="hsr-row"><div class="hsr-lab"><b>${e.tag ? `<span class="hsr-chip">${esc(e.tag)}</span>` : ''}${esc(e.name)}</b><span>${nf(e.vol)} kg${pv ? deltaHtml(e.vol, pv, 'pct') : ''}</span></div><div class="hsr-track">${pv ? `<div class="hsr-prev" style="width:${(pv / maxV * 100).toFixed(1)}%"></div>` : ''}<div class="hsr-fill" style="width:${(e.vol / maxV * 100).toFixed(1)}%"></div></div></div>`;
    }).join('') : '';

    // 2) Détail des séries : une colonne par série (hauteur = charge, ou durée pour les exercices au temps)
    const detail = ex.map(e => {
      const timed = e.sets.some(x => x.duration_seconds);
      const vals = e.sets.map(x => timed ? (x.duration_seconds || 0) : Number(x.charge || 0));
      const mx = Math.max(1, ...vals);
      const cols = e.sets.map((x, i) => {
        const v = vals[i], h = v ? Math.max(6, Math.round(v / mx * 100)) : 4;
        const top = timed ? (x.duration_seconds ? fmtDur(x.duration_seconds) : '–') + (x.charge ? ` · ${x.charge}kg` : '') : (x.charge != null ? x.charge + ' kg' : '–');
        return `<div class="hsr-col"><div class="hsr-cv">${esc(top)}</div><div class="hsr-bar${timed ? ' t' : ''}" style="height:${h}%"></div></div>`;
      }).join('');
      const labs = e.sets.map(x => `<span>${timed ? 'S' + x.set_number : (x.reps != null ? x.reps + ' r.' : 'S' + x.set_number)}</span>`).join('');
      const p = prevMap.get(e.id);
      const bits = [];
      if(e.best) bits.push(`charge max ${e.best} kg${p && p.best ? deltaHtml(e.best, p.best, 'kg') : ''}`);
      if(timed) bits.push(`${fmtDur(e.secs)} au total`);
      else if(e.reps) bits.push(`${e.reps} reps`);
      return `<div class="hsr-ex"><div class="hsr-ex-h"><b>${e.tag ? `<span class="hsr-chip">${esc(e.tag)}</span>` : ''}${esc(e.name)}</b><span>${e.sets.length} série${e.sets.length > 1 ? 's' : ''}</span></div><div class="hsr-cols">${cols}</div><div class="hsr-cl">${labs}</div>${bits.length ? `<div class="hsr-note">${bits.join(' · ')}</div>` : ''}</div>`;
    }).join('');

    // 3) Répartition par muscle principal (nombre de séries)
    const mus = {};
    ex.forEach(e => { const ms = (e.muscles && e.muscles.length) ? e.muscles : []; ms.slice(0, 1).forEach(m => { mus[m] = (mus[m] || 0) + e.sets.length; }); });
    const mArr = Object.entries(mus).sort((a, b) => b[1] - a[1]);
    const mMax = mArr.length ? mArr[0][1] : 1;
    const musHtml = mArr.length ? mArr.map(([m, n]) => `<div class="hsr-row"><div class="hsr-lab"><b>${esc(m)}</b><span>${n} série${n > 1 ? 's' : ''}</span></div><div class="hsr-track"><div class="hsr-fill" style="width:${(n / mMax * 100).toFixed(1)}%"></div></div></div>`).join('') : '';

    const prevTxt = prevSession ? new Date(prevSession.started_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '';
    card.innerHTML = `<div class="hsr-top"><div><h3>${esc(title)}</h3><small>${esc(dt)}</small></div><button type="button" class="hsr-x" aria-label="Fermer">✕</button></div>
      ${kpis}
      ${volHtml ? `<h4>Poids soulevé par exercice</h4>${prevSession ? `<div class="hsr-leg"><i style="background:var(--accent,#fff)"></i>cette séance <i style="background:rgba(255,255,255,.18);margin-left:10px"></i>séance du ${esc(prevTxt)}</div>` : ''}${volHtml}` : ''}
      <h4>Détail des séries</h4>${detail}
      ${musHtml ? `<h4>Muscles travaillés</h4>${musHtml}` : ''}
      ${!prevSession && s.program_id ? `<p class="hsr-note" style="margin-top:16px;">Pas de séance précédente identique pour comparer.</p>` : ''}`;
    card.querySelector('.hsr-x').onclick = close;
  }

  window.HSReport = { open };
})();
