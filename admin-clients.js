// HS Coaching — espace admin : admin-clients.js (extrait de admin.html, comportement inchangé)
// ================= CLIENTS =================
let clientRows = [];
let pendingEditReqs = [];
function renderEditRequests(){
  const box = document.getElementById('editReqBox'); if(!box) return;
  if(!pendingEditReqs.length){ box.innerHTML = ''; return; }
  const nameOf = id => { const r = clientRows.find(x => x.client.id === id); return r ? (r.client.full_name || r.client.email) : 'Client'; };
  box.innerHTML = `<div class="card" style="border-color:var(--accent); margin-bottom:16px;">
    <h3 style="font-family:Inter; font-weight:700; font-size:16px; margin:0 0 4px;">✏️ ${pendingEditReqs.length} demande${pendingEditReqs.length>1?'s':''} de modification</h3>
    <p class="empty" style="padding:0 0 8px; text-align:left;">Si tu approuves, le client peut corriger les séries de cette séance puis la verrouiller de nouveau.</p>
    ${pendingEditReqs.map(r => {
      const s = r.sessions || {};
      const d = s.started_at ? new Date(s.started_at).toLocaleDateString('fr-FR',{day:'numeric', month:'long', year:'numeric'}) : '';
      const t = (s.programs && s.programs.name ? s.programs.name : 'Séance libre') + (s.day_label ? ' · ' + s.day_label : '');
      return `<div style="border-top:1px solid var(--line); padding:12px 0;">
        <div style="font-weight:700;">${escapeHtml(nameOf(r.user_id))} <span style="font-weight:500; color:var(--ink-muted);">· ${escapeHtml(d)} · ${escapeHtml(t)}</span></div>
        <div style="font-size:13.5px; margin:6px 0 10px; white-space:pre-wrap;">« ${escapeHtml(r.message)} »</div>
        <div class="row-actions" style="gap:8px; flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="openClientSessions('${r.user_id}',${jq(nameOf(r.user_id))})">📅 Voir la séance</button>
          <button class="btn btn-accent btn-sm" onclick="decideEditRequest('${r.id}', true)">Approuver</button>
          <button class="btn btn-ghost btn-sm" onclick="decideEditRequest('${r.id}', false)">Refuser</button>
        </div></div>`;
    }).join('')}</div>`;
}
async function decideEditRequest(id, approve){
  try{
    await api('/rest/v1/rpc/decide_edit_request', { method:'POST', body: JSON.stringify({ p_request: id, p_approve: approve }) });
  }catch(e){ console.error(e); toast('Action impossible. Réessaie.'); return; }
  pendingEditReqs = pendingEditReqs.filter(r => r.id !== id);
  renderEditRequests();
  toast(approve ? 'Modification autorisée' : 'Demande refusée');
}
// ---- Gestion des coachs (grand admin uniquement) ----
function coachesBoxHtml(clients){
  if(!IS_SUPER) return '';
  const n = id => (clients || []).filter(c => c.coach_id === id).length;
  const rows = coachList.length ? coachList.map(co => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)">
      <div style="min-width:180px;flex:1 1 180px"><div style="font-weight:700">${escapeHtml(co.full_name || 'Coach')}</div><div style="font-size:12.5px;opacity:.7;overflow:hidden;text-overflow:ellipsis">${escapeHtml(co.email || '')} · ${n(co.id)} client${n(co.id) > 1 ? 's' : ''}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="openMyCoachCard('${co.id}',${jq(co.full_name || co.email || 'ce coach')})">🪪 Fiche</button>
      <button class="btn btn-ghost btn-sm" onclick="demoteCoach('${co.id}',${jq(co.full_name || co.email || 'ce coach')})">Retirer les droits</button></div></div>`).join('')
    : '<div style="font-size:13px;opacity:.7;padding-top:8px">Aucun coach pour le moment. Pour en ajouter : ouvre la fiche d\'un client inscrit et appuie sur « 🎓 Promouvoir coach ». Tu pourras ensuite lui attribuer des clients.</div>';
  return `<details class="coaches-box" ${coachesOpen ? 'open' : ''} ontoggle="coachesOpen = this.open" style="border:1px solid var(--line);border-radius:16px;padding:4px 14px 12px;margin-bottom:16px">
    <summary style="cursor:pointer;font-weight:700;padding:12px 0">🎓 Coachs <span style="opacity:.6;font-weight:500">(${coachList.length})</span></summary>${rows}</details>`;
}
async function promoteCoach(id, name){
  if(!confirm(`Promouvoir « ${name} » coach ?\n\nIl aura accès à l'espace coach, mais seulement pour les clients que tu lui attribues. Tu peux retirer ses droits à tout moment.`)) return;
  try{ await api('/rest/v1/rpc/set_coach_role', { method:'POST', body: JSON.stringify({ p_user: id, p_make: true }) }); coachesOpen = true; toast(name + ' est maintenant coach (voir l’encadré Coachs)'); renderClientsTab(); }
  catch(e){ toast('Erreur : ' + String((e && e.detail) || (e && e.message) || e).slice(0, 120)); }
}
async function demoteCoach(id, name){
  if(!confirm(`Retirer les droits de coach à « ${name} » ?\n\nIl redevient simple client et perd l'accès à l'espace coach. Ses clients te sont réattribués.`)) return;
  try{ await api('/rest/v1/rpc/set_coach_role', { method:'POST', body: JSON.stringify({ p_user: id, p_make: false }) }); toast('Droits retirés'); renderClientsTab(); }
  catch(e){ toast('Erreur : ' + String((e && e.detail) || (e && e.message) || e).slice(0, 120)); }
}
async function assignClientTo(clientId, coachId, sel){
  try{ await api('/rest/v1/rpc/assign_client', { method:'POST', body: JSON.stringify({ p_client: clientId, p_coach: coachId || null }) });
    const r = clientRows.find(x => x.client.id === clientId); if(r) r.client.coach_id = coachId || null;
    toast(coachId ? 'Client attribué' : 'Client repris par toi'); }
  catch(e){ toast('Erreur, réessaie'); renderClientsTab(); }
}
let clientSearchQ = '';
async function renderClientsTab(){
  document.getElementById('tabBody').innerHTML = '<div class="empty">Chargement…</div>';
  let clients, progs, sessions, convs, unreadMsgs, revs = [], editReqs = [];
  try{
    clients = await api('/rest/v1/profiles?select=id,full_name,email,featured_badge,coach_id,role&' + (IS_SUPER ? `role=in.(client,coach)&id=neq.${MY_ID}` : 'role=eq.client') + '&order=full_name');   // le grand admin garde aussi accès aux comptes devenus coachs (leurs séances/programmes perso)
    coachList = IS_SUPER ? ((await api('/rest/v1/profiles?select=id,full_name,email&role=eq.coach&order=full_name').catch(()=>[])) || []) : [];
    if(!clients.length){ document.getElementById('tabBody').innerHTML = coachesBoxHtml([]) + '<div class="empty">Aucun client pour le moment.</div>'; return; }
    const idList = clients.map(c=>c.id).join(',');
    [progs, sessions, convs, unreadMsgs] = await Promise.all([
      api(`/rest/v1/programs?select=id,name,owner_user_id,created_at&owner_user_id=in.(${idList})&is_official=eq.false&order=created_at.desc`),
      api(`/rest/v1/sessions?select=id,user_id,started_at,completed_at,badge_eligible&imported=is.false&for_name=is.null&user_id=in.(${idList})&order=started_at.desc&limit=5000`),
      api(`/rest/v1/conversations?select=id,user_id&user_id=in.(${idList})`),
      api('/rest/v1/messages?select=conversation_id&sender=eq.user&read=eq.false')
    ]);
    try{ revs = await api(`/rest/v1/badge_revocations?select=user_id,badge_id,reason&user_id=in.(${idList})`) || []; }catch(e){ revs = []; }
    try{ editReqs = await api('/rest/v1/session_edit_requests?select=id,session_id,user_id,message,created_at,sessions(started_at,day_label,programs(name))&status=eq.pending&order=created_at') || []; }catch(e){ editReqs = []; }
  }catch(e){
    console.error(e);
    document.getElementById('tabBody').innerHTML = '<div class="empty">Impossible de charger les clients. Réessaie.</div>';
    return;
  }
  const programsByUser = {};
  progs.forEach(p=>{ (programsByUser[p.owner_user_id] = programsByUser[p.owner_user_id] || []).push(p); });
  const lastActivityByUser = {};
  const sessionsByUser = {};
  sessions.forEach(s=>{
    if(s.user_id && !lastActivityByUser[s.user_id]) lastActivityByUser[s.user_id] = s.started_at;
    if(s.user_id) (sessionsByUser[s.user_id] = sessionsByUser[s.user_id] || []).push(s);
  });
  const convByUser = {}; convs.forEach(c=> convByUser[c.user_id] = c.id);
  const unreadByConv = {}; unreadMsgs.forEach(m=> unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id]||0)+1);

  clientRows = clients.map(c=>{
    const progsOfUser = programsByUser[c.id] || [];
    const prog = progsOfUser[0] || null;
    const last = lastActivityByUser[c.id] || null;
    const convId = convByUser[c.id] || null;
    const unread = (convId && !(IS_SUPER && c.coach_id)) ? (unreadByConv[convId]||0) : 0;
    let badgeLine = '', badgeChip = '';
    try{ if(typeof HSBadges !== 'undefined'){ const bres = HSBadges.compute({ sessions: sessionsByUser[c.id] || [], revoked: revs.filter(r => r.user_id === c.id) }); badgeLine = HSBadges.summaryLine(bres); badgeChip = HSBadges.chip(bres, c.featured_badge); } }catch(e){}
    return { client:c, prog, progs: progsOfUser, last, convId, unread, badgeLine, badgeChip };
  });
  clientRows.sort((a,b)=>{
    if(a.unread !== b.unread) return b.unread - a.unread;
    const ta = a.last ? new Date(a.last).getTime() : 0;
    const tb = b.last ? new Date(b.last).getTime() : 0;
    return tb - ta;
  });
  clientSearchQ = ''; clientFilter = 'all';
  pendingEditReqs = editReqs;
  document.getElementById('tabBody').innerHTML = coachesBoxHtml(clients) + `
    <div id="editReqBox"></div>
    <div class="field"><label>Chercher un client</label><input id="clientSearch" type="text" placeholder="Nom ou email…" oninput="filterClientsTab(this.value)"></div>
    <div id="clientFilters">${clientFilterBar()}</div>
    <div id="clientsList" class="clients-grid"></div>
  `;
  renderEditRequests();
  renderClientRows(clientRows.filter(clientFilterOk));
  try{ loadRanks(clients); }catch(e){ console.error(e); }
}
let clientFilter = 'all';
function daysSince(iso){ return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null; }
function clientFilterOk(r){
  if(clientFilter === 'unread') return r.unread > 0;
  if(clientFilter === 'idle') { const d = daysSince(r.last); return d === null || d >= 7; }
  if(clientFilter === 'noprog') return !r.progs.length;
  return true;
}
function setClientFilter(f){ clientFilter = f; filterClientsTab(document.getElementById('clientSearch')?.value || ''); }
function clientFilterBar(){
  const n = { all: clientRows.length, unread: clientRows.filter(r=>r.unread>0).length,
    idle: clientRows.filter(r=>{ const d = daysSince(r.last); return d === null || d >= 7; }).length,
    noprog: clientRows.filter(r=>!r.progs.length).length };
  const chip = (k, label) => `<button class="subtab ${clientFilter===k?'active':''}" onclick="setClientFilter('${k}')">${label} <span style="opacity:.65">${n[k]}</span></button>`;
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px">${chip('all','Tous')}${chip('unread','Messages non lus')}${chip('idle','À relancer (7 j)')}${chip('noprog','Sans programme')}</div>`;
}
function filterClientsTab(q){
  clientSearchQ = (q || '').trim().fold();
  const matches = clientRows.filter(r => clientFilterOk(r) && (!clientSearchQ ||
    (r.client.full_name||'').fold().includes(clientSearchQ) || (r.client.email||'').fold().includes(clientSearchQ)));
  const fb = document.getElementById('clientFilters'); if(fb) fb.innerHTML = clientFilterBar();
  renderClientRows(matches);
}
const expandedClients = new Set();
function toggleMoreProgs(id){
  if(expandedClients.has(id)) expandedClients.delete(id); else expandedClients.add(id);
  filterClientsTab(document.getElementById('clientSearch')?.value || '');
}
function renderClientRows(rows){
  document.getElementById('clientsList').innerHTML = rows.length ? rows.map(r=>{
    const name = r.client.full_name || r.client.email || 'Client';
    const esc = jq(name), id = r.client.id;
    const d = daysSince(r.last);
    const idle = d === null || d >= 7;
    const lastTxt = r.last ? (d === 0 ? "Séance aujourd'hui" : d === 1 ? 'Séance hier' : `Dernière séance il y a ${d} j`) : 'Aucune séance enregistrée';
    const progRow = p => `<span style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</span><button class="btn btn-ghost btn-sm" style="flex:none;" onclick="goToProgramForm('${p.id}')">Voir</button></span>`;
    const progs = r.progs;
    const LIM = 1, shown = progs.slice(0, LIM), rest = progs.slice(LIM), open = expandedClients.has(id);
    const progBlock = progs.length
      ? shown.map(progRow).join('') + (rest.length
          ? `<span style="display:${open?'block':'none'};">${rest.map(progRow).join('')}</span><button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="toggleMoreProgs('${id}')">${open?'Masquer ▴':`+ ${rest.length} autre${rest.length>1?'s':''} programme${rest.length>1?'s':''} ▾`}</button>`
          : '')
      : '<span style="opacity:.7">Aucun programme assigné</span>';
    const coachSel = (IS_SUPER && r.client.role !== 'coach') ? `<label style="display:block;margin-top:10px;font-size:12px;opacity:.75">Coach attitré
        <select style="display:block;margin-top:4px;background:var(--surface-2);color:inherit;border:1px solid var(--line);padding:8px;font:inherit;width:100%" onchange="assignClientTo('${id}', this.value, this)">
          <option value="">Moi (grand admin)</option>
          ${coachList.map(co => `<option value="${co.id}" ${r.client.coach_id === co.id ? 'selected' : ''}>${escapeHtml(co.full_name || co.email || 'Coach')}</option>`).join('')}
        </select></label>` : '';
    return `<div class="card" style="cursor:default;margin:0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="min-width:0">
          <h3 style="margin:0">${escapeHtml(name)}${r.client.role==='coach' ? ' <span class="badge" style="vertical-align:middle">Coach</span>' : ''}${r.badgeChip || ''} <span data-rk="${id}">${(typeof HSRang !== 'undefined' && RANKS[id]) ? HSRang.chip(RANKS[id]) : ''}</span></h3>
          <p style="margin:4px 0 0;opacity:.7;font-size:13px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.client.email||'')}</p>
        </div>
        ${r.unread ? `<span class="badge" title="Messages non lus">${r.unread}</span>` : ''}
      </div>
      <p style="margin:10px 0 0;font-size:13.5px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${idle?'#ff5a4e':'var(--ink)'}"></span>${lastTxt}${r.badgeLine ? ` · <span style="opacity:.75">${escapeHtml(r.badgeLine)}</span>` : ''}</p>
      <div style="margin-top:10px;font-size:14px">${progBlock}</div>
      <div class="row-actions" style="margin-top:12px;">
        ${r.convId
          ? `<button class="btn btn-accent btn-sm" onclick="goToClientConversation('${r.convId}',${esc})">💬 Message${r.unread?` (${r.unread})`:''}</button>`
          : `<button class="btn btn-accent btn-sm" onclick="startConversationWith('${id}',${esc},this)">💬 Écrire</button>`}
        <button class="btn btn-ghost btn-sm" onclick="openClientSessions('${id}',${esc})">📅 Séances</button>
        <button class="btn btn-ghost btn-sm" onclick="goToNewProgramFor('${id}')">+ Programme</button>
      </div>
      <details style="margin-top:10px">
        <summary style="cursor:pointer;font-size:13px;opacity:.8;padding:6px 0">Plus d'actions</summary>
        <div class="row-actions" style="margin-top:8px;">
          <button class="btn btn-ghost btn-sm" onclick="openClientProgress('${id}',${esc})">📈 Progression</button>
          <button class="btn btn-ghost btn-sm" onclick="openClientRecovery('${id}',${esc})">😴 Repos</button>
          <button class="btn btn-ghost btn-sm" onclick="openBadgesModal('${id}',${esc})">🏅 Badges</button>
          <button class="btn btn-ghost btn-sm" onclick="openClientRang('${id}',${esc})">🏛 Rang</button>
          <button class="btn btn-ghost btn-sm" onclick="printClientReport('${id}')">📄 Export PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="copyClientHistory('${id}',${esc})">📋 Garder une copie de son historique</button>
          ${IS_SUPER && r.client.role !== 'admin' ? `<button class="btn btn-ghost btn-sm" style="color:#e5806f;border-color:#7a2a2a;" onclick="deleteAccount('${id}',${esc},'${r.client.role}')">🗑 Supprimer le compte</button>` : ''}
          ${IS_SUPER && r.client.role !== 'coach' ? `<button class="btn btn-ghost btn-sm" onclick="promoteCoach('${id}',${esc})">🎓 Promouvoir coach</button>` : ''}
        </div>
        ${coachSel}
      </details>
    </div>`;
  }).join('') : '<div class="empty">Aucun client ne correspond.</div>';
}
// ---- Rangs (force / endurance) des clients ----
const RANKS = {};
async function loadRanks(list){
  if(typeof HSRang === 'undefined' || !list || !list.length) return;
  const getJson = async p => { try{ return await api(p); }catch(e){ throw e; } };
  try{
    const res = await HSRang.batch(getJson, list.map(c => c.id));
    Object.assign(RANKS, res);
    document.querySelectorAll('[data-rk]').forEach(el => { el.innerHTML = RANKS[el.dataset.rk] ? HSRang.chip(RANKS[el.dataset.rk]) : ''; });
  }catch(e){ console.error(e); }
}
async function deleteAccount(id, name, role){
  const extra = role === 'coach' ? '\n\nC\'est un coach : ses clients repassent sous ta responsabilité et les historiques qu\'il avait archivés chez lui sont supprimés.' : '';
  if(!confirm('Supprimer définitivement le compte de ' + name + ' ?\n\nSes séances, programmes, messages et données sont effacés. Impossible de revenir en arrière.' + extra)) return;
  const typed = prompt('Pour confirmer, tape le mot SUPPRIMER :');
  if(!typed || typed.trim().toUpperCase() !== 'SUPPRIMER') { toast('Suppression annulée'); return; }
  try{
    await api('/rest/v1/rpc/admin_delete_user', { method:'POST', body: JSON.stringify({ p_user: id }) });
    toast('Compte supprimé ✓');
    load();
  }catch(e){
    console.error(e);
    const t = String(e && e.detail || '');
    toast(/PGRST202|Could not find/.test(t) ? 'Lance d\'abord le script add-suppression.sql' : /admin/.test(t) ? 'Un compte admin ne peut pas être supprimé' : 'Suppression impossible');
  }
}
async function copyClientHistory(clientId, name){
  if(!confirm('Garder chez toi une copie de tout l\'historique de ' + name + ' ?\n\nElle reste visible dans ton Historique sous son nom, même si elle change de coach. Son compte à elle ne change pas.')) return;
  try{
    const r = await api('/rest/v1/rpc/copy_history_to_me', { method:'POST', body: JSON.stringify({ p_from: clientId }) });
    toast(r && r.sessions ? r.sessions + ' séance(s) copiée(s) dans ton historique ✓' : 'Déjà à jour, rien de nouveau à copier');
  }catch(e){ console.error(e); toast('Impossible : le script add-transfert2.sql est-il lancé ?'); }
}
async function openClientRang(clientId, name){
  const tb = document.getElementById('tabBody');
  const back = '<a class="backlink" onclick="renderClientsTab()">← Clients</a>';
  tb.innerHTML = back + `<h3 style="font-family:Inter; font-weight:700; font-size:18px; margin:6px 0 12px;">Rang · ${escapeHtml(name)}</h3><div id="rangBox"></div>`;
  if(typeof HSRang === 'undefined'){ document.getElementById('rangBox').innerHTML = '<div class="empty">Rang indisponible.</div>'; return; }
  const apiFetch = async p => { try{ const j = await api(p); return { ok: true, json: async () => j }; }catch(e){ return { ok: false, json: async () => [] }; } };
  HSRang.load(document.getElementById('rangBox'), { uid: clientId, apiFetch, coach: true,
    setSex: async v => { await api('/rest/v1/rpc/set_client_sex', { method:'POST', body: JSON.stringify({ p_user: clientId, p_sex: v }) }); delete RANKS[clientId]; loadRanks([{ id: clientId }]); },
    goPoids: () => {} });
}
// ---- Bilans de récupération d'un client (sommeil, courbatures, énergie) ----
async function openClientRecovery(clientId, name){
  const tb = document.getElementById('tabBody');
  const back = '<a class="backlink" onclick="renderClientsTab()">← Clients</a>';
  tb.innerHTML = back + '<div class="empty">Chargement…</div>';
  let rows;
  try{
    rows = await api(`/rest/v1/recovery_checkins?select=day,sleep_hours,soreness,energy&user_id=eq.${encodeURIComponent(clientId)}&order=day.desc&limit=60`);
  }catch(e){
    console.error(e);
    tb.innerHTML = back + '<div class="empty">Impossible de charger les bilans. Réessaie.</div>';
    return;
  }
  const head = `${back}<h3 style="font-family:Inter; font-weight:700; font-size:18px; margin:6px 0 4px;">Récupération · ${escapeHtml(name)}</h3>`;
  if(!rows.length){ tb.innerHTML = head + '<div class="empty">Ce client n\'a pas encore rempli de bilan.</div>'; return; }
  const SO = ['😀','🙂','😐','😣','🥵'], EN = ['🪫','😴','😐','💪','⚡'];
  const last7 = rows.slice(0, 7), avg = last7.reduce((a,x) => a + Number(x.sleep_hours), 0) / last7.length;
  const last3 = rows.slice(0, 3);
  const alerts = [];
  if(last7.length >= 3 && avg < 6.5) alerts.push(`😴 Sommeil court : ${avg.toFixed(1).replace('.', ',')} h en moyenne sur ses ${last7.length} derniers bilans`);
  if(last3.length >= 3 && last3.every(x => x.soreness >= 4)) alerts.push('🥵 Courbatures fortes sur les 3 derniers bilans');
  if(last3.length >= 3 && last3.every(x => x.energy && x.energy <= 2)) alerts.push('🪫 Énergie basse sur les 3 derniers bilans');
  const fmtD = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  tb.innerHTML = head + `
    ${alerts.length ? `<div style="padding:12px 14px;border:1px solid #c0562f;border-radius:12px;margin:10px 0">${alerts.map(a => `<div>${a}</div>`).join('')}</div>` : ''}
    <div style="display:flex;gap:10px;margin:12px 0">
      <div style="flex:1;padding:12px;border:1px solid var(--line);border-radius:12px;text-align:center"><div style="font-size:22px;font-weight:800">${avg.toFixed(1).replace('.', ',')} h</div><div style="font-size:12px;opacity:.7">Sommeil moyen (7 derniers)</div></div>
      <div style="flex:1;padding:12px;border:1px solid var(--line);border-radius:12px;text-align:center"><div style="font-size:22px;font-weight:800">${rows.length}</div><div style="font-size:12px;opacity:.7">Bilans remplis</div></div>
    </div>
    ${rows.slice(0, 30).map(x => `<div style="display:flex;justify-content:space-between;padding:9px 2px;border-bottom:1px solid var(--line)"><span style="text-transform:capitalize">${fmtD(x.day)}</span><span>${String(x.sleep_hours).replace('.', ',')} h${x.soreness ? ' · courbatures ' + SO[x.soreness-1] : ''}${x.energy ? ' · énergie ' + EN[x.energy-1] : ''}</span></div>`).join('')}`;
}
// ---- Séances réalisées par un client (consultation coach) ----
let csClient = null, csSessions = [], csShowAll = false;
function fmtSessDuration(s){
  if(!s.completed_at) return '';
  let ms = new Date(s.completed_at) - new Date(s.started_at);
  if(s.declared_seconds != null) ms = s.declared_seconds * 1000;
  if(ms <= 2000) return '';
  const tot = Math.round(ms/1000), h = Math.floor(tot/3600), m = Math.floor((tot%3600)/60), sec = tot%60;
  return h ? `${h} h ${String(m).padStart(2,'0')} min` : (m ? `${m} min ${String(sec).padStart(2,'0')} s` : `${sec} s`);
}
async function openClientSessions(clientId, name){
  csClient = { id: clientId, name }; csShowAll = false;
  document.getElementById('tabBody').innerHTML = '<div class="empty">Chargement…</div>';
  try{
    csSessions = await api(`/rest/v1/sessions?select=id,started_at,completed_at,day_label,declared_seconds,badge_eligible,source,edit_unlocked,imported,date_unknown,programs(name)&user_id=eq.${clientId}&order=started_at.desc&limit=300`);
  }catch(e){
    console.error(e);
    document.getElementById('tabBody').innerHTML = '<a class="backlink" onclick="renderClientsTab()">← Clients</a><div class="empty">Impossible de charger les séances. Réessaie.</div>';
    return;
  }
  renderClientSessions();
}
function renderClientSessions(){
  const done = csSessions.filter(s => s.completed_at);
  const list = csShowAll ? csSessions : done;
  const hidden = csSessions.length - done.length;
  const last = done[0] ? new Date(done[0].started_at).toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'}) : null;
  document.getElementById('tabBody').innerHTML = `
    <a class="backlink" onclick="renderClientsTab()">← Clients</a>
    <h3 style="font-family:Inter; font-weight:700; font-size:18px; margin:6px 0 4px;">${escapeHtml(csClient.name)}</h3>
    <p class="empty" style="padding:0 0 12px; text-align:left;">${done.length} séance${done.length>1?'s':''} terminée${done.length>1?'s':''}${last ? ` · dernière : ${escapeHtml(last)}` : ''}</p>
    ${hidden ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--ink-muted);margin-bottom:12px;cursor:pointer;"><input type="checkbox" ${csShowAll?'checked':''} onchange="csShowAll=this.checked; renderClientSessions()"> Afficher aussi les ${hidden} séance${hidden>1?'s':''} non terminée${hidden>1?'s':''}</label>` : ''}
    <div id="csList">${list.length ? list.map(s=>{
      const d = new Date(s.started_at);
      const dur = fmtSessDuration(s);
      const title = (s.programs && s.programs.name ? s.programs.name : 'Séance libre') + (s.day_label ? ' · ' + s.day_label : '');
      return `<div class="card" onclick="toggleClientSession(this,'${s.id}')">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;"><div class="tag">${s.date_unknown ? 'Date inconnue · 📥 importée' : escapeHtml(d.toLocaleDateString('fr-FR',{weekday:'short', day:'numeric', month:'long', year:'numeric'})) + (s.imported ? ' · 📥 importée' : ' · ' + escapeHtml(d.toLocaleTimeString('fr-FR',{hour:'2-digit', minute:'2-digit'})))}${dur ? ' · ' + escapeHtml(dur) : ''}${s.completed_at ? '' : ' · non terminée'}</div>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Supprimer" onclick="event.stopPropagation(); askDeleteClientSession('${s.id}')">🗑</button></div>
        <h3>${escapeHtml(title)}</h3>
        ${s.completed_at ? (s.badge_eligible ? '<div style="font-size:12px; color:var(--accent); margin-top:6px;">🏅 Compte pour les badges</div>' : `<div style="font-size:12px; color:var(--ink-muted); margin-top:6px;">${s.source === 'manual' ? '✍️ Saisie après coup · ne compte pas pour les badges' : 'Ne compte pas pour les badges (ni 4 séries ni 10 min de cardio, &lt; 10 min ou 2e séance du jour)'}</div>`) : ''}
        ${s.edit_unlocked ? '<div style="font-size:12px; color:var(--accent); margin-top:6px;">✏️ Modification autorisée en cours</div>' : ''}
        <div class="cs-logs" style="display:none; margin-top:12px;"></div>
      </div>`;
    }).join('') : '<div class="empty">Aucune séance enregistrée pour ce client.</div>'}</div>
  `;
}
function askDeleteClientSession(id){
  const s = csSessions.find(x => x.id === id); if(!s) return;
  HSHistory.confirmDelete({ session: s, req: api, userId: csClient.id, who: csClient.name,
    onDone: () => { csSessions = csSessions.filter(x => x.id !== id); renderClientSessions(); } });
}
function renderClientLogs(box, logs){
  const keyOf = x => ((x.exercises && x.exercises.name) || '') + '|' + x.set_number;
  const hasVal = new Set(logs.filter(x => x.reps != null || x.charge != null || x.duration_seconds).map(keyOf));
  logs = logs.filter(x => x.reps != null || x.charge != null || x.duration_seconds || !hasVal.has(keyOf(x)));
  box._logs = logs;
  const byEx = {}; let vol = 0;
  logs.forEach(l=>{
    const n = (l.exercises && l.exercises.name) || 'Exercice';
    (byEx[n] = byEx[n] || []).push(l);
    if(!l.duration_seconds && l.reps && l.charge) vol += l.reps * l.charge;
  });
  const inp = (cls, v, ph, w, step) => `<input class="${cls}" type="number" inputmode="decimal" ${step?`step="${step}"`:''} min="0" value="${v ?? ''}" placeholder="${ph}" style="width:${w}px;padding:6px 8px;">`;
  box.innerHTML = '<div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">✏️ Tu peux corriger chaque série (reps, kg ou durée en min/s) puis appuyer sur Enregistrer.</div>' +
  Object.entries(byEx).map(([n, sets])=>{
    const body = `<div class="set-rows">${sets.map(x=>{
      const m = x.duration_seconds ? Math.floor(x.duration_seconds/60) : '', sc = x.duration_seconds ? x.duration_seconds%60 : '';
      return `<div class="set-row cs-edit" data-id="${x.id}" style="flex-wrap:wrap;gap:6px;"><span class="set-row-num">Série ${x.set_number}</span><span class="set-row-val" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:flex-end;">${inp('c-reps',x.reps,'reps',58)}<span>reps</span>${inp('c-kg',x.charge,'kg',66,'0.5')}<span>kg</span>${inp('c-min',m,'min',54)}<span>min</span>${inp('c-sec',sc,'s',50)}<span>s</span><button type="button" class="btn btn-accent btn-sm" onclick="saveClientLog(this)">Enregistrer</button><button type="button" class="btn btn-ghost btn-sm" aria-label="Retirer cette série" onclick="removeClientSet(this)">🗑</button></span></div>`;
    }).join('')}</div>`;
    return `<div style="margin-bottom:14px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;"><div style="font-weight:700;font-size:14px;">${escapeHtml(n)}</div><button type="button" class="btn btn-ghost btn-sm" data-ex="${sets[0].exercise_id}" onclick="changeClientExercise(this)">🔄 Changer d'exercice</button></div>${body}<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-ex="${sets[0].exercise_id}" onclick="addClientSet(this)">+ Ajouter une série</button></div>`;
  }).join('') + `<div class="cs-total" style="border-top:1px solid var(--line);padding-top:10px;font-size:13.5px;display:${vol?'flex':'none'};justify-content:space-between;"><span>Poids total soulevé</span><b>${Math.round(vol).toLocaleString('fr-FR')} kg</b></div>`;
}
async function changeClientExercise(btn){
  const box = btn.closest('.cs-logs'), oldId = btn.dataset.ex;
  const mine = (box._logs || []).filter(l => l.exercise_id === oldId); if(!mine.length) return;
  const oldName = (mine[0].exercises && mine[0].exercises.name) || 'cet exercice';
  const st = { id: null, group: 'Tous', muscle: null, q: '', variant: null };
  const old = document.getElementById('chExOv'); if(old) old.remove();
  const ov = document.createElement('div'); ov.id = 'chExOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1300;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow:auto';
  ov.onclick = e => { if(e.target === ov) ov.remove(); };
  ov.innerHTML = `<div style="max-width:560px;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;margin:auto">
    <h3 style="margin:0 0 6px">Changer d'exercice</h3>
    <div style="font-size:13px;opacity:.75;margin-bottom:10px">Les ${mine.length} série(s) de « ${escapeHtml(oldName)} » seront déplacées vers l'exercice choisi (la progression suivra).</div>
    <div id="chExVar"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="chExQ" type="text" placeholder="🔍 Rechercher…" style="flex:2 1 150px;min-width:0;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:11px;font:inherit;font-size:16px"><select id="chExSel" style="flex:1 1 140px;min-width:0;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:11px;font:inherit;font-size:16px"></select></div>
    <div id="chExGrid" class="pick-ex-grid"></div>
    <div style="display:flex;gap:8px"><button class="btn btn-accent" id="chExOk" style="flex:1" disabled>Déplacer</button><button class="btn btn-ghost" id="chExNo">Annuler</button></div></div>`;
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#'+id);
  const pool = () => (exercises || []).filter(e => e.id !== oldId);
  const paintVar = () => {
    const v = st.variant && exercisesById[st.variant];
    $('chExVar').innerHTML = v ? `<button type="button" class="btn btn-accent" style="width:100%;margin-bottom:10px;text-align:left;display:flex;gap:10px;align-items:center" id="chExVarBtn">${pickImgTag(v) ? '<span style="width:44px;flex:none">'+pickImgTag(v)+'</span>' : ''}<span>↔ Variante prévue au programme<br><b>${escapeHtml(v.name)}</b></span></button>` : '';
    const vb = $('chExVarBtn'); if(vb) vb.onclick = () => { st.id = v.id; paintGrid(); $('chExOk').disabled = false; $('chExOk').click(); };
  };
  const paintGrid = () => {
    const q = st.q.trim().fold();
    const list = pool().filter(e => muscleMatch(e, $('chExSel').value) && (!q ||
      (e.name||'').fold().includes(q) || (e.category||'').fold().includes(q)
      || (e.primary_muscles||[]).some(m=>(m||'').fold().includes(q)) || (e.secondary_muscles||[]).some(m=>(m||'').fold().includes(q))));
    const g = $('chExGrid');
    g.innerHTML = list.length ? list.map(e => `<button type="button" class="pick-ex-card ${e.id===st.id?'selected':''}" data-id="${e.id}">${pickImgTag(e) || '<span class="pick-ex-noimg">'+escapeHtml(e.category||'')+'</span>'}<span>${escapeHtml(e.name)}</span></button>`).join('') : '<div class="empty" style="grid-column:1/-1;padding:20px 0;">Aucun résultat.</div>';
    g.querySelectorAll('.pick-ex-card').forEach(c => c.onclick = () => { st.id = c.dataset.id; $('chExOk').disabled = false; g.querySelectorAll('.pick-ex-card').forEach(x => x.classList.toggle('selected', x === c)); });
  };
  $('chExSel').innerHTML = muscleSelectHtml(pool()); $('chExSel').onchange = paintGrid;
  paintGrid();
  $('chExQ').addEventListener('input', e => { st.q = e.target.value; paintGrid(); });
  $('chExNo').onclick = () => ov.remove();
  // variante prévue au programme : on la propose en premier
  (async () => {
    try{
      const ss = await api(`/rest/v1/sessions?select=program_id&id=eq.${mine[0].session_id}`);
      const pid = ss && ss[0] && ss[0].program_id; if(!pid) return;
      const pe = await api(`/rest/v1/program_exercises?select=variant_exercise_id&program_id=eq.${pid}&exercise_id=eq.${oldId}&variant_exercise_id=not.is.null&limit=1`);
      if(pe && pe[0] && pe[0].variant_exercise_id){ st.variant = pe[0].variant_exercise_id; paintVar(); }
    }catch(e){ console.error(e); }
  })();
  $('chExOk').onclick = async () => {
    const newId = st.id; if(!newId) return;
    const ne = exercisesById[newId] || (exercises||[]).find(e => e.id === newId); const newName = ne ? ne.name : 'Exercice';
    const okb = $('chExOk'); okb.disabled = true;
    try{
      const existing = (box._logs || []).filter(l => l.exercise_id === newId);
      let next = existing.reduce((m,l)=> Math.max(m, l.set_number||0), 0);
      const ordered = mine.slice().sort((a,b)=> a.set_number - b.set_number);
      for(const l of ordered){
        const body = { exercise_id: newId }; if(existing.length){ next++; body.set_number = next; }
        await api(`/rest/v1/session_logs?id=eq.${l.id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(body) });
        l.exercise_id = newId; l.exercises = { name: newName }; if(body.set_number) l.set_number = body.set_number;
      }
      box._logs.sort((x, y) => x.set_number - y.set_number);
      ov.remove(); renderClientLogs(box, box._logs); toast('Exercice changé ✓');
    }catch(e){ console.error(e); toast('Changement impossible, réessaie'); okb.disabled = false; }
  };
}
async function addClientSet(btn){
  const box = btn.closest('.cs-logs'), exId = btn.dataset.ex;
  const mine = (box._logs || []).filter(l => l.exercise_id === exId);
  if(!mine.length) return;
  const last = mine.reduce((m, l) => l.set_number > m.set_number ? l : m, mine[0]);
  const body = { session_id: last.session_id, exercise_id: exId, set_number: last.set_number + 1, reps: last.reps, charge: last.charge, duration_seconds: last.duration_seconds };
  btn.disabled = true;
  try{
    const r = await api('/rest/v1/session_logs?select=id,session_id,exercise_id,set_number,reps,charge,duration_seconds,exercises(name)', { method:'POST', headers:{ Prefer:'return=representation' }, body: JSON.stringify(body) });
    box._logs.push(r[0]); box._logs.sort((x, y) => x.set_number - y.set_number);
    renderClientLogs(box, box._logs); toast('Série ajoutée (copie de la précédente, corrige puis Enregistrer)');
  }catch(e){ console.error(e); toast('Ajout impossible, réessaie'); btn.disabled = false; }
}
async function removeClientSet(btn){
  const row = btn.closest('.cs-edit'), box = btn.closest('.cs-logs');
  const l = (box._logs || []).find(x => String(x.id) === row.dataset.id); if(!l) return;
  const sameEx = box._logs.filter(x => x.exercise_id === l.exercise_id);
  if(sameEx.length <= 1){ toast('Dernière série de cet exercice : supprime plutôt la séance'); return; }
  if(!confirm('Retirer la série ' + l.set_number + ' de « ' + ((l.exercises && l.exercises.name) || 'cet exercice') + ' » ?')) return;
  btn.disabled = true;
  try{
    await api(`/rest/v1/session_logs?id=eq.${l.id}`, { method:'DELETE', headers:{ Prefer:'return=minimal' } });
    box._logs = box._logs.filter(x => x !== l);
    const rest = box._logs.filter(x => x.exercise_id === l.exercise_id).sort((x, y) => x.set_number - y.set_number);
    for(let i = 0; i < rest.length; i++){
      if(rest[i].set_number !== i + 1){ await api(`/rest/v1/session_logs?id=eq.${rest[i].id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body: JSON.stringify({ set_number: i + 1 }) }); rest[i].set_number = i + 1; }
    }
    renderClientLogs(box, box._logs); toast('Série retirée');
  }catch(e){ console.error(e); toast('Suppression impossible, réessaie'); btn.disabled = false; }
}
async function saveClientLog(btn){
  const row = btn.closest('.cs-edit'), box = btn.closest('.cs-logs');
  const g = c => row.querySelector(c).value.trim();
  const reps = g('.c-reps'), kg = g('.c-kg'), mn = g('.c-min'), sc = g('.c-sec');
  const dur = (parseInt(mn)||0)*60 + (parseInt(sc)||0);
  const body = { reps: reps === '' ? null : parseInt(reps), charge: kg === '' ? null : parseFloat(kg), duration_seconds: dur > 0 ? Math.min(dur, 86400) : null };
  btn.disabled = true;
  try{
    await api(`/rest/v1/session_logs?id=eq.${row.dataset.id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(body) });
    const l = (box._logs||[]).find(x => String(x.id) === row.dataset.id); if(l) Object.assign(l, body);
    let vol = 0; (box._logs||[]).forEach(x => { if(!x.duration_seconds && x.reps && x.charge) vol += x.reps*x.charge; });
    const t = box.querySelector('.cs-total'); if(t){ t.style.display = vol ? 'flex' : 'none'; t.querySelector('b').textContent = Math.round(vol).toLocaleString('fr-FR') + ' kg'; }
    toast('Série modifiée ✓');
  }catch(e){ console.error(e); toast('Modification impossible, réessaie'); }
  btn.disabled = false;
}
async function toggleClientSession(card, sessionId){
  const box = card.querySelector('.cs-logs');
  if(box.style.display === 'block'){ box.style.display = 'none'; return; }
  box.style.display = 'block';
  if(box.dataset.loaded) return;
  box.innerHTML = '<div class="empty" style="padding:6px 0;">Chargement…</div>';
  try{
    const logs = await api(`/rest/v1/session_logs?select=id,session_id,exercise_id,set_number,reps,charge,duration_seconds,exercises(name)&session_id=eq.${sessionId}&order=set_number,id`);
    if(!logs.length){ box.innerHTML = '<div class="empty" style="padding:6px 0;">Aucune série enregistrée pour cette séance.</div>'; box.dataset.loaded = '1'; return; }
    box.onclick = ev => ev.stopPropagation();
    renderClientLogs(box, logs);
    box.dataset.loaded = '1';
  }catch(e){
    console.error(e);
    box.innerHTML = '<div class="empty" style="padding:6px 0;">Impossible de charger le détail.</div>';
  }
}
// ---- Progression d'un client (consultation coach) ----
function cpWeekKey(d){ const x = new Date(d); x.setDate(x.getDate() - ((x.getDay()+6)%7)); x.setHours(0,0,0,0); return x.getTime(); }
function cpSpark(pts){
  if(pts.length < 2) return '';
  const w = 280, h = 64, pad = 8, ch = pts.map(p=>p.charge), min = Math.min(...ch), max = Math.max(...ch), range = (max-min) || 1, step = (w-2*pad)/(pts.length-1);
  const co = pts.map((p,i)=>[pad+i*step, h-pad-((p.charge-min)/range)*(h-2*pad)]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:100%"><polyline points="${co.map(c=>c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ')}" style="fill:none; stroke:var(--accent); stroke-width:2;" stroke-linecap="round" stroke-linejoin="round"/>${co.map(c=>`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="2.5" style="fill:var(--accent);"/>`).join('')}</svg>`;
}
async function openClientProgress(clientId, name){
  const tb = document.getElementById('tabBody');
  const back = '<a class="backlink" onclick="renderClientsTab()">← Clients</a>';
  tb.innerHTML = back + '<div class="empty">Chargement…</div>';
  let sessions, rows;
  try{
    const id = encodeURIComponent(clientId);
    sessions = await api(`/rest/v1/sessions?select=id,started_at,completed_at,date_unknown&user_id=eq.${id}&completed_at=not.is.null&order=started_at`);
    rows = [];
    for(let i=0;i<20;i++){
      const part = await api(`/rest/v1/session_logs?select=exercise_id,set_number,charge,reps,duration_seconds,session_id,sessions!inner(started_at),exercises(name)&sessions.user_id=eq.${id}&order=id&limit=1000&offset=${i*1000}`);
      rows = rows.concat(part); if(part.length < 1000) break;
    }
  }catch(e){
    console.error(e);
    tb.innerHTML = back + '<div class="empty">Impossible de charger la progression. Réessaie.</div>';
    return;
  }
  cpSessions = sessions; cpWho = name;
  const head = `${back}<h3 style="font-family:Inter; font-weight:700; font-size:18px; margin:6px 0 4px;">Progression · ${escapeHtml(name)}</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 4px"><button class="btn btn-ghost btn-sm" onclick="cpReportPdf(this)">📄 Rapport PDF</button><select id="cpRepPer" style="background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:6px 10px;font:inherit;font-size:14px"><option value="30">1 mois</option><option value="90">3 mois</option><option value="180">6 mois</option><option value="0" selected>Tout</option></select></div>`;
  if(!sessions.length){ tb.innerHTML = head + '<div class="empty">Aucune séance terminée pour ce client pour l\'instant.</div>'; return; }
  // Fréquence : 8 dernières semaines
  const now = cpWeekKey(new Date()), WEEK = 7*864e5, counts = {};
  sessions.forEach(s => { if(s.date_unknown) return; const k = cpWeekKey(s.started_at); counts[k] = (counts[k]||0)+1; });
  const weeks = []; for(let i=7;i>=0;i--){ const k = new Date(now); k.setDate(k.getDate()-7*i); k.setHours(0,0,0,0); weeks.push({ k:k.getTime(), n: counts[k.getTime()]||0 }); }
  const maxN = Math.max(2, ...weeks.map(w=>w.n));
  const freq = `<div class="card"><h3>Régularité · 8 dernières semaines</h3>
    <div style="display:flex; gap:6px; align-items:flex-end; height:70px; margin:12px 0 6px;">${weeks.map(w=>`<div style="flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%;"><span style="font-size:11px; color:var(--ink-muted);">${w.n||''}</span><div style="width:100%; height:${Math.max(3, w.n/maxN*48)}px; border-radius:4px; background:${w.n>=2?'var(--accent)':(w.n?'var(--ink-muted)':'var(--line)')};"></div></div>`).join('')}</div>
    <p style="font-size:12px; color:var(--ink-muted);">${sessions.length} séance${sessions.length>1?'s':''} au total · objectif : 2 par semaine (barre colorée = atteint)</p></div>`;
  // Volume par séance
  const vol = {}; rows.forEach(r => { if(!r.duration_seconds && r.reps && r.charge) vol[r.session_id] = (vol[r.session_id]||0) + r.reps*r.charge; });
  const volPts = sessions.filter(s => vol[s.id]).slice(-10);
  const tonnage = Math.round(Object.values(vol).reduce((a,b)=>a+b,0));
  const fmtD = d => new Date(d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
  const volDetail = sessions.filter(x => vol[x.id]).slice().reverse().map(x => {
    const by = {}; rows.filter(r => r.session_id === x.id && !r.duration_seconds && r.reps && r.charge).forEach(r => { const n = (r.exercises && r.exercises.name) || 'Exercice'; (by[n] = by[n] || []).push(r.reps + '×' + r.charge + ' kg'); });
    return `<details style="border-top:1px solid var(--line);padding:8px 0"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-size:14px"><span>${fmtD(x.started_at)}</span><b>${Math.round(vol[x.id]).toLocaleString('fr-FR')} kg</b></summary>${Object.entries(by).map(([n,a]) => `<div style="margin:6px 0 0 4px;font-size:13px"><b>${escapeHtml(n)}</b><div style="color:var(--ink-muted)">${a.map(escapeHtml).join(' · ')}</div></div>`).join('')}</details>`;
  }).join('');
  const volCard = `<div class="card"><h3>Volume soulevé</h3><p style="font-size:14px; margin:6px 0;">${tonnage.toLocaleString('fr-FR')} kg au total${volPts.length ? ` · dernière séance : ${Math.round(vol[volPts[volPts.length-1].id]).toLocaleString('fr-FR')} kg` : ''}</p>${cpSpark(volPts.map(s=>({charge:vol[s.id]})))}<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;color:var(--accent);font-weight:600">Voir le détail des séances</summary><div style="margin-top:8px">${volDetail}</div></details></div>`;
  // Charges par exercice
  const byEx = {};
  rows.forEach(r => {
    if(r.charge == null || !r.sessions || !r.sessions.started_at) return;
    const e = byEx[r.exercise_id] = byEx[r.exercise_id] || { name:(r.exercises && r.exercises.name) || 'Exercice', by:{} };
    const c = e.by[r.session_id]; if(!c || r.charge > c.charge) e.by[r.session_id] = { date:r.sessions.started_at, charge:r.charge };
  });
  cpRows = rows; cpOpen = false; cpSelId = null;
  cpAll = Object.entries(byEx).map(([id,e]) => ({ id, name:e.name, pts:Object.values(e.by).sort((a,b)=>new Date(a.date)-new Date(b.date)) })).filter(e=>e.pts.length).sort((a,b)=>b.pts.length-a.pts.length).map(e => {
    const f = e.pts[0].charge, l = e.pts[e.pts.length-1].charge, best = Math.max(...e.pts.map(p=>p.charge)), d = Math.round((l-f)*10)/10;
    const dTxt = e.pts.length < 2 ? '1 séance notée' : (d>0 ? `<span style="color:var(--accent); font-weight:700;">+${d} kg</span> depuis la première séance` : (d<0 ? `${d} kg depuis la première séance` : 'Charge stable'));
    e.ex = exercisesById[e.id] || {}; e.gain = f > 0 ? (l - f) / f : 0; e.th = pickImgTag(e.ex);
    e.html = `<div class="card" style="display:flex;gap:12px;align-items:flex-start">__TH__<div style="min-width:0;flex:1"><h3>${escapeHtml(e.name)}</h3><p style="font-size:13.5px; margin:4px 0 8px;">${dTxt}</p>${cpSpark(e.pts)}<p style="margin-top:8px; color:var(--ink-muted); font-size:12px;">Dernière : ${l} kg · Record : ${best} kg · ${e.pts.length} séance${e.pts.length>1?'s':''}</p></div></div>`;
    return e;
  });
  const filt = cpAll.length > 4 ? `<div style="display:flex;gap:8px;margin:14px 0 10px;flex-wrap:wrap"><input id="cpQ" type="text" placeholder="🔍 Rechercher…" onfocus="cpOpen=true;cpRender()" oninput="cpOpen=true;cpSelId=null;cpRender()" style="flex:2 1 160px;min-width:0;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:11px;font:inherit;font-size:16px"><select id="cpSel" onchange="cpOpen=true;cpSelId=null;cpRender()" style="flex:1 1 150px;min-width:0;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:11px;font:inherit;font-size:16px">${muscleSelectHtml(cpAll.map(e=>e.ex))}</select></div>` : '';
  tb.innerHTML = head + freq + volCard + filt + '<div id="cpList"></div>';
  cpRender();
}
function muscleSelectHtml(list){
  const byG = {};
  GROUPS.forEach(g => { const c = {}; let n = 0; list.forEach(e => { if(pickMatchesGroup(e, g)){ n++; pickMuscleLabels(e, g).forEach(l => c[l] = (c[l]||0)+1); } }); if(n) byG[g] = { n, c }; });
  return '<option value="">Tous les muscles</option>' + Object.keys(byG).map(g => {
    let ms = Object.keys(byG[g].c).sort((a,b)=>byG[g].c[b]-byG[g].c[a]); if(g === 'Pectoraux') ms = PEC_ORDER.filter(m => byG[g].c[m]);
    return `<optgroup label="${g}"><option value="${g}">${g} (tout)</option>${ms.map(m => `<option value="${g}|${m}">${m}</option>`).join('')}</optgroup>`;
  }).join('');
}
function muscleMatch(ex, val){
  if(!val) return true; const [g, m] = val.split('|');
  return pickMatchesGroup(ex, g) && (!m || pickMuscleLabels(ex, g).includes(m));
}
let cpAll = [];
let cpRows = [], cpSessions = [], cpWho = '';
async function cpReportPdf(btn){
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'Création…';
  const ok = await HSExport.progressReport({ who: cpWho, periodDays: +document.getElementById('cpRepPer').value, sessions: cpSessions, rows: cpRows });
  btn.disabled = false; btn.textContent = old; if(!ok) toast('Export impossible, réessaie');
}
function cpExStats(id){
  const by = {};
  cpRows.filter(r => r.exercise_id === id && r.sessions && r.sessions.started_at).forEach(r => {
    const x = by[r.session_id] = by[r.session_id] || { date: r.sessions.started_at, sets: [], vol: 0, max: 0, rm: 0, reps: 0 };
    x.sets.push(r);
    if(!r.duration_seconds && r.charge != null){
      x.max = Math.max(x.max, r.charge); x.reps = Math.max(x.reps, r.reps||0);
      if(r.reps) { x.vol += r.reps * r.charge; x.rm = Math.max(x.rm, r.charge * (1 + r.reps/30)); }
    }
  });
  const ses = Object.values(by).filter(x => x.max > 0).sort((a,b)=> new Date(a.date) - new Date(b.date));
  let rec = 0, recIdx = -1; ses.forEach((x,i)=>{ if(x.max > rec){ rec = x.max; recIdx = i; } });
  return { ses, rec, recIdx, since: ses.length - 1 - recIdx };
}
function cpDetailHtml(e){
  const st = cpExStats(e.id), ses = st.ses; if(!ses.length) return '';
  const d = x => new Date(x).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
  const recS = ses[st.recIdx];
  const maxReps = ses.reduce((m,x)=> x.reps > m.v ? { v:x.reps, date:x.date } : m, { v:0, date:null });
  const bestRm = ses.reduce((m,x)=> x.rm > m.v ? { v:x.rm, date:x.date } : m, { v:0, date:null });
  const cut = cpPeriod ? Date.now() - cpPeriod*864e5 : 0;
  const inWin = cut ? ses.filter(x => new Date(x.date).getTime() >= cut) : ses;
  const before = cut ? ses.filter(x => new Date(x.date).getTime() < cut) : [];
  const base = before.length ? before[before.length-1] : inWin[0];
  const lastS = ses[ses.length-1];
  const okP = inWin.length && base && base !== lastS;
  const sinceD = okP ? Math.round((lastS.max - base.max) * 10) / 10 : 0;
  const lbl = cpPeriod === 30 ? 'Sur 1 mois' : cpPeriod === 90 ? 'Sur 3 mois' : cpPeriod === 180 ? 'Sur 6 mois' : 'Depuis le début';
  const firstRm = ses[0].rm, lastRm = ses[ses.length-1].rm;
  const rmD = Math.round((lastRm - firstRm) * 10) / 10;
  const per = (cur, fn) => `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0">${[[30,'1 mois'],[90,'3 mois'],[180,'6 mois'],[0,'Tout']].map(([n,l]) => `<button type="button" class="fchip ${cur===n?'active':''}" onclick="${fn}(${n})">${l}</button>`).join('')}</div>`;
  const tile = (l, v, sub) => `<div style="flex:1 1 130px;min-width:0;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface-2)"><div style="font-size:11.5px;opacity:.7">${l}</div><div style="font-weight:700;font-size:17px;margin:2px 0">${v}</div><div style="font-size:12px;opacity:.7">${sub}</div></div>`;
  const stag = st.since >= 3 ? `<div style="border:1px solid var(--accent);border-radius:12px;padding:8px 12px;margin:10px 0;font-size:13px">⚠️ Pas de record depuis ${st.since} séances.</div>` : '';
  const hist = ses.slice().reverse().map(x => `<details style="border-top:1px solid var(--line);padding:8px 0"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-size:14px"><span>${d(x.date)}</span><span style="opacity:.8">${x.max} kg max · ${Math.round(x.vol).toLocaleString('fr-FR')} kg</span></summary><div style="margin:6px 0 0 4px;font-size:13px;color:var(--ink-muted)">${x.sets.slice().sort((a,b)=>(a.set_number||0)-(b.set_number||0)).map(r => r.duration_seconds ? Math.round(r.duration_seconds)+' s' : (r.reps||'?')+'×'+(r.charge==null?'?':r.charge)+' kg').join(' · ')}</div></details>`).join('');
  return `<div class="card"><h3>${escapeHtml(e.name)}</h3>${stag}
    ${per(cpPeriod,'cpSetPeriod')}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
      ${tile('📈 ' + lbl, okP ? (sinceD > 0 ? '+' : '') + sinceD + ' kg' : (ses.length > 1 ? '–' : '1ère séance'), okP ? base.max + ' → ' + lastS.max + ' kg' : (ses.length > 1 ? 'pas assez de séances' : ses[0].max + ' kg'))}
      ${tile('🏅 Record', st.rec + ' kg', d(recS.date))}
      ${tile('💪 1RM estimé', bestRm.v ? Math.round(bestRm.v) + ' kg' : '–', ses.length > 1 && bestRm.v ? (rmD > 0 ? '+' : '') + rmD + ' kg depuis le début' : '')}
      ${tile('🔁 Max reps', maxReps.v || '–', maxReps.date ? d(maxReps.date) : '')}
    </div>
    <div style="font-size:12.5px;opacity:.75">Charge max · ${d(ses[0].date)} → ${d(ses[ses.length-1].date)}</div>
    ${cpSpark(ses.map(x => ({ charge: x.max })))}
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;color:var(--accent);font-weight:600">Historique des séances</summary>${hist}</details></div>`;
}
function cpStagnant(){
  return cpAll.map(e => ({ e, st: cpExStats(e.id) })).filter(x => x.st.ses.length >= 4 && x.st.since >= 3).sort((a,b)=> b.st.since - a.st.since).slice(0,3);
}
let cpOpen = false, cpSelId = null, cpPeriod = 0;
function cpSetPeriod(n){ cpPeriod = n; cpRender(); }
function cpPick(id){ cpSelId = id; cpOpen = false; cpRender(); }
function cpReset(){ cpSelId = null; cpOpen = false; const q = document.getElementById('cpQ'), se = document.getElementById('cpSel'); if(q) q.value = ''; if(se) se.value = ''; cpRender(); }
function cpRender(){
  const list = document.getElementById('cpList'); if(!list) return;
  const qi = document.getElementById('cpQ'), se = document.getElementById('cpSel');
  const q = qi ? qi.value.trim().fold() : '', v = se ? se.value : '';
  const card = e => e.html.replace('__TH__', '');
  if(cpOpen){
    const out = cpAll.filter(e => muscleMatch(e.ex, v) && (!q ||
      (e.name||'').fold().includes(q) || (e.ex.category||'').fold().includes(q)
      || (e.ex.primary_muscles||[]).some(m=>(m||'').fold().includes(q)) || (e.ex.secondary_muscles||[]).some(m=>(m||'').fold().includes(q))));
    list.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 4px"><span style="font-size:12.5px;color:var(--ink-muted)">${out.length} exercice${out.length>1?'s':''} · touche-en un pour voir sa progression</span><a class="backlink" style="margin:0" onclick="cpReset()">✕ Fermer</a></div>`
      + (out.length ? `<div class="pick-ex-grid">${out.map(e => `<button type="button" class="pick-ex-card" onclick="cpPick('${e.id}')">${e.th || '<span class="pick-ex-noimg">'+escapeHtml((e.ex.category)||'')+'</span>'}<span>${escapeHtml(e.name)}</span></button>`).join('')}</div>` : '<div class="empty">Aucun exercice pour ce filtre.</div>');
    return;
  }
  if(cpSelId){
    const e = cpAll.find(x => x.id === cpSelId);
    if(e){ list.innerHTML = `<a class="backlink" onclick="cpReset()">← Retour au top 3</a>` + cpDetailHtml(e); return; }
  }
  const shown = cpAll.slice().sort((a,b)=> b.gain - a.gain || b.pts.length - a.pts.length).slice(0,3);
  const hint = cpAll.length > 3 ? `<p style="font-size:12.5px;color:var(--ink-muted);margin:4px 2px 10px">🏆 Les 3 plus grosses progressions · touche la recherche pour voir les ${cpAll.length-3} autres.</p>` : '';
  const sg = cpStagnant();
  const sgH = sg.length ? `<div class="card"><h3>⚠️ À surveiller</h3>${sg.map(x => `<p style="font-size:13.5px;margin:6px 0"><b>${escapeHtml(x.e.name)}</b> · pas de record depuis ${x.st.since} séances <a style="color:var(--accent);cursor:pointer" onclick="cpPick('${x.e.id}')">voir</a></p>`).join('')}</div>` : '';
  list.innerHTML = sgH + hint + (shown.length ? shown.map(e => `<div style="cursor:pointer" onclick="cpPick('${e.id}')">${card(e)}<div style="font-size:12.5px;color:var(--accent);margin:-6px 4px 12px;text-align:right">Voir le détail ›</div></div>`).join('') : '<div class="empty">Aucune charge notée pour l\'instant.</div>');
}
let bmClient = null;
async function refreshBadgesModal(){ if(bmClient) await openBadgesModal(bmClient.id, bmClient.name); }
async function revokeBadgeAdmin(badgeId){
  if(!bmClient) return;
  const reason = prompt('Pourquoi annuler ce badge ? (visible par le client, tu peux laisser vide)');
  if(reason === null) return;
  try{
    await api('/rest/v1/badge_revocations', { method:'POST', headers:{ Prefer:'return=minimal' }, body: JSON.stringify({ user_id: bmClient.id, badge_id: badgeId, reason: reason.trim() || null }) });
  }catch(e){ console.error(e); toast("Impossible d'annuler le badge"); return; }
  toast('Badge annulé');
  refreshBadgesModal();
}
async function restoreBadgeAdmin(badgeId){
  if(!bmClient) return;
  try{
    await api(`/rest/v1/badge_revocations?user_id=eq.${encodeURIComponent(bmClient.id)}&badge_id=eq.${encodeURIComponent(badgeId)}`, { method:'DELETE', headers:{ Prefer:'return=representation' } });
  }catch(e){ console.error(e); toast('Impossible de rétablir le badge'); return; }
  toast('Badge rétabli');
  refreshBadgesModal();
}
async function openBadgesModal(clientId, name){
  bmClient = { id: clientId, name };
  document.getElementById('exModalTitle').textContent = 'Badges · ' + name;
  const body = document.getElementById('exModalBody');
  body.innerHTML = '<div class="empty">Chargement…</div>';
  document.getElementById('exModalOverlay').classList.add('open');
  const closeBtn = '<div class="row-actions" style="margin-top:14px;"><button class="btn btn-ghost" onclick="closeExerciseModal()">Fermer</button></div>';
  if(typeof HSBadges === 'undefined'){ body.innerHTML = '<div class="empty">Badges indisponibles.</div>' + closeBtn; return; }
  try{
    const data = await HSBadges.load(p => api(p), clientId, undefined, { other: true });
    body.innerHTML = HSBadges.renderFull(HSBadges.compute(data), { coach: true }) + closeBtn;
  }catch(e){
    console.error(e);
    body.innerHTML = '<div class="empty">Impossible de charger les badges. Réessaie.</div>' + closeBtn;
  }
}
async function printClientReport(clientId){
  const row = clientRows.find(r=> r.client.id === clientId);
  if(!row){ toast('Client introuvable'); return; }
  const { client } = row; const progList = row.progs || [];
  const name = client.full_name || client.email || 'Client';
  let exByProg = {};
  if(progList.length){
    try{
      const all = await api(`/rest/v1/program_exercises?select=*,exercises:exercises!program_exercises_exercise_id_fkey(name)&program_id=in.(${progList.map(p=>p.id).join(',')})&order=order_index`);
      all.forEach(it=>{ (exByProg[it.program_id] = exByProg[it.program_id] || []).push(it); });
    }catch(e){}
  }
  // Export en vrai fichier PDF (tableaux) : programmes + TOUTES les séances réalisées, série par série
  if(window.HSExport){
    try{
      toast('Préparation du PDF…');
      const allSessions = await api(`/rest/v1/sessions?select=id,started_at,completed_at,day_label,declared_seconds,source,programs(name)&user_id=eq.${clientId}&order=started_at.desc&limit=2000`);
      let allLogs = [];
      for(let i = 0; i < 40; i++){
        const part = await api(`/rest/v1/session_logs?select=id,session_id,set_number,reps,charge,duration_seconds,completed_at,exercises(name),sessions!inner(user_id)&sessions.user_id=eq.${clientId}&order=id&limit=1000&offset=${i*1000}`);
        allLogs = allLogs.concat(part || []);
        if(!part || part.length < 1000) break;
      }
      const blocks = [{ type:'h', text:'Programmes' }];
      if(!progList.length) blocks.push({ type:'p', text:'Aucun programme assigné.' });
      progList.forEach(p => {
        const items = exByProg[p.id] || [];
        blocks.push({ type:'h', small:true, text:'Programme - ' + p.name });
        if(!items.length){ blocks.push({ type:'p', text:'Programme vide.' }); return; }
        const days = [...new Set(items.map(it => it.day_label || 'Séance 1'))];
        days.forEach(l => {
          if(days.length > 1) blocks.push({ type:'p', text: l });
          blocks.push({ type:'table', head:['Exercice','Séries','Reps','Repos (s)','Remarque'],
            body: items.filter(it => (it.day_label || 'Séance 1') === l).map((it, ix, dayArr) => [
              it.custom_name || it.exercises?.name || 'Exercice', String(it.sets ?? ''), String(it.reps ?? ''), (it.superset_group != null && dayArr[ix+1] && dayArr[ix+1].superset_group === it.superset_group) ? '-' : String(it.rest_seconds ?? ''),
              [it.superset_group != null ? 'Superset' : '', it.variant_exercise_id && exercisesById[it.variant_exercise_id] ? 'Variante : ' + exercisesById[it.variant_exercise_id].name : ''].filter(Boolean).join(' - ')
            ]), align:[null,'right','right','right',null], widths:[170] });
        });
      });
      blocks.push({ type:'h', text:'Séances réalisées' });
      HSExport.sessionBlocks(allSessions, allLogs).forEach(b => blocks.push(b));
      const ok = await HSExport.pdf({ title: name, subtitle: (client.email || '') + ' - Fiche coach HS Coaching - exportée le ' + new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'}),
        filename: HSExport.fileName('client', name), blocks });
      if(ok) return;
    }catch(e){ console.error(e); }
  }
  let sessions = [];
  try{ sessions = await api(`/rest/v1/sessions?select=id,started_at,completed_at&user_id=eq.${clientId}&order=started_at.desc&limit=15`); }catch(e){ sessions = []; }
  let logsBySession = {};
  if(sessions.length){
    try{
      const idList = sessions.map(s=>s.id).join(',');
      const logs = await api(`/rest/v1/session_logs?select=session_id,reps,charge,duration_seconds&session_id=in.(${idList})`);
      logs.forEach(l=>{
        if(l.reps==null || l.charge==null) return;
        logsBySession[l.session_id] = (logsBySession[l.session_id]||0) + (l.duration_seconds ? 0 : l.reps*l.charge);
      });
    }catch(e){}
  }
  const ssShow = (arr, ix) => { const it = arr[ix]; if(!it || it.superset_group == null) return true; const n = arr[ix+1]; return !(n && n.superset_group === it.superset_group); };
  const pexHtml = (it, ix, arr)=> `<div class="pex"><b>${it.superset_group!=null?'[Superset] ':''}${escapeHtml(it.custom_name || it.exercises?.name||'Exercice')}${it.variant_exercise_id && exercisesById[it.variant_exercise_id] ? ' (variante : '+escapeHtml(exercisesById[it.variant_exercise_id].name)+')' : ''}</b><span>${escapeHtml(it.sets||'-')}×${escapeHtml(it.reps||'-')} ${ssShow(arr, ix) ? ' · repos ' + escapeHtml(it.rest_seconds||'-') + 's' + (it.superset_group!=null ? ' après le tour' : '') : ''}</span></div>`;
  const progBlock = p=>{
    const exItems = exByProg[p.id] || [];
    const dayLabels = [...new Set(exItems.map(it=>it.day_label||'Séance 1'))];
    const body = !exItems.length ? '<div class="empty-print">Programme vide.</div>'
      : (dayLabels.length > 1
          ? dayLabels.map(l=>`<div style="font-weight:700;margin:12px 0 4px;">${escapeHtml(l)}</div>` + exItems.filter(it=>(it.day_label||'Séance 1')===l).map(pexHtml).join('')).join('')
          : exItems.map(pexHtml).join(''));
    return `<h2>Programme — ${escapeHtml(p.name)}</h2>${body}`;
  };
  const exRows = progList.length ? progList.map(progBlock).join('') : '<h2>Programme assigné</h2><div class="empty-print">Aucun programme assigné.</div>';
  const sessRows = sessions.length ? sessions.map(s=>{
    const d = new Date(s.started_at);
    let duree = '';
    if(s.completed_at && (new Date(s.completed_at)-d) > 2000){ const min = Math.max(1, Math.round((new Date(s.completed_at)-d)/60000)); duree = ` · ${min} min`; }
    const vol = logsBySession[s.id] ? ` · ${Math.round(logsBySession[s.id]).toLocaleString('fr-FR')} kg soulevés` : '';
    return `<div class="sess-row"><span>${d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</span><span>${duree}${vol}</span></div>`;
  }).join('') : '<div class="empty-print">Aucune séance enregistrée.</div>';
  document.getElementById('printClientArea').innerHTML = `
    <h1>${escapeHtml(name)}</h1>
    <div class="pmeta">${escapeHtml(client.email||'')} · Fiche coach — HS Coaching</div>
    ${exRows}
    <h2>Historique des séances (15 dernières)</h2>
    ${sessRows}
  `;
  window.print();
}
// Le coach peut écrire à un client même si celui-ci n'a jamais envoyé de message :
// on crée la discussion à la volée (ou on réutilise celle qui existe déjà).
async function startConversationWith(clientId, name, btn){
  if(btn){ if(btn.disabled) return; btn.disabled = true; }
  try{
    let rows = await api(`/rest/v1/conversations?select=id&user_id=eq.${clientId}&limit=1`);
    let convId = rows && rows[0] && rows[0].id;
    if(!convId){
      const created = await api('/rest/v1/conversations', { method:'POST', headers:{ Prefer:'return=representation' }, body: JSON.stringify({ user_id: clientId }) });
      convId = Array.isArray(created) ? created[0].id : created.id;
    }
    const row = clientRows.find(r=> r.client.id === clientId);
    if(row) row.convId = convId;
    await goToClientConversation(convId, name);
  }catch(e){
    console.error(e);
    toast("Impossible d'ouvrir la discussion. Réessaie.");
    if(btn) btn.disabled = false;
  }
}
async function goToClientConversation(convId, name){
  currentTab = 'messages'; msgSub = 'conversations'; paint();
  document.getElementById('tabBody').innerHTML = `
    <div id="msgBody"><div class="empty">Chargement…</div></div>
  `;
  await openConversation(convId, name);
}
async function goToProgramForm(programId){
  currentTab = 'programmes'; paint();
  await renderProgramForm(programId);
}
async function goToNewProgramFor(clientId){
  currentTab = 'programmes'; paint();
  await renderProgramForm(null, { name:'', description:'', is_official:false, owner_user_id:clientId, items:[] });
}
