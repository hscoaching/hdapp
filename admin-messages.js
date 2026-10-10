// HS Coaching — espace admin : admin-messages.js (extrait de admin.html, comportement inchangé)
// ================= MESSAGES =================
let msgSub = /[#&]s=(contacts|team)/.test(location.hash) ? location.hash.match(/[#&]s=(contacts|team)/)[1] : 'conversations';
const coachNameById = {};
async function renderMessages(){
  document.getElementById('tabBody').innerHTML = `
    <div id="msgBody"><div class="empty">Chargement…</div></div>
  `;
  loadAll();
}
function paintSub(){ [...document.querySelectorAll('.subtab')].forEach(t=> t.classList.toggle('active', t.dataset.s===msgSub)); }
function loadSub(){ loadAll(); }
async function loadAll(){
  clearInterval(teamTimer); teamTimer = null;
  const b = document.getElementById('msgBody'); if(!b) return;
  b.innerHTML = '<div id="msgReq"></div><div id="msgTeam"></div><div id="msgConv"><div class="empty">Chargement…</div></div>';
  await Promise.all([loadContacts('msgReq'), loadTeam('msgTeam'), loadConversations('msgConv')]);
  const c = document.getElementById('msgConv');
  if(c && !document.getElementById('msgReq').innerHTML && !document.getElementById('msgTeam').innerHTML && !c.querySelector('.card')) c.innerHTML = '<div class="empty">Aucun message pour le moment.</div>';
}
const secT = t => `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin:14px 2px 6px">${t}</div>`;

async function loadConversations(T='msgBody'){
  let convs, profs, unread;
  try{
    convs = await api('/rest/v1/conversations?select=*&order=created_at.desc');
    if(!convs.length){ document.getElementById(T).innerHTML = ''; return; }
    const ids = [...new Set(convs.map(c=>c.user_id))];
    profs = await api(`/rest/v1/profiles?select=id,full_name,email,coach_id&id=in.(${ids.join(',')})`);
    unread = await api(`/rest/v1/messages?select=conversation_id&sender=eq.user&read=eq.false`);
    if(IS_SUPER){ try{ (await api('/rest/v1/coach_profiles?select=user_id,display_name') || []).forEach(cp => coachNameById[cp.user_id] = cp.display_name); }catch(e){} }
  }catch(e){
    console.error(e);
    document.getElementById(T).innerHTML = '<div class="empty">Impossible de charger les discussions. Réessaie.</div>';
    return;
  }
  const profById = Object.fromEntries(profs.map(p=>[p.id,p]));
  const unreadCount = {}; unread.forEach(m=> unreadCount[m.conversation_id] = (unreadCount[m.conversation_id]||0)+1);
  document.getElementById(T).innerHTML = secT('Clients') + convs.filter(c=>c.user_id!==MY_ID).map(c=>{
    const p = profById[c.user_id] || {};
    const other = IS_SUPER && p.coach_id;           // client suivi par un autre coach : lecture seule pour toi
    const n = other ? 0 : unreadCount[c.id];
    const cn = other ? (coachNameById[p.coach_id] || 'un coach') : '';
    return `<div class="card" onclick="openConversation('${c.id}',${jq(p.full_name||p.email||'Client')}, ${other ? 'true' : 'false'}, ${jq(cn)})">
      <h3>${escapeHtml(p.full_name || p.email || 'Client')} ${n?`<span class="badge">${n}</span>`:''}</h3>
      <p>${escapeHtml(p.email||'')}</p>
      ${other ? `<p style="opacity:.75">👁 Suivi par ${escapeHtml(cn)} · lecture seule</p>` : ''}
    </div>`;
  }).join('');
}
async function openConversation(convId, name, ro, coachName){
  document.getElementById('msgBody').innerHTML = `
    <a class="backlink" onclick="loadAll()">← Retour</a>
    <h3 style="font-family:Inter; font-weight:700; margin-bottom:10px;">${escapeHtml(name)}</h3>
    ${ro ? `<div style="padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:10px;font-size:13px">👁 Lecture seule · discussion entre ${escapeHtml(name)} et ${escapeHtml(coachName || 'son coach')}</div>` : ''}
    <div class="chat-box"><div class="chat-msgs" id="cMsgs"><div class="empty">Chargement…</div></div>
      ${ro ? '' : `<div class="chat-input"><input id="cInput" type="text" placeholder="Répondre…" onkeydown="if(event.key==='Enter')sendCoachMsg('${convId}')"><button onclick="sendCoachMsg('${convId}')">Envoyer</button></div>`}</div>
  `;
  if(!ro) await api(`/rest/v1/messages?conversation_id=eq.${convId}&sender=eq.user&read=eq.false`, { method:'PATCH', body: JSON.stringify({ read:true }) });
  const msgs = await api(`/rest/v1/messages?select=*&conversation_id=eq.${convId}&order=created_at`);
  document.getElementById('cMsgs').innerHTML = msgs.map(m=>`<div class="msg ${m.sender}">${escapeHtml(m.content)}</div>`).join('') || '<div class="empty">Pas encore de message.</div>';
  document.getElementById('cMsgs').scrollTop = 999999;
}
async function sendCoachMsg(convId){
  const input = document.getElementById('cInput'); const content = input.value.trim();
  if(!content) return; input.value='';
  const box = document.getElementById('cMsgs');
  const tmp = document.createElement('div');
  tmp.className = 'msg coach'; tmp.textContent = content;
  box.appendChild(tmp);
  box.scrollTop = 999999;
  try{
    await api('/rest/v1/messages', { method:'POST', body: JSON.stringify({ conversation_id: convId, sender:'coach', content }) });
    const msgs = await api(`/rest/v1/messages?select=*&conversation_id=eq.${convId}&order=created_at`);
    box.innerHTML = msgs.map(m=>`<div class="msg ${m.sender}">${escapeHtml(m.content)}</div>`).join('');
    box.scrollTop = 999999;
  }catch(e){
    tmp.style.opacity = '0.5';
    tmp.title = 'Échec de l\'envoi — réessaie.';
    input.value = content;
    alert("Le message n'a pas pu être envoyé. Réessaie.\n(" + (e && (e.status||'') + ' ' + String(e && (e.detail||e.message)||'').slice(0,160)) + ")");
  }
}

// ================= ÉQUIPE (coachs + admin) =================
let teamTimer = null;
async function refreshTeamUnread(){
  try{
    const u = await api(`/rest/v1/team_messages?select=id&to_id=eq.${MY_ID}&read=eq.false`);
    const b = document.getElementById('teamUnread'); if(!b) return;
    b.textContent = u.length; b.style.display = u.length ? '' : 'none';
  }catch(e){}
}
async function loadTeam(T='msgBody'){
  clearInterval(teamTimer); teamTimer = null;
  const box = document.getElementById(T); if(!box) return;
  let members, unread;
  try{
    members = await api('/rest/v1/rpc/team_members', { method:'POST', body:'{}' });
    unread = await api(`/rest/v1/team_messages?select=from_id&to_id=eq.${MY_ID}&read=eq.false`);
  }catch(e){
    console.error(e);
    box.innerHTML = '<div class="empty">Messagerie d\'équipe indisponible pour le moment. Réessaie.</div>';
    return;
  }
  const un = {}; unread.forEach(m => un[m.from_id] = (un[m.from_id]||0) + 1);
  box.innerHTML = (members && members.length) ? secT('Équipe') + members.map(m => `<div class="card" onclick="openTeamChat('${m.id}',${jq(m.name || 'Collègue')})">
      <h3>${m.role === 'admin' ? '👑' : '🏋️'} ${escapeHtml(m.name || 'Collègue')} ${un[m.id] ? `<span class="badge">${un[m.id]}</span>` : ''}</h3>
      <p>${m.role === 'admin' ? 'Admin' : 'Coach'}</p></div>`).join('')
    : '';
}
async function teamChatPaint(otherId, scroll){
  const box = document.getElementById('tMsgs'); if(!box) return;
  const q = `/rest/v1/team_messages?select=id,from_id,content,created_at&or=(and(from_id.eq.${MY_ID},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${MY_ID}))&order=created_at`;
  const msgs = await api(q);
  const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = msgs.map(m => `<div class="msg ${m.from_id === MY_ID ? 'coach' : 'user'}">${escapeHtml(m.content)}</div>`).join('') || '<div class="empty">Pas encore de message. Écris le premier !</div>';
  if(scroll || atEnd) box.scrollTop = 999999;
  api(`/rest/v1/team_messages?to_id=eq.${MY_ID}&from_id=eq.${otherId}&read=eq.false`, { method:'PATCH', body: JSON.stringify({ read:true }) }).then(refreshTeamUnread).catch(()=>{});
}
async function openTeamChat(otherId, name){
  clearInterval(teamTimer);
  document.getElementById('msgBody').innerHTML = `
    <a class="backlink" onclick="loadAll()">← Retour</a>
    <h3 style="font-family:Inter; font-weight:700; margin-bottom:10px;">${escapeHtml(name)}</h3>
    <div class="chat-box"><div class="chat-msgs" id="tMsgs"><div class="empty">Chargement…</div></div>
      <div class="chat-input"><input id="tInput" type="text" maxlength="2000" placeholder="Écrire à ${escapeHtml(name)}…" onkeydown="if(event.key==='Enter')sendTeamMsg('${otherId}')"><button onclick="sendTeamMsg('${otherId}')">Envoyer</button></div></div>`;
  try{ await teamChatPaint(otherId, true); }catch(e){ document.getElementById('tMsgs').innerHTML = '<div class="empty">Impossible de charger la discussion.</div>'; }
  teamTimer = setInterval(() => { if(!document.getElementById('tMsgs')){ clearInterval(teamTimer); teamTimer = null; return; } if(!document.hidden) teamChatPaint(otherId, false).catch(()=>{}); }, 8000);
}
async function sendTeamMsg(otherId){
  const input = document.getElementById('tInput'); const content = input.value.trim();
  if(!content) return; input.value = '';
  try{
    await api('/rest/v1/team_messages', { method:'POST', body: JSON.stringify({ from_id: MY_ID, to_id: otherId, content }) });
    await teamChatPaint(otherId, true);
  }catch(e){
    console.error(e); input.value = content;
    alert("Le message n'a pas pu être envoyé. Réessaie.\n(" + (e && (e.status||'') + ' ' + String(e && (e.detail||e.message)||'').slice(0,160)) + ")");
  }
}
async function loadContacts(T='msgBody'){
  let reqs, names = {};
  try{
    reqs = await api('/rest/v1/coach_contact_requests?select=*&order=created_at.desc');
    try{ (await api('/rest/v1/coach_profiles?select=user_id,display_name') || []).forEach(cp => names[cp.user_id] = cp.display_name); }catch(e){}
  }catch(e){
    console.error(e);
    document.getElementById(T).innerHTML = '<div class="empty">Impossible de charger les demandes. Réessaie.</div>';
    return;
  }
  reqs = reqs.filter(r=>r.status !== 'handled');
  document.getElementById(T).innerHTML = reqs.length ? secT('Demandes de contact') + reqs.map(r=>{
    const pending = true;
    const follow = pending && r.user_id && r.coach_id;
    return `<div class="card" style="cursor:default">
      <div class="tag">${escapeHtml(r.status === 'handled' ? 'traitée' : 'nouvelle')}</div>
      <h3>${escapeHtml(r.name)}${r.user_id ? ' <span style="font-size:12px;opacity:.7">· a un compte</span>' : ''}</h3>
      <p>${escapeHtml(r.email||r.phone||'')} ${r.message?'— '+escapeHtml(r.message):''}</p>
      ${IS_SUPER ? `<p style="opacity:.75">Pour : ${r.coach_id ? escapeHtml(names[r.coach_id] || 'un coach') : 'le premier coach disponible'}</p>` : ''}
      ${pending ? `<div class="row-actions" style="margin-top:8px">
        ${follow ? `<button class="btn btn-accent btn-sm" onclick="acceptContact('${r.id}')">✅ Accepter et suivre ce client</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="markContact('${r.id}')">Marquer traitée</button></div>` : ''}
    </div>`;
  }).join('') : '';
}
async function markContact(id){
  await api(`/rest/v1/coach_contact_requests?id=eq.${id}`, { method:'PATCH', body: JSON.stringify({ status:'handled' }) });
  toast('Marquée comme traitée'); loadAll();
}
async function acceptContact(id){
  try{
    const r = await api('/rest/v1/rpc/accept_contact_request', { method:'POST', body: JSON.stringify({ p_id: id }) });
    toast(r === 'assigned' ? 'Client ajouté à ta liste' : 'Demande traitée'); loadAll();
  }catch(e){ toast('Impossible : ce client est peut-être déjà suivi par un autre coach'); }
}
// ---- Ma fiche coach (présentation visible par les clients dans la liste des coachs) ----
async function openMyCoachCard(targetId, targetName){
  const tid = (typeof targetId === 'string' && targetId) ? targetId : MY_ID;
  const mine = tid === MY_ID;
  let cp = {};
  try{ cp = ((await api(`/rest/v1/coach_profiles?select=*&user_id=eq.${tid}`)) || [])[0] || {}; }catch(e){}
  const old = document.getElementById('myCoachOv'); if(old) old.remove();
  const ov = document.createElement('div'); ov.id = 'myCoachOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1300;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
  ov.onclick = e => { if(e.target === ov) ov.remove(); };
  const inpS = 'width:100%;box-sizing:border-box;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:12px;font:inherit;font-size:16px';
  const f = (id, label, val, ph, area) => `<label style="display:block;margin:12px 0 4px;font-size:13px;opacity:.8">${label}</label>` + (area
    ? `<textarea id="${id}" placeholder="${ph}" style="${inpS};min-height:110px">${escapeHtml(val || '')}</textarea>`
    : `<input id="${id}" type="text" placeholder="${ph}" value="${escapeHtml(val || '')}" style="${inpS}">`);
  ov.innerHTML = `<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:20px 18px;margin:auto">
    <h2 style="margin:0 0 4px">🪪 ${mine ? 'Ma fiche coach' : 'Fiche de ' + escapeHtml(targetName || 'ce coach')}</h2>
    <div style="font-size:13px;opacity:.7">C'est ce que verront les clients et visiteurs quand ils choisiront un coach.</div>
    <div id="mcPrev" style="border:1px solid var(--line);border-radius:16px;padding:14px;margin:14px 0 4px;background:var(--surface-2)"></div>
    ${f('mcName','Nom affiché', cp.display_name || (mine ? '' : targetName), 'Prénom ou nom de coach')}
    ${f('mcHead','Accroche (une ligne)', cp.headline, 'Ex. Coach prise de masse & force')}
    ${f('mcBio','Présentation', cp.bio, 'Parcours, méthode, pour qui il/elle est fait…', true)}
    ${f('mcSpec','Spécialités (séparées par des virgules)', cp.specialties, 'Musculation, Perte de poids, Cardio')}
    <label style="display:block;margin:12px 0 4px;font-size:13px;opacity:.8">Photo</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="mcPick" type="button">📷 Choisir une photo</button><button class="btn btn-ghost btn-sm" id="mcNoPhoto" type="button">Retirer la photo</button></div>
    <input type="hidden" id="mcPhoto" value="${escapeHtml(cp.photo_url || '')}">
    <label style="display:flex;gap:10px;align-items:center;margin:16px 0 4px;font-size:15px"><input type="checkbox" id="mcListed" ${cp.listed ? 'checked' : ''} style="width:20px;height:20px"> Afficher la fiche dans la liste des coachs</label>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-accent" style="flex:1;justify-content:center" id="mcSave">Enregistrer</button><button class="btn btn-ghost" id="mcClose">Fermer</button></div></div>`;
  document.body.appendChild(ov);
  const g = id => ov.querySelector('#' + id);
  const prev = () => {
    const nm = g('mcName').value.trim() || 'Nom du coach', ph = g('mcPhoto').value, ini = escapeHtml(nm.charAt(0).toUpperCase());
    const tags = g('mcSpec').value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 8).map(x => `<span style="font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--line)">${escapeHtml(x)}</span>`).join('');
    g('mcPrev').innerHTML = `<div style="display:flex;gap:12px;align-items:center">${ph ? `<img src="${escapeHtml(ph)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex:none">` : `<div style="width:56px;height:56px;border-radius:50%;flex:none;background:var(--accent);color:var(--accent-ink,#111);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px">${ini}</div>`}
      <div style="min-width:0"><div style="font-weight:800;font-size:17px">${escapeHtml(nm)}</div><div style="font-size:13px;opacity:.75">${escapeHtml(g('mcHead').value)}</div></div></div>
      ${g('mcBio').value.trim() ? `<div style="font-size:14px;line-height:1.45;margin:10px 0;white-space:pre-line">${escapeHtml(g('mcBio').value)}</div>` : ''}<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${tags}</div>`;
  };
  ['mcName','mcHead','mcBio','mcSpec'].forEach(id => g(id).addEventListener('input', prev)); prev();
  g('mcClose').onclick = () => ov.remove();
  g('mcNoPhoto').onclick = () => { g('mcPhoto').value = ''; prev(); };
  g('mcPick').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = async () => {
      const file = inp.files && inp.files[0]; inp.remove(); if(!file) return;
      try{
        toast('Envoi de la photo…');
        const bmp = await createImageBitmap(file), side = Math.min(bmp.width, bmp.height), SZ = 600;
        const cv = document.createElement('canvas'); cv.width = cv.height = SZ;
        cv.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SZ, SZ);
        const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
        const path = `${tid}/photo-${Date.now()}.jpg`;
        await refreshIfNeeded(); const s = getSession();
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/coach-photos/${path}`, { method:'POST', headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${s?.access_token}`, 'Content-Type':'image/jpeg' }, body: blob });
        if(!res.ok) throw new Error('upload');
        g('mcPhoto').value = `${SUPABASE_URL}/storage/v1/object/public/coach-photos/${path}`; prev(); toast('Photo ajoutée (pense à enregistrer)');
      }catch(e){ console.error(e); toast('Photo impossible, essaie une autre image'); }
    };
    inp.click();
  };
  g('mcSave').onclick = async () => {
    const v = id => g(id).value.trim();
    if(!v('mcName')){ toast('Le nom est requis'); return; }
    const row = { user_id: tid, display_name: v('mcName'), headline: v('mcHead') || null, bio: v('mcBio') || null, specialties: v('mcSpec') || null, photo_url: v('mcPhoto') || null, listed: g('mcListed').checked, updated_at: new Date().toISOString() };
    try{
      await api('/rest/v1/coach_profiles?on_conflict=user_id', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
      toast(row.listed ? 'Fiche enregistrée et visible' : 'Fiche enregistrée (masquée)'); ov.remove();
    }catch(e){ toast('Erreur, vérifie les champs (accroche 120 car., présentation 1200 car.)'); }
  };
}
