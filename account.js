// Mes données & suppression du compte (client). window.HSAccount.open({ fetcher, session, baseUrl, anonKey, onDeleted })
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fr = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
  const frt = d => d ? new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

  async function pageAll(get, path){
    let out = [];
    for(let i = 0; i < 40; i++){ const r = await get(`${path}&limit=1000&offset=${i * 1000}`); if(!Array.isArray(r)) throw new Error('load_failed'); out = out.concat(r); if(r.length < 1000) break; }
    return out;
  }
  const EXPORTS = [
    { id:'seances', label:'Mes séances', ico:'🏋️' },
    { id:'poids', label:'Poids et objectif', ico:'⚖️' },
    { id:'bilans', label:'Bilans de récupération', ico:'😴' },
    { id:'programmes', label:'Mes programmes', ico:'📋' },
    { id:'messages', label:'Messages avec le coach', ico:'💬' }
  ];
  async function build(id, o){
    const uid = o.session.user.id, get = async p => { const r = await o.fetcher(p); if(!r.ok) throw new Error('load_failed'); return r.json(); };
    const who = o.name || '';
    if(id === 'seances'){
      const sessions = await pageAll(get, `/rest/v1/sessions?select=*&user_id=eq.${uid}&order=started_at`);
      const logs = await pageAll(get, `/rest/v1/session_logs?select=id,session_id,set_number,reps,charge,duration_seconds,completed_at,exercises(name),sessions!inner(user_id)&sessions.user_id=eq.${uid}&order=id`);
      return { title:"Mes séances d'entraînement", filename: HSExport.fileName('mes-seances', who), blocks: HSExport.sessionBlocks(sessions, logs) };
    }
    if(id === 'poids'){
      const rows = await pageAll(get, `/rest/v1/body_logs?select=*&user_id=eq.${uid}&order=logged_at.desc`);
      const goal = (await get(`/rest/v1/body_goals?select=*&user_id=eq.${uid}`))[0];
      const blocks = [];
      blocks.push({ type:'p', text: goal && goal.weight_kg ? `Objectif de poids : ${HSExport.num(goal.weight_kg, 1)} kg` : 'Aucun objectif de poids enregistré.' });
      blocks.push(rows.length ? { type:'table', head:['Date','Poids (kg)','Notes'], body: rows.map(r => [fr(r.logged_at), HSExport.num(r.weight_kg, 1), r.notes || '']), widths:[90,90,300] } : { type:'p', text:'Aucune pesée enregistrée.' });
      return { title:'Mon suivi de poids', filename: HSExport.fileName('mon-poids', who), blocks };
    }
    if(id === 'bilans'){
      const rows = await pageAll(get, `/rest/v1/recovery_checkins?select=*&user_id=eq.${uid}&order=day.desc`);
      return { title:'Mes bilans de récupération', filename: HSExport.fileName('mes-bilans', who), blocks: [rows.length ? { type:'table', head:['Jour','Sommeil (h)','Courbatures /5','Énergie /5'], body: rows.map(r => [fr(r.day), r.sleep_hours != null ? HSExport.num(r.sleep_hours, 1) : '', r.soreness != null ? String(r.soreness) : '', r.energy != null ? String(r.energy) : '']), widths:[100,100,110,110] } : { type:'p', text:'Aucun bilan enregistré.' }] };
    }
    if(id === 'programmes'){
      const progs = await pageAll(get, `/rest/v1/programs?select=*&owner_user_id=eq.${uid}&order=created_at`);
      const blocks = [];
      if(!progs.length) blocks.push({ type:'p', text:'Aucun programme.' });
      for(const p of progs){
        const items = await pageAll(get, `/rest/v1/program_exercises?select=*,exercises:exercises!program_exercises_exercise_id_fkey(name)&program_id=eq.${p.id}&order=order_index`);
        blocks.push({ type:'h', small:true, text:'Programme - ' + (p.name || '') });
        if(p.description) blocks.push({ type:'p', text:p.description });
        blocks.push(items.length ? { type:'table', head:['Exercice','Séries','Reps','Repos (s)','Remarque'], body: items.map(i => [(i.exercises && i.exercises.name) || '', String(i.sets || ''), i.reps || '', String(i.rest_seconds || ''), i.notes || '']), widths:[170,50,60,60,150] } : { type:'p', text:'Programme vide.' });
      }
      return { title:'Mes programmes', filename: HSExport.fileName('mes-programmes', who), blocks };
    }
    if(id === 'messages'){
      const conv = await get(`/rest/v1/conversations?select=id&user_id=eq.${uid}`);
      let msgs = [];
      if(conv[0]) msgs = await pageAll(get, `/rest/v1/messages?select=sender,content,created_at&conversation_id=eq.${conv[0].id}&order=created_at`);
      return { title:'Mes messages avec le coach', filename: HSExport.fileName('mes-messages', who), blocks: [msgs.length ? { type:'table', head:['Date','De','Message'], body: msgs.map(m => [frt(m.created_at), m.sender === 'coach' ? 'Coach' : 'Moi', m.content || '']), widths:[95,45,340] } : { type:'p', text:'Aucun message.' }] };
    }
  }
  async function exportOne(id, o){
    if(!window.HSExport) throw new Error('export_unavailable');
    const d = await build(id, o);
    d.subtitle = 'HS Coaching - exporté le ' + new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    return HSExport.pdf(d);
  }

  function open(o){
    const old = document.getElementById('accOv'); if(old) old.remove();
    const ov = document.createElement('div'); ov.id = 'accOv';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:1400;display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto';
    const box = document.createElement('div');
    box.style.cssText = 'max-width:460px;width:100%;background:var(--surface,#16171a);border:1px solid var(--line,#2c2c30);border-radius:20px;padding:20px 18px;color:var(--ink,#fff);font-family:inherit';
    ov.appendChild(box); document.body.appendChild(ov);
    const btn = 'font-family:inherit;font-weight:700;font-size:15px;padding:12px 16px;border-radius:12px;cursor:pointer;width:100%;';
    const ghost = btn + 'background:transparent;color:inherit;border:1px solid var(--line,#2c2c30);';
    const close = () => ov.remove();

    function step1(){
      box.innerHTML = `<h2 style="margin:0 0 6px;font-size:21px">Mes données</h2>
        <p style="font-size:14px;opacity:.8;margin:0 0 14px;line-height:1.45">Avant toute chose, tu peux récupérer tes données en PDF : un fichier par thème.</p>
        <div id="accList">${EXPORTS.map(e => `<button type="button" data-e="${e.id}" style="${ghost}text-align:left;margin-bottom:8px">${e.ico} ${esc(e.label)} <span style="float:right;opacity:.6">PDF ⬇️</span></button>`).join('')}</div>
        <button type="button" id="accAll" style="${btn}background:var(--accent,#d9ff3f);color:#111;margin:4px 0 18px">Tout télécharger (5 PDF)</button>
        <div style="border-top:1px solid var(--line,#2c2c30);padding-top:16px">
          <div style="font-weight:800;margin-bottom:6px;color:#ff6b6b">Supprimer mon compte</div>
          <p style="font-size:13px;opacity:.8;margin:0 0 12px;line-height:1.45">La suppression est <b>définitive</b> : ton profil, tes séances, programmes, poids, bilans, badges, messages et vidéos de challenge sont effacés de nos serveurs, et nous ne pourrons pas les récupérer.</p>
          <button type="button" id="accDel" style="${btn}background:#3a1414;color:#ff8a8a;border:1px solid #7a2a2a">Je veux supprimer mon compte</button>
        </div>
        <button type="button" id="accClose" style="${ghost}margin-top:12px">Fermer</button>`;
      const run = async (ids, b) => {
        const label = b.innerHTML; b.disabled = true;
        for(const id of ids){
          b.textContent = 'Préparation…';
          try{ await exportOne(id, o); }catch(e){ console.error(e); alert('Export impossible pour le moment (' + id + '). Réessaie.'); break; }
          if(ids.length > 1) await new Promise(r => setTimeout(r, 900));
        }
        b.disabled = false; b.innerHTML = label;
      };
      box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => run([b.dataset.e], b));
      box.querySelector('#accAll').onclick = ev => run(EXPORTS.map(e => e.id), ev.currentTarget);
      box.querySelector('#accDel').onclick = step2;
      box.querySelector('#accClose').onclick = close;
    }
    function step2(){
      box.innerHTML = `<h2 style="margin:0 0 8px;font-size:21px;color:#ff6b6b">Supprimer définitivement ?</h2>
        <p style="font-size:14px;line-height:1.5;margin:0 0 12px">Toutes tes données seront <b>supprimées</b> en même temps que ton compte, sans retour possible. Si tu veux les garder, télécharge tes PDF avant.</p>
        <button type="button" id="accBack" style="${ghost}margin-bottom:14px">← Télécharger mes PDF d'abord</button>
        <label style="display:block;font-size:13px;opacity:.8;margin-bottom:4px">Ton mot de passe, pour confirmer</label>
        <input id="accPw" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;background:var(--surface-2,#1d1e22);border:1px solid var(--line,#2c2c30);border-radius:10px;color:inherit;padding:12px;font-size:16px;font-family:inherit">
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;margin:14px 0;line-height:1.4"><input type="checkbox" id="accOk" style="margin-top:2px;width:18px;height:18px;flex:none"> Je comprends que mes données seront définitivement supprimées.</label>
        <div id="accErr" style="color:#ff8a8a;font-size:13px;min-height:18px;margin-bottom:8px"></div>
        <button type="button" id="accGo" style="${btn}background:#c62828;color:#fff;border:0">Supprimer mon compte</button>
        <button type="button" id="accNo" style="${ghost}margin-top:10px">Annuler, je garde mon compte</button>`;
      box.querySelector('#accBack').onclick = step1;
      box.querySelector('#accNo').onclick = close;
      box.querySelector('#accGo').onclick = async ev => {
        const pw = box.querySelector('#accPw').value, err = box.querySelector('#accErr');
        if(!pw){ err.textContent = 'Entre ton mot de passe.'; return; }
        if(!box.querySelector('#accOk').checked){ err.textContent = 'Coche la case pour confirmer.'; return; }
        const b = ev.currentTarget; b.disabled = true; b.textContent = 'Suppression…'; err.textContent = '';
        try{
          const r = await fetch(`${o.baseUrl}/functions/v1/delete-account`, { method:'POST', headers:{ apikey:o.anonKey, Authorization:`Bearer ${o.session.access_token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ confirm:true, password:pw }) });
          const j = await r.json().catch(() => ({}));
          if(!r.ok){ err.textContent = j.error === 'wrong_password' ? 'Mot de passe incorrect.' : j.error === 'not_allowed' ? "Ce type de compte ne peut pas être supprimé ici. Contacte l'administrateur." : 'Suppression impossible pour le moment. Réessaie.'; b.disabled = false; b.textContent = 'Supprimer mon compte'; return; }
        }catch(e){ err.textContent = 'Connexion impossible. Réessaie.'; b.disabled = false; b.textContent = 'Supprimer mon compte'; return; }
        step3();
      };
    }
    function step3(){
      try{ Object.keys(localStorage).filter(k => /^(hs_|sb-)/.test(k)).forEach(k => localStorage.removeItem(k)); }catch(e){}
      box.innerHTML = `<div style="text-align:center;padding:10px 0"><div style="font-size:42px">👋</div><h2 style="margin:8px 0">Compte supprimé</h2><p style="font-size:14px;opacity:.8;line-height:1.5">Tes données ont été effacées. Merci d'avoir fait un bout de chemin avec nous. Tu es toujours le bienvenu si tu veux revenir.</p><button type="button" id="accEnd" style="${btn}background:var(--accent,#d9ff3f);color:#111;margin-top:10px">OK</button></div>`;
      box.querySelector('#accEnd').onclick = () => { close(); if(o.onDeleted) o.onDeleted(); };
      ov.onclick = null;
    }
    ov.onclick = e => { if(e.target === ov) close(); };
    step1();
  }
  window.HSAccount = { open };
})();
