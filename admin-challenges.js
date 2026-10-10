// HS Coaching — espace admin : admin-challenges.js (extrait de admin.html, comportement inchangé)
// ================= CHALLENGES (grand admin) =================
const CH_KIND = { hold: 'Tenir le plus longtemps', reps: 'Max de reps en temps limité' };
function chFmt(c, v){ if(v == null) return '—'; if(c.kind === 'hold'){ const m = Math.floor(v/60), s = v%60; return m + ':' + String(s).padStart(2,'0'); } return v + ' reps'; }
function chStatus(c){ const n = Date.now(); return n < new Date(c.starts_at) ? 'à venir' : (n > new Date(c.ends_at) ? 'terminé' : 'en cours'); }
function toLocalInput(d){ const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,16); }
async function renderChallengesAdmin(){
  const tb = document.getElementById('tabBody');
  tb.innerHTML = '<div class="empty">Chargement…</div>';
  let chs, parts;
  try{
    chs = await api('/rest/v1/challenges?select=*&order=starts_at.desc');
    parts = await api('/rest/v1/challenge_participants?select=challenge_id').catch(() => []);
  }catch(e){ console.error(e); tb.innerHTML = '<div class="empty">Impossible de charger les challenges. Réessaie.</div>'; return; }
  const n = id => parts.filter(p => p.challenge_id === id).length;
  tb.innerHTML = `${IS_SUPER ? '<div class="row-actions" style="margin-bottom:14px"><button class="btn btn-accent" onclick="openChallengeForm()">+ Nouveau challenge</button></div>' : ''}
    <div id="chForm"></div>
    ${chs.length ? chs.map(c => `<div class="card" style="cursor:default">
      <div class="tag">${chStatus(c)}${c.is_published ? '' : ' · masqué'}</div>
      <h3>${escapeHtml(c.badge_icon)} ${escapeHtml(c.title)}</h3>
      <p>${escapeHtml(c.exercise_name)} · ${CH_KIND[c.kind]}${c.kind === 'reps' ? ' (' + Math.floor(c.time_limit_seconds/60) + ' min ' + (c.time_limit_seconds%60) + ' s)' : ''}</p>
      <p>${new Date(c.starts_at).toLocaleDateString('fr-FR')} → ${new Date(c.ends_at).toLocaleDateString('fr-FR')} · ${n(c.id)} participant${n(c.id) > 1 ? 's' : ''}</p>
      ${c.reward_text ? `<p>🎁 ${escapeHtml(c.reward_text)}</p>` : ''}
      ${c.winner_announced_at ? `<p>🏆 Vainqueur annoncé le ${new Date(c.winner_announced_at).toLocaleDateString('fr-FR')} · ${c.videos_purged_at ? 'vidéos supprimées' : 'vidéos supprimées le ' + new Date(new Date(c.winner_announced_at).getTime() + 7*864e5).toLocaleDateString('fr-FR')}</p>` : ''}
      <div class="row-actions" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="openChallengeResults('${c.id}')">📊 Résultats</button>
        ${IS_SUPER && chStatus(c) !== 'terminé' ? `<button class="btn btn-ghost btn-sm" onclick="setDemoVideo('${c.id}')">🎬 ${c.demo_video_path ? 'Changer la vidéo démo' : 'Ajouter une vidéo démo'}</button>` : ''}
        ${IS_SUPER && chStatus(c) === 'terminé' && !c.winner_announced_at ? `<button class="btn btn-accent btn-sm" onclick="announceWinner('${c.id}')">🏆 Annoncer le vainqueur</button>` : ''}
        ${IS_SUPER && chStatus(c) === 'en cours' ? `<button class="btn btn-ghost btn-sm" onclick="endChallengeNow('${c.id}')">⏹ Terminer maintenant</button>` : ''}
        ${IS_SUPER ? `<button class="btn btn-ghost btn-sm" onclick="toggleChallenge('${c.id}', ${c.is_published ? 'false' : 'true'})">${c.is_published ? 'Masquer' : 'Publier'}</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteChallenge('${c.id}')">🗑 Supprimer</button>` : ''}
      </div></div>`).join('') : `<div class="empty">Aucun challenge. ${IS_SUPER ? 'Crée le premier : un exercice à tenir ou un maximum de reps en temps limité.' : 'Le grand admin peut en créer un.'}</div>`}`;
}
function openChallengeForm(){
  const now = new Date(), end = new Date(now.getTime() + 7*864e5);
  const inp = 'width:100%;box-sizing:border-box;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:11px;font:inherit;font-size:16px';
  const lab = t => `<label style="display:block;margin:12px 0 4px;font-size:13px;opacity:.8">${t}</label>`;
  document.getElementById('chForm').innerHTML = `<div class="card" style="cursor:default;margin-bottom:16px">
    <h3>Nouveau challenge</h3>
    ${lab('Titre')}<input id="chTitle" style="${inp}" placeholder="Ex. Défi gainage d'octobre">
    ${lab('Type')}<select id="chKind" style="${inp}" onchange="document.getElementById('chLimitBox').style.display = this.value === 'reps' ? 'block' : 'none'"><option value="hold">Tenir le plus longtemps (gainage, suspension…)</option><option value="reps">Maximum de répétitions en temps limité</option></select>
    ${lab('Exercice')}<input id="chEx" style="${inp}" placeholder="Ex. Gainage planche, Pompes, Tractions">
    <div id="chLimitBox" style="display:none">${lab('Durée de l\'essai (minutes et secondes)')}<div style="display:flex;gap:10px"><input id="chMin" type="number" min="0" max="60" value="2" style="${inp}"><input id="chSec" type="number" min="0" max="59" value="0" style="${inp}"></div></div>
    ${lab('Description / règles')}<textarea id="chDesc" style="${inp};min-height:90px" placeholder="Comment tenir ou faire l'exercice, ce qui est valide…"></textarea>
    ${lab('Début')}<input id="chStart" type="datetime-local" style="${inp}" value="${toLocalInput(now)}">
    ${lab('Fin')}<input id="chEnd" type="datetime-local" style="${inp}" value="${toLocalInput(end)}">
    ${lab('Récompense en plus du badge (facultatif)')}<input id="chReward" style="${inp}" placeholder="Ex. 1 mois de coaching offert au 1er">
    ${lab('Icône du badge (un emoji)')}<input id="chIcon" style="${inp}" value="🏆" maxlength="4">
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-accent" style="flex:1;justify-content:center" onclick="saveChallenge()">Publier le challenge</button><button class="btn btn-ghost" onclick="document.getElementById('chForm').innerHTML=''">Annuler</button></div></div>`;
  document.getElementById('chForm').scrollIntoView({ behavior:'smooth' });
}
async function saveChallenge(){
  const v = id => document.getElementById(id).value.trim();
  const kind = v('chKind');
  const row = { title: v('chTitle'), kind, exercise_name: v('chEx'), description: v('chDesc') || null,
    starts_at: new Date(v('chStart')).toISOString(), ends_at: new Date(v('chEnd')).toISOString(),
    reward_text: v('chReward') || null, badge_icon: v('chIcon') || '🏆', is_published: true };
  if(kind === 'reps') row.time_limit_seconds = (parseInt(v('chMin')) || 0) * 60 + (parseInt(v('chSec')) || 0);
  if(!row.title || !row.exercise_name){ toast('Titre et exercice requis'); return; }
  if(!(new Date(row.ends_at) > new Date(row.starts_at))){ toast('La fin doit être après le début'); return; }
  if(kind === 'reps' && !(row.time_limit_seconds >= 10)){ toast('Durée minimale : 10 secondes'); return; }
  try{ await api('/rest/v1/challenges', { method:'POST', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(row) }); toast('Challenge publié 🎉'); renderChallengesAdmin(); }
  catch(e){ toast('Erreur : ' + String((e && e.detail) || e).slice(0, 100)); }
}
function setDemoVideo(id){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*'; inp.style.display = 'none'; document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; inp.remove(); if(!f) return;
    if(f.size > 50*1024*1024){ toast('Vidéo trop lourde (50 Mo max)'); return; }
    const ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,5) || 'mp4';
    const path = id + '/demo-' + Date.now() + '.' + ext;
    toast('Envoi en cours…');
    try{
      await refreshIfNeeded(); const s = getSession();
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/challenge-demos/${path}`, { method:'POST', headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${s?.access_token}`, 'Content-Type': f.type || 'video/mp4' }, body: f });
      if(!res.ok) throw new Error('upload');
      await api(`/rest/v1/challenges?id=eq.${id}`, { method:'PATCH', body: JSON.stringify({ demo_video_path: path }) });
      toast('Vidéo démo ajoutée 🎬'); renderChallengesAdmin();
    }catch(e){ console.error(e); toast('Envoi impossible, réessaie'); }
  };
  inp.click();
}
async function announceWinner(id){
  if(!confirm('Annoncer le vainqueur ? Les médailles et badges deviennent définitifs, et les vidéos seront supprimées automatiquement dans 7 jours. Pense à valider d\'abord tous les essais en attente.')) return;
  try{ await api('/rest/v1/rpc/challenge_announce', { method:'POST', body: JSON.stringify({ p_id: id }) }); toast('Vainqueur annoncé 🏆'); renderChallengesAdmin(); }catch(e){ toast('Erreur, réessaie'); }
}
async function endChallengeNow(id){
  if(!confirm('Terminer ce challenge maintenant ? Le classement sera figé.')) return;
  try{ await api(`/rest/v1/challenges?id=eq.${id}`, { method:'PATCH', body: JSON.stringify({ ends_at: new Date().toISOString() }) }); toast('Challenge terminé'); renderChallengesAdmin(); }catch(e){ toast('Erreur, réessaie'); }
}
async function toggleChallenge(id, pub){
  try{ await api(`/rest/v1/challenges?id=eq.${id}`, { method:'PATCH', body: JSON.stringify({ is_published: pub }) }); renderChallengesAdmin(); }catch(e){ toast('Erreur, réessaie'); }
}
async function deleteChallenge(id){
  if(!confirm('Supprimer ce challenge, ses participants et tous les résultats ? (les badges liés disparaissent)')) return;
  try{ await api(`/rest/v1/challenges?id=eq.${id}`, { method:'DELETE' }); toast('Challenge supprimé'); renderChallengesAdmin(); }catch(e){ toast('Erreur, réessaie'); }
}
async function openChallengeResults(id){
  const tb = document.getElementById('tabBody');
  tb.innerHTML = '<a class="backlink" onclick="renderChallengesAdmin()">← Challenges</a><div class="empty">Chargement…</div>';
  let c, atts;
  try{
    c = (await api(`/rest/v1/challenges?select=*&id=eq.${id}`))[0];
    atts = await api('/rest/v1/rpc/challenge_attempts_admin', { method:'POST', body: JSON.stringify({ p_id: id }) });
  }catch(e){ console.error(e); tb.innerHTML = '<a class="backlink" onclick="renderChallengesAdmin()">← Challenges</a><div class="empty">Impossible de charger les résultats.</div>'; return; }
  window._chAtts = atts; window._chCur = c;
  const best = {}, names = {};
  atts.forEach(a => { names[a.user_id] = a.name; if(!a.removed && a.status === 'validated' && a.value > 0 && (!best[a.user_id] || a.value > best[a.user_id])) best[a.user_id] = a.value; });
  const ranking = Object.entries(best).sort((a,b) => b[1] - a[1]);
  const pending = atts.filter(a => a.status === 'pending' && !a.removed && a.value > 0);
  const stLab = { pending:'⏳ À valider', validated:'✅ Validé', rejected:'❌ Refusé' };
  const row = a => `<div style="padding:10px 2px;border-bottom:1px solid var(--line);${a.removed ? 'opacity:.45;text-decoration:line-through' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="min-width:0">${escapeHtml(a.name)} <span style="opacity:.6;font-size:12px">${new Date(a.started_at).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span></span><b>${chFmt(c, a.value)}</b></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><span style="font-size:12.5px;opacity:.85">${stLab[a.status]}${a.video_path ? ' · 🎥 vidéo' : ' · sans vidéo'}</span>
        ${a.video_path ? `<button class="btn btn-ghost btn-sm" onclick="watchChallengeVideo('${a.id}')">▶ Voir la vidéo</button>` : ''}
        ${a.status !== 'validated' ? `<button class="btn btn-accent btn-sm" onclick="reviewAttempt('${a.id}','validated')">✅ Valider</button>` : ''}
        ${a.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" onclick="reviewAttempt('${a.id}','rejected')">❌ Refuser</button>` : ''}
        ${IS_SUPER ? `<button class="btn btn-ghost btn-sm" onclick="removeAttempt('${a.id}', ${a.removed ? 'false' : 'true'}, '${id}')">${a.removed ? 'Rétablir' : 'Retirer'}</button>` : ''}</div>
      ${a.review_note ? `<div style="font-size:12px;opacity:.7;margin-top:4px">Note : ${escapeHtml(a.review_note)}</div>` : ''}</div>`;
  tb.innerHTML = `<a class="backlink" onclick="renderChallengesAdmin()">← Challenges</a>
    <h3 style="font-family:Inter;font-weight:700;font-size:18px;margin:6px 0">${escapeHtml(c.badge_icon)} ${escapeHtml(c.title)} · résultats</h3>
    <div style="font-size:13px;opacity:.7;margin-bottom:10px">${escapeHtml(c.exercise_name)} · ${CH_KIND[c.kind]}</div>
    <div style="font-weight:700;margin:14px 0 6px">À valider (${pending.length})</div>
    ${pending.length ? pending.map(row).join('') : '<div class="empty">Rien en attente.</div>'}
    <div style="font-weight:700;margin:20px 0 6px">Classement (essais validés)</div>
    ${ranking.length ? ranking.map(([uid, v], i) => `<div style="display:flex;justify-content:space-between;padding:9px 2px;border-bottom:1px solid var(--line)"><span>${i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1) + '.'} ${escapeHtml(names[uid])}</span><b>${chFmt(c, v)}</b></div>`).join('') : '<div class="empty">Aucun résultat validé pour le moment.</div>'}
    <div style="font-weight:700;margin:20px 0 6px">Tous les essais</div>
    ${atts.filter(a => !pending.includes(a)).map(row).join('') || '<div class="empty">Aucun essai.</div>'}`;
}
async function reviewAttempt(attId, status){
  const a = (window._chAtts || []).find(x => x.id === attId); if(!a) return;
  let note = null, value = null;
  if(status === 'rejected'){ note = prompt('Motif du refus (visible par le client) :', 'Vidéo non conforme'); if(note === null) return; }
  else{
    const c = window._chCur;
    const v = prompt('Valider ' + a.name + ' avec le résultat suivant (' + (c.kind === 'hold' ? 'en secondes' : 'en répétitions') + '). Corrige-le si la vidéo montre autre chose :', a.value);
    if(v === null) return; value = parseInt(v); if(!(value >= 0)){ toast('Valeur invalide'); return; }
  }
  try{
    await api('/rest/v1/rpc/challenge_review', { method:'POST', body: JSON.stringify({ p_attempt: attId, p_status: status, p_note: note, p_value: value }) });
    toast(status === 'validated' ? 'Essai validé ✅' : 'Essai refusé'); openChallengeResults(window._chCur.id); refreshChPending();
  }catch(e){ toast('Erreur, réessaie'); }
}
async function watchChallengeVideo(attId){
  const a = (window._chAtts || []).find(x => x.id === attId); if(!a || !a.video_path) return;
  try{
    const r = await api('/storage/v1/object/sign/challenge-videos/' + a.video_path, { method:'POST', body: JSON.stringify({ expiresIn: 900 }) });
    const url = SUPABASE_URL + '/storage/v1' + r.signedURL;
    const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:1500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px';
    ov.innerHTML = `<div style="color:#fff;font-weight:700">${escapeHtml(a.name)} · ${chFmt(window._chCur, a.value)}</div><video src="${url}" controls playsinline autoplay style="max-width:100%;max-height:70vh;border-radius:12px"></video><button class="btn btn-ghost">Fermer</button>`;
    ov.querySelector('button').onclick = () => ov.remove(); document.body.appendChild(ov);
  }catch(e){ console.error(e); toast('Vidéo introuvable'); }
}
async function refreshChPending(){
  try{ const n = await api('/rest/v1/rpc/challenges_pending_count', { method:'POST', body:'{}' }); const el = document.getElementById('chPend'); if(el) el.textContent = n > 0 ? ' (' + n + ')' : ''; }catch(e){}
}
async function removeAttempt(attId, removed, chId){
  try{ await api(`/rest/v1/challenge_attempts?id=eq.${attId}`, { method:'PATCH', body: JSON.stringify({ removed }) }); openChallengeResults(chId); }catch(e){ toast('Erreur, réessaie'); }
}
