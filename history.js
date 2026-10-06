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
        logs = await req_(o, `/rest/v1/session_logs?select=session_id,set_number,reps,charge,completed_at,exercises(name)&session_id=eq.${encodeURIComponent(o.sessionId)}&order=completed_at,id`);
      } else {
        logs = await pageAll(o.req, `/rest/v1/session_logs?select=id,session_id,set_number,reps,charge,completed_at,exercises(name),sessions!inner(user_id)&sessions.user_id=eq.${encodeURIComponent(o.userId)}&order=id`);
      }
    }catch(e){ console.error(e); toast("Export impossible pour le moment."); return false; }
    if(window.HSExport){
      const when = new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
      const ok = await HSExport.pdf({
        title: "Historique d'entraînement" + (o.who ? ' - ' + o.who : ''),
        subtitle: 'HS Coaching - exporté le ' + when,
        filename: HSExport.fileName(o.sessionId ? 'seance' : 'historique', o.who),
        blocks: HSExport.sessionBlocks(sessions, logs)
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
        if(l.reps && l.charge) vol += l.reps * l.charge;
      });
      const body = order.map(n => {
        const rows = byEx[n].filter(l => l.reps != null || l.charge != null).sort((a, b) => a.set_number - b.set_number);
        return `<div class="pe">${esc(n)}</div>` + (rows.length ? rows.map(l => `<div class="pr"><span>Série ${l.set_number}</span><span>${l.reps != null ? l.reps + ' reps' : '–'}${l.charge != null ? ' · ' + l.charge + ' kg' : ''}</span></div>`).join('') : '<div class="pr"><span>Rien noté</span></div>');
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

  window.HSHistory = { confirmDelete, exportPdf, requestEdit, toast };
})();
