// HS Coaching — espace admin : admin-programmes.js (extrait de admin.html, comportement inchangé)
// ================= PROGRAMMES =================
let progsAll = [], progProfById = {}, progFilter = 'all';
// Origine d'un programme : official | coach | client | visitor | unknown
function progOrigin(p){
  if(p.is_official) return 'official';
  if(p.owner_guest_id && !p.owner_user_id) return 'visitor';
  if(!p.owner_user_id) return 'visitor';
  if(p.owner_user_id === MY_ID) return 'draft';
  if(!p.created_by) return 'unknown';
  if(p.created_by === p.owner_user_id) return 'client';
  return 'coach';
}
function progOwnerName(p){
  const pr = progProfById[p.owner_user_id];
  return pr ? (pr.full_name || pr.email || 'Client') : 'Client';
}
function progOriginHtml(p){
  const o = progOrigin(p);
  const pill = (cls, txt) => `<span class="origin-pill ${cls}">${txt}</span>`;
  if(o === 'official') return pill('official', '⭐ Programme officiel') + '<span class="origin-for">visible par tous les visiteurs</span>';
  if(o === 'visitor') return pill('visitor', '👻 Créé par un visiteur');
  if(o === 'draft') return pill('coach', '📝 À affecter') + '<span class="origin-for">visible par toi seul, à donner à un client plus tard</span>';
  const O = escapeHtml(progOwnerName(p));
  if(o === 'client') return pill('client', `👤 Créé par ${O}`);
  if(o === 'coach') return pill('coach', '🧑‍🏫 Créé par toi') + `<span class="origin-for">pour ${O}</span>`;
  return pill('unknown', '❔ Créateur inconnu') + `<span class="origin-for">programme de ${O}</span>`;
}
function setProgFilter(f){ progFilter = f; paintProgList(); }
function paintProgList(){
  const counts = { all: progsAll.length };
  progsAll.forEach(p => { const o = progOrigin(p); counts[o] = (counts[o]||0) + 1; });
  const chips = [['all','Tous'],['official','Officiels'],['draft','À affecter'],['coach','Créés par moi'],['client','Clients'],['visitor','Visiteurs'],['unknown','Inconnus']]
    .filter(([k]) => k === 'all' || counts[k])
    .map(([k,l]) => `<button type="button" class="fchip ${progFilter===k?'active':''}" onclick="setProgFilter('${k}')">${l} <span>${counts[k]||0}</span></button>`).join('');
  const list = progFilter === 'all' ? progsAll : progsAll.filter(p => progOrigin(p) === progFilter);
  document.getElementById('progList').innerHTML = `<div class="fchips">${chips}</div>` + (list.length ? list.map(p=>`
    <div class="card">
      <div onclick="renderProgramForm('${p.id}')" style="cursor:pointer;">
        <div class="origin-row">${progOriginHtml(p)}</div>
        <h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'')}</p>
      </div>
      <div class="row-actions" style="margin-top:10px;">
        <button class="btn btn-ghost btn-sm" onclick="duplicateProgram('${p.id}')">Dupliquer</button>
      </div>
    </div>`).join('') : '<div class="empty">Aucun programme dans cette catégorie.</div>');
}
async function renderProgramsTab(){
  document.getElementById('tabBody').innerHTML = `
    <div class="row-actions"><button class="btn btn-accent" onclick="renderProgramForm()">+ Nouveau programme</button></div>
    <div id="progList" style="margin-top:16px;"><div class="empty">Chargement…</div></div>
  `;
  try{
    progsAll = (await api('/rest/v1/programs?select=*&order=is_official.desc,created_at.desc')).filter(p => !p.archived_for);
    progProfById = {};
    const ids = [...new Set(progsAll.flatMap(p=>[p.owner_user_id, p.created_by]).filter(Boolean))];
    if(ids.length){
      const profs = await api(`/rest/v1/profiles?select=id,full_name,email,role&id=in.(${ids.join(',')})`);
      progProfById = Object.fromEntries(profs.map(p=>[p.id,p]));
    }
  }catch(e){
    console.error(e);
    document.getElementById('progList').innerHTML = '<div class="empty">Impossible de charger les programmes. Réessaie.</div>';
    return;
  }
  progFilter = 'all';
  paintProgList();
}

const GROUPS = ["Jambes","Dos","Pectoraux","Épaules","Bras","Abdos"];
const MUSCLE_GROUP_OF = {
  "Quadriceps":"Jambes","Ischio-jambiers":"Jambes","Fessiers":"Jambes","Moyen fessier":"Jambes",
  "Mollets (gastrocnémien)":"Jambes","Soléaire":"Jambes","Adducteurs":"Jambes","Abducteurs":"Jambes",
  "Fléchisseurs de hanche":"Jambes",
  "Grand dorsal":"Dos","Rhomboïdes":"Dos","Trapèzes":"Dos","Érecteurs du rachis":"Dos","Lombaires":"Dos",
  "Pectoraux":"Pectoraux",
  "Deltoïde antérieur":"Épaules","Deltoïde latéral":"Épaules","Deltoïde postérieur":"Épaules",
  "Coiffe des rotateurs":"Épaules","Dentelé antérieur":"Épaules",
  "Biceps":"Bras","Triceps":"Bras","Brachial":"Bras","Brachioradial":"Bras",
  "Avant-bras":"Bras","Avant-bras (fléchisseurs)":"Bras","Avant-bras (extenseurs)":"Bras",
  "Abdominaux":"Abdos","Obliques":"Abdos","Transverse":"Abdos"
};

// Libellés simplifiés pour le grand public dans les sous-filtres.
// null = muscle trop technique, on ne lui donne pas de sous-filtre dédié
// (l'exercice reste visible via "Tous").
const MUSCLE_PUBLIC_LABEL = {
  "Quadriceps":"Quadriceps",
  "Ischio-jambiers":"Ischios",
  "Fessiers":"Fessiers",
  "Moyen fessier":"Fessiers",
  "Mollets (gastrocnémien)":"Mollets",
  "Soléaire":"Mollets",
  "Adducteurs":"Intérieur de cuisse",
  "Abducteurs":"Extérieur de hanche",
  "Fléchisseurs de hanche":"Hanches",
  "Grand dorsal":"Dorsaux",
  "Rhomboïdes":"Haut du dos",
  "Trapèzes":"Trapèzes",
  "Érecteurs du rachis":"Lombaires",
  "Lombaires":"Lombaires",
  "Deltoïde antérieur":"Épaule avant",
  "Deltoïde latéral":"Épaule latérale",
  "Deltoïde postérieur":"Épaule arrière",
  "Coiffe des rotateurs":null,
  "Dentelé antérieur":null,
  "Biceps":"Biceps",
  "Triceps":"Triceps",
  "Brachial":"Biceps",
  "Brachioradial":"Avant-bras",
  "Avant-bras":"Avant-bras",
  "Avant-bras (fléchisseurs)":"Avant-bras",
  "Avant-bras (extenseurs)":"Avant-bras",
  "Abdominaux":"Abdominaux",
  "Obliques":"Obliques",
  "Transverse":"Abdominaux"
};
const PEC_ORDER = ["Bas des pectoraux","Milieu des pectoraux","Haut des pectoraux"];

let pickGroup = 'Tous', pickMuscle = null;
function pickMatchesGroup(ex, group){ return group === 'Tous' || (ex.primary_muscles||[]).some(m => MUSCLE_GROUP_OF[m] === group); }
function pickPecRegion(ex){
  const n = (ex.name||'').toLowerCase();
  if(n.includes('incliné') || n.includes('incline')) return 'Haut des pectoraux';
  if(n.includes('décliné') || n.includes('decline')) return 'Bas des pectoraux';
  return 'Milieu des pectoraux';
}
function pickMuscleLabels(ex, group){
  if(group === 'Pectoraux') return pickMatchesGroup(ex, 'Pectoraux') ? [pickPecRegion(ex)] : [];
  const labels = new Set();
  (ex.primary_muscles||[]).forEach(m=>{ if(MUSCLE_GROUP_OF[m] === group){ const l = MUSCLE_PUBLIC_LABEL[m]; if(l) labels.add(l); } });
  return [...labels];
}
function setPickGroup(g){ pickGroup = g; pickMuscle = null; renderPickChips(); filterExPicker(); }
function setPickMuscle(m){ pickMuscle = (m === '' ? null : m); renderPickChips(); filterExPicker(); }
function renderPickChips(){
  const box = document.getElementById('pfChips'), sub = document.getElementById('pfSubchips');
  if(!box || !sub) return;
  box.innerHTML = ['Tous', ...GROUPS].map(g => `<button type="button" class="fchip ${g===pickGroup?'active':''}" data-g="${g}" onclick="setPickGroup(this.dataset.g)">${g}</button>`).join('');
  if(pickGroup === 'Tous'){ sub.innerHTML = ''; sub.style.display = 'none'; return; }
  const counts = {};
  exercises.filter(ex => pickMatchesGroup(ex, pickGroup)).forEach(ex => pickMuscleLabels(ex, pickGroup).forEach(l => counts[l] = (counts[l]||0) + 1));
  let ms = Object.keys(counts).sort((a,b)=> counts[b]-counts[a]);
  if(pickGroup === 'Pectoraux') ms = PEC_ORDER.filter(m => counts[m]);
  if(!ms.length){ sub.innerHTML = ''; sub.style.display = 'none'; return; }
  sub.style.display = '';
  sub.innerHTML = ['Tous', ...ms].map(m => `<button type="button" class="fchip ${(m==='Tous' ? pickMuscle===null : pickMuscle===m)?'active':''}" data-m="${m==='Tous'?'':m}" onclick="setPickMuscle(this.dataset.m)">${m}</button>`).join('');
}

let draftItems = [];
let draftDays = ['Séance 1'];
let activeDayIdx = 0;

async function renderProgramForm(programId, prefill){
  let program = null;
  draftItems = [];
  pickGroup = 'Tous'; pickMuscle = null;
  if(programId){
    program = (await api(`/rest/v1/programs?select=*&id=eq.${programId}`))[0];
    const items = await api(`/rest/v1/program_exercises?select=*&program_id=eq.${programId}&order=order_index`);
    draftItems = items.map((it,i)=>({ exercise_id: it.exercise_id, sets: it.sets, reps: it.reps, rest_seconds: it.rest_seconds, day: it.day_label || 'Séance 1',
      linkPrev: i > 0 && it.superset_group != null && items[i-1].superset_group === it.superset_group && (items[i-1].day_label||'Séance 1') === (it.day_label||'Séance 1'),
      variant_id: it.variant_exercise_id || null, label: it.custom_name || '' }));
  } else if(prefill){
    program = { name: prefill.name, description: prefill.description, is_official: prefill.is_official, owner_user_id: prefill.owner_user_id };
    draftItems = prefill.items.map(it=>({ linkPrev:false, variant_id:null, ...it, day: it.day || 'Séance 1'}));
  }
  draftDays = [...new Set(draftItems.map(x=>x.day))];
  if(!draftDays.length) draftDays = ['Séance 1'];
  activeDayIdx = 0;
  const clients = await api('/rest/v1/profiles?select=id,full_name,email,role&' + (IS_SUPER ? `role=in.(client,coach)&id=neq.${MY_ID}` : 'role=eq.client') + '&order=full_name');
  const isDraft = !!(program && !program.is_official && program.owner_user_id === MY_ID);
  const isClientTarget = !!(program && !program.is_official && !isDraft);
  const clientOptions = '<option value="">— Choisir un client —</option>' + clients.map(c=>`<option value="${c.id}" ${program?.owner_user_id===c.id?'selected':''}>${escapeHtml(c.full_name||c.email||'')}${c.role==='coach'?' (coach)':''}</option>`).join('');
  document.getElementById('tabBody').innerHTML = `
    <a class="backlink" onclick="renderProgramsTab()">← Tous les programmes</a>
    <div class="panel">
      <div class="field"><label>Nom du programme</label><input id="pfName" value="${escapeHtml(program?.name||'')}"></div>
      <div class="field"><label>Description</label><textarea id="pfDesc">${escapeHtml(program?.description||'')}</textarea></div>
      <div class="field"><label>Destinataire</label>
        <select id="pfTarget">
          <option value="official" ${program?.is_official!==false?'selected':''}>Officiel — visible par tous les visiteurs</option>
          <option value="later" ${isDraft?'selected':''}>Aucun pour l'instant — à affecter plus tard</option>
          <option value="client" ${isClientTarget?'selected':''}>Un client en particulier</option>
        </select>
      </div>
      <div class="field" id="pfClientWrap" style="${isClientTarget ? '' : 'display:none;'}">
        <label>Client</label><select id="pfClient">${clientOptions}</select>
      </div>
      <div class="row-actions">
        <button class="btn btn-accent" id="pfSaveBtn" onclick="saveProgramForm('${programId||''}')">${programId?'Enregistrer':'Créer le programme'}</button>
        ${programId ? `<button class="btn btn-danger" onclick="deleteProgramForm('${programId}')">Supprimer le programme</button>` : ''}
      </div>
    </div>
    <div class="panel">
      <h3 style="font-family:Inter; font-weight:700; font-size:15px; margin-bottom:4px;">Séances</h3>
      <p class="empty" style="padding:0 0 4px; text-align:left;">Un programme peut contenir plusieurs séances : la personne choisit celle qu'elle veut faire.</p>
      <div id="pfDayTabs" class="day-tabs"></div>
      <div class="row-actions" style="margin-bottom:12px;">
        <button class="btn btn-ghost btn-sm" type="button" onclick="renameDay()">✏️ Renommer</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="deleteDay()">🗑 Supprimer cette séance</button>
      </div>
      <h3 id="pfDayTitle" style="font-family:Inter; font-weight:700; font-size:15px; margin-bottom:8px;">Exercices</h3>
      <div id="pfExList"></div>
      <div class="fchips" id="pfChips" style="margin-bottom:8px;"></div>
      <div class="fchips" id="pfSubchips" style="margin-bottom:8px;display:none;"></div>
      <div class="field"><label>Chercher un exercice</label><input id="pfSearch" type="text" placeholder="Nom, catégorie, muscle…" oninput="filterExPicker()"></div>
      <input type="hidden" id="pfPickEx" value="">
      <div id="pfPickGrid" class="pick-ex-grid"></div>
      <div class="picker" style="flex-wrap:wrap;">
        <button class="btn btn-ghost" type="button" onclick="newExerciseFromBuilder()" title="Créer une nouvelle fiche exercice sans quitter le programme">➕ Nouvelle fiche</button>
        <button class="btn btn-ghost" type="button" onclick="editSelectedPickerEx()" title="Modifier la fiche de l'exercice sélectionné">✏️ Modifier la fiche</button>
        <div class="pf-field"><label for="pfSets">Séries</label><input id="pfSets" type="number" inputmode="numeric" min="1" placeholder="Séries" value="3" style="width:70px;"></div>
        <div class="pf-field"><label for="pfReps">Reps ou durée</label><input id="pfReps" type="text" placeholder="10 · 8-12 · 45s · 2 min" value="10" style="width:170px;"></div>
        <div class="pf-field"><label for="pfRest">Repos (min)</label><input id="pfRest" type="text" inputmode="decimal" placeholder="1:30" value="1:30" style="width:90px;"></div>
        <button class="btn btn-ghost" onclick="addDraftEx()">Ajouter à cette séance</button>
        <div style="flex-basis:100%;font-size:11.5px;color:var(--ink-muted);">Reps : <b>10</b> ou <b>8-12</b> · Durée : <b>45s</b>, <b>1:30</b>, <b>2 min</b>, <b>20-25 min</b> · Repos en minutes : <b>1:30</b>, <b>1,5</b>, <b>2</b> (ou <b>45s</b>)</div>
      </div>
      <p class="empty" style="padding-top:10px;">Rien n'est enregistré tant que tu n'as pas cliqué sur "${programId?'Enregistrer':'Créer le programme'}" en haut.</p>
    </div>
  `;
  document.getElementById('pfTarget').addEventListener('change', e=>{
    document.getElementById('pfClientWrap').style.display = e.target.value==='client' ? '' : 'none';
  });
  renderDraftList();
  renderPickChips();
  filterExPicker();
}

// Image(s) d'un exercice (animée si départ + position finale existent)
function pickImgTag(ex){
  const a = ex.image_start_url, b = ex.image_peak_url || ex.image_url;
  if(a && b && a!==b) return `<img class="pick-ex-img anim-img" data-a="${a}" data-b="${b}" data-t="0" src="${a}" alt="" loading="lazy" onerror="this.classList.remove('anim-img'); this.remove();">`;
  const single = b || a;
  return single ? `<img class="pick-ex-img" src="${single}" alt="" loading="lazy" onerror="this.remove()">` : '';
}
setInterval(()=>{
  document.querySelectorAll('.anim-img').forEach(img=>{
    const t = img.dataset.t === '0' ? '1' : '0';
    img.dataset.t = t;
    img.src = t === '0' ? img.dataset.a : img.dataset.b;
  });
}, 700);
function selectPickEx(exId){
  const h = document.getElementById('pfPickEx'); if(h) h.value = exId;
  [...document.querySelectorAll('#pfPickGrid .pick-ex-card')].forEach(c=> c.classList.toggle('selected', c.dataset.id===exId));
}
function filterExPicker(){
  const grid = document.getElementById('pfPickGrid');
  if(!grid) return;
  const q = (document.getElementById('pfSearch').value || '').trim().fold();
  const matches = exercises.filter(e=> pickMatchesGroup(e, pickGroup) && (!pickMuscle || pickMuscleLabels(e, pickGroup).includes(pickMuscle)) && (!q ||
    (e.name||'').fold().includes(q)
    || (e.category||'').fold().includes(q)
    || (e.primary_muscles||[]).some(m=>(m||'').fold().includes(q))
    || (e.secondary_muscles||[]).some(m=>(m||'').fold().includes(q))
  ));
  const selected = document.getElementById('pfPickEx').value;
  grid.innerHTML = matches.length ? matches.map(e=>`
    <button type="button" class="pick-ex-card ${e.id===selected?'selected':''}" data-id="${e.id}" onclick="selectPickEx('${e.id}')">
      ${pickImgTag(e) || '<span class="pick-ex-noimg">'+escapeHtml(e.category||'')+'</span>'}
      <span>${escapeHtml(e.name)}</span>
    </button>`).join('') : '<div class="empty" style="grid-column:1/-1;padding:20px 0;">Aucun résultat.</div>';
}
function editSelectedPickerEx(){
  const exId = document.getElementById('pfPickEx').value;
  if(!exId){ toast('Choisis une fiche à modifier'); return; }
  openExerciseModal(exId);
}

function renderDayTabs(){
  const box = document.getElementById('pfDayTabs');
  if(!box) return;
  box.innerHTML = draftDays.map((d,i)=>{
    const n = draftItems.filter(x=>x.day===d).length;
    return `<button type="button" class="day-chip ${i===activeDayIdx?'active':''}" onclick="selectDay(${i})">${escapeHtml(d)} (${n})</button>`;
  }).join('') + `<button type="button" class="day-chip add" onclick="addDay()">+ Séance</button>`;
}
function selectDay(i){ activeDayIdx = i; renderDraftList(); }
function addDay(){
  let n = draftDays.length + 1, name = `Séance ${n}`;
  while(draftDays.includes(name)){ n++; name = `Séance ${n}`; }
  draftDays.push(name);
  activeDayIdx = draftDays.length - 1;
  renderDraftList();
}
function renameDay(){
  const old = draftDays[activeDayIdx];
  const val = prompt('Nom de la séance :', old);
  if(val === null) return;
  const name = val.trim();
  if(!name){ toast('Le nom ne peut pas être vide'); return; }
  if(name !== old && draftDays.includes(name)){ toast('Une séance porte déjà ce nom'); return; }
  draftItems.forEach(x=>{ if(x.day===old) x.day = name; });
  draftDays[activeDayIdx] = name;
  renderDraftList();
}
function deleteDay(){
  if(draftDays.length <= 1){ toast('Un programme doit avoir au moins une séance'); return; }
  const name = draftDays[activeDayIdx];
  const n = draftItems.filter(x=>x.day===name).length;
  if(!confirm(n ? `Supprimer « ${name} » et ses ${n} exercice${n>1?'s':''} ?` : `Supprimer « ${name} » ?`)) return;
  draftItems = draftItems.filter(x=>x.day!==name);
  draftDays.splice(activeDayIdx,1);
  activeDayIdx = Math.max(0, activeDayIdx-1);
  renderDraftList();
}
function renderDraftList(){
  renderDayTabs();
  const day = draftDays[activeDayIdx];
  const title = document.getElementById('pfDayTitle');
  if(title) title.textContent = draftDays.length > 1 ? `Exercices de « ${day} »` : 'Exercices';
  const rows = draftItems.map((it,i)=>({it,i})).filter(x=>x.it.day===day);
  const tags = []; let letter = -1, pos = 0;
  rows.forEach(({it},idx)=>{
    const next = rows[idx+1];
    const inChain = (idx > 0 && it.linkPrev) || (next && next.it.linkPrev);
    if(!inChain){ tags.push(null); return; }
    if(idx > 0 && it.linkPrev){ pos++; } else { letter++; pos = 1; }
    tags.push(String.fromCharCode(65+letter) + pos);
  });
  document.getElementById('pfExList').innerHTML = rows.length ? rows.map(({it,i},idx)=>{
    const ex = exercisesById[it.exercise_id];
    const vex = it.variant_id ? exercisesById[it.variant_id] : null;
    return `<div class="ex-mini ${tags[idx]?'in-ss':''}">
      <span>${tags[idx]?`<span class="ss-chip">SUPERSET ${tags[idx]}</span> `:''}<b>${escapeHtml(it.label || (ex?ex.name:'Exercice'))}</b>${it.label?` <span style="opacity:.6;font-size:12px;">· fiche : ${escapeHtml(ex?ex.name:'')}</span>`:''}
        ${vex?`<div class="draft-var">↔ Variante : ${escapeHtml(vex.name)} <button type="button" class="rm-var" title="Retirer la variante" onclick="clearVariant(${i})">✕</button></div>`:''}
        <div class="ex-edit">
          <label class="ex-edit-name">Nom affiché dans ce programme (facultatif)<input type="text" maxlength="80" value="${escapeHtml(it.label||'')}" placeholder="${escapeHtml(ex?ex.name:'')}" onchange="editDraft(${i},'label',this)"></label>
          <label>Séries<input type="number" inputmode="numeric" min="1" value="${it.sets||3}" onchange="editDraft(${i},'sets',this)"></label>
          <label>Reps / durée<input type="text" value="${escapeHtml(it.reps||'')}" onchange="editDraft(${i},'reps',this)"></label>
          ${(tags[idx] && (idx+1 < rows.length) && rows[idx+1].it.linkPrev) ? `<label title="Dans un superset, le repos se prend une seule fois, à la fin du tour (voir le dernier exercice)">Repos<input type="text" disabled value="" placeholder="fin du tour"></label>` : `<label>${tags[idx] ? 'Repos après le tour (min)' : 'Repos (min)'}<input type="text" inputmode="decimal" value="${restInputVal(it.rest_seconds)}" onchange="editDraft(${i},'rest',this)"></label>`}
        </div></span>
      <span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
        <button onclick="openExerciseModal('${it.exercise_id}')" title="Modifier la fiche">✏️</button>
        <button onclick="moveDraft(${i},-1)" title="Monter">↑</button>
        <button onclick="moveDraft(${i},1)" title="Descendre">↓</button>
        <button class="${it.linkPrev?'on':''}" ${idx>0?'':'disabled'} onclick="toggleLink(${i})" title="Enchaîner avec l'exercice du dessus (superset)">🔗</button>
        <button onclick="setVariant(${i})" title="Variante : utilise l'exercice sélectionné dans la grille">↔</button>
        <button onclick="removeDraftEx(${i})" title="Retirer">✕</button>
      </span>
    </div>`;
  }).join('') + `<p class="empty" style="padding:8px 0 0;text-align:left;">🔗 enchaîne avec l'exercice du dessus (superset) · ↔ ajoute comme variante l'exercice sélectionné dans la grille</p>` : '<div class="empty">Aucun exercice pour l\'instant — ajoute-en un ci-dessous.</div>';
}
function toggleLink(i){
  const day = draftItems[i].day;
  if(!draftItems.slice(0,i).some(x=>x.day===day)){ toast('Il faut un exercice au-dessus pour créer un superset'); return; }
  draftItems[i].linkPrev = !draftItems[i].linkPrev;
  renderDraftList();
}
function setVariant(i){
  const exId = document.getElementById('pfPickEx').value;
  if(!exId){ toast('Choisis d\'abord l\'exercice variante dans la grille'); return; }
  if(exId === draftItems[i].exercise_id){ toast('La variante doit être un autre exercice'); return; }
  draftItems[i].variant_id = exId;
  renderDraftList();
}
function clearVariant(i){ draftItems[i].variant_id = null; renderDraftList(); }
// ---- Saisie rapide : reps (« 10 », « 8-12 »), durée (« 45s », « 1:30 », « 2 min », « 20-25 min »), repos en minutes
function secsLabel(t){ const m = Math.floor(t / 60), s = t % 60; return m ? (s ? `${m} min ${s}s` : `${m} min`) : `${s}s`; }
function fmtTimeSecs(a, b){
  if(!a && !b) return '30s';
  if(!a) a = b;
  if(b > a){
    if(a % 60 === 0 && b % 60 === 0) return `${a/60}-${b/60} min`;
    if(a < 60 && b < 60) return `${a}-${b}s`;
    return `${secsLabel(a)} à ${secsLabel(b)}`;
  }
  return secsLabel(a);
}
function fmtRepsRange(a, b){
  const x = parseInt(a), y = parseInt(b);
  if(!(x > 0) && !(y > 0)) return '10-12';
  if(!(x > 0)) return String(y);
  return y > x ? `${x}-${y}` : String(x);
}
// Renvoie le texte normalisé (« 10 », « 8-12 », « 45s », « 1 min 30s »…) ou null si illisible
function parseRepsInput(str){
  let t = String(str == null ? '' : str).trim().toLowerCase().replace(',', '.').replace(/\s*(reps?|répétitions?|rép\.?|x)\s*$/, '');
  if(!t) return fmtRepsRange('', '');
  const isTime = /[sm]|:/.test(t.replace(/à/g, '-'));
  if(!isTime){
    const m = t.match(/^(\d+)\s*(?:-|–|à)\s*(\d+)$/) || t.match(/^(\d+)$/);
    if(!m) return null;
    const x = parseInt(m[1]); if(!(x > 0) || x > 999) return null;
    return fmtRepsRange(m[1], m[2] || '');
  }
  const parts = t.split(/\s*(?:-|–|à)\s*/);
  if(parts.length > 2) return null;
  const unitOf = p => /min|m\b/.test(p) ? 'min' : (/s/.test(p) ? 's' : null);
  const one = (p, def) => {
    let m = p.match(/^(\d+):(\d{1,2})$/); if(m) return parseInt(m[1]) * 60 + parseInt(m[2]);
    m = p.match(/^(\d+(?:\.\d+)?)\s*(?:min|m)\s*(?:(\d+)\s*s?)?$/); if(m) return Math.round(parseFloat(m[1]) * 60) + (m[2] ? parseInt(m[2]) : 0);
    m = p.match(/^(\d+)\s*s(?:ec)?$/); if(m) return parseInt(m[1]);
    m = p.match(/^(\d+(?:\.\d+)?)$/); if(m) return def === 'min' ? Math.round(parseFloat(m[1]) * 60) : parseInt(m[1]);
    return null;
  };
  const def = unitOf(parts[parts.length-1]) || unitOf(parts[0]) || 's';
  const a = one(parts[0], def), b = parts[1] != null ? one(parts[1], def) : 0;
  if(a == null || b == null || (!a && !b) || a > 36000 || b > 36000) return null;
  return fmtTimeSecs(a, b);
}
// Repos saisi en minutes (« 1:30 », « 1,5 », « 2 ») ou en secondes (« 45s ») -> secondes, ou null
function parseRestInput(str){
  const t = String(str == null ? '' : str).trim().toLowerCase().replace(',', '.');
  if(!t) return 90;
  let m = t.match(/^(\d+):(\d{1,2})$/); if(m) return Math.min(3600, parseInt(m[1]) * 60 + parseInt(m[2]));
  m = t.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec)$/); if(m) return Math.min(3600, Math.round(parseFloat(m[1])));
  m = t.match(/^(\d+(?:\.\d+)?)\s*(?:min|m)?$/); if(m){ const v = parseFloat(m[1]); return Math.min(3600, Math.round(/[a-z]/.test(t) || v < 15 ? v * 60 : v)); } // 15 et + sans unité = secondes (ex. 90)
  return null;
}
function restInputVal(sec){
  if(sec == null || sec === '') return '';
  sec = parseInt(sec); if(!(sec >= 0)) return '';
  if(sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m}:${String(s).padStart(2,'0')}` : String(m);
}
function addDraftEx(){
  const exId = document.getElementById('pfPickEx').value;
  if(!exId){ toast('Choisis un exercice'); return; }
  const sets = parseInt(document.getElementById('pfSets').value) || 3;
  const reps = parseRepsInput(document.getElementById('pfReps').value);
  if(reps == null){ toast('Reps ou durée illisible : essaie 10, 8-12, 45s ou 2 min'); return; }
  const rest = parseRestInput(document.getElementById('pfRest').value);
  if(rest == null){ toast('Repos illisible : essaie 1:30, 1,5 ou 2'); return; }
  draftItems.push({ exercise_id: exId, sets, reps, rest_seconds: rest, day: draftDays[activeDayIdx], linkPrev: false, variant_id: null });
  renderDraftList();
}
// Modification directe d'un exercice déjà ajouté (séries, reps/durée, repos)
function editDraft(i, field, el){
  const it = draftItems[i]; if(!it) return;
  if(field === 'label'){
    const v = el.value.replace(/[<>]/g, '').trim().slice(0, 80);
    it.label = v; renderDraftList(); return;
  } else if(field === 'sets'){
    const n = parseInt(el.value);
    if(!(n > 0) || n > 99){ toast('Nombre de séries invalide'); el.value = it.sets || 3; return; }
    it.sets = n; el.value = n;
  } else if(field === 'reps'){
    const r = parseRepsInput(el.value);
    if(r == null){ toast('Reps ou durée illisible : essaie 10, 8-12, 45s ou 2 min'); el.value = it.reps || ''; return; }
    it.reps = r; el.value = r;
  } else {
    const r = parseRestInput(el.value);
    if(r == null){ toast('Repos illisible : essaie 1:30, 1,5 ou 2'); el.value = restInputVal(it.rest_seconds); return; }
    it.rest_seconds = r; el.value = restInputVal(r);
  }
}
function moveDraft(i, dir){
  // on échange avec le voisin le plus proche appartenant à la même séance
  let j = i+dir;
  while(j>=0 && j<draftItems.length && draftItems[j].day !== draftItems[i].day) j += dir;
  if(j<0 || j>=draftItems.length) return;
  const tmp = draftItems[i]; draftItems[i] = draftItems[j]; draftItems[j] = tmp;
  draftItems[i].linkPrev = false; draftItems[j].linkPrev = false; // à relier ensuite si besoin
  renderDraftList();
}
function removeDraftEx(i){
  const ex = exercisesById[draftItems[i]?.exercise_id];
  if(!confirm(`Retirer "${ex?ex.name:'cet exercice'}" du programme ?`)) return;
  // Si on retire la tête d'un superset, l'exercice suivant du superset devient la nouvelle tête
  // (sinon il se retrouverait enchaîné à l'exercice qui précède le superset).
  let j = i + 1;
  while(j < draftItems.length && draftItems[j].day !== draftItems[i].day) j++;
  if(!draftItems[i].linkPrev && j < draftItems.length && draftItems[j].linkPrev) draftItems[j].linkPrev = false;
  draftItems.splice(i,1);
  renderDraftList();
}

async function saveProgramForm(programId){
  const name = document.getElementById('pfName').value.trim();
  const desc = document.getElementById('pfDesc').value.trim();
  const target = document.getElementById('pfTarget').value;
  let clientId = null;
  if(target==='client'){ clientId = document.getElementById('pfClient').value; if(!clientId){ toast('Choisis un client, ou « à affecter plus tard »'); return; } }
  else if(target==='later'){ clientId = MY_ID; }
  if(!name){ toast('Donne un nom au programme'); return; }
  if(!draftItems.length){ toast('Ajoute au moins un exercice à la liste'); return; }
  const emptyDay = draftDays.find(d=> !draftItems.some(x=>x.day===d));
  if(emptyDay){ toast(`« ${emptyDay} » est vide : ajoute-y un exercice ou supprime-la`); return; }
  const btn = document.getElementById('pfSaveBtn');
  const originalLabel = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Enregistrement...'; }
  try{
    const body = { name, description: desc||null, is_official: target==='official', owner_user_id: clientId };
    let pid = programId;
    if(pid){
      await api(`/rest/v1/programs?id=eq.${pid}`, { method:'PATCH', body: JSON.stringify(body) });
      await api(`/rest/v1/program_exercises?program_id=eq.${pid}`, { method:'DELETE' });
    } else {
      const created = await api('/rest/v1/programs', { method:'POST', headers:{Prefer:'return=representation'}, body: JSON.stringify(body) });
      pid = created[0].id;
    }
    const single = draftDays.length === 1;
    const ordered = [];
    let gid = 0;
    draftDays.forEach(day=> draftItems.filter(x=>x.day===day).forEach((x,idx)=>{
      const item = { ...x, day_label: single ? null : day, superset_group: null };
      if(idx > 0 && x.linkPrev){
        const prev = ordered[ordered.length-1];
        if(prev.superset_group == null){ gid++; prev.superset_group = gid; }
        item.superset_group = prev.superset_group;
      }
      ordered.push(item);
    }));
    ordered.forEach((it, k) => { const n = ordered[k+1]; if(it.superset_group != null && n && n.superset_group === it.superset_group) it.rest_seconds = 0; });
    const rows = ordered.map((it,i)=>({ program_id: pid, exercise_id: it.exercise_id, order_index: i+1, sets: it.sets, reps: it.reps, rest_seconds: it.rest_seconds, day_label: it.day_label, superset_group: it.superset_group, variant_exercise_id: it.variant_id || null, custom_name: (it.label || '').trim() || null }));
    await api('/rest/v1/program_exercises', { method:'POST', body: JSON.stringify(rows) });
    toast(programId ? 'Programme mis à jour' : 'Programme créé');
    renderProgramForm(pid);
  }catch(e){
    console.error(e);
    toast('Erreur, impossible d\'enregistrer. Réessaie.');
    if(btn){ btn.disabled = false; btn.textContent = originalLabel; }
  }
}
async function deleteProgramForm(programId){
  if(!confirm('Supprimer ce programme ?')) return;
  await api(`/rest/v1/programs?id=eq.${programId}`, { method:'DELETE' });
  toast('Programme supprimé'); renderProgramsTab();
}
async function duplicateProgram(programId){
  const program = (await api(`/rest/v1/programs?select=*&id=eq.${programId}`))[0];
  const items = await api(`/rest/v1/program_exercises?select=*&program_id=eq.${programId}&order=order_index`);
  renderProgramForm(null, {
    name: program.name,
    description: program.description,
    is_official: program.is_official,
    owner_user_id: program.owner_user_id,
    items: items.map((it,i)=>({ exercise_id: it.exercise_id, sets: it.sets, reps: it.reps, rest_seconds: it.rest_seconds, day: it.day_label || 'Séance 1', variant_id: it.variant_exercise_id || null, label: it.custom_name || '',
      linkPrev: i > 0 && it.superset_group != null && items[i-1].superset_group === it.superset_group && (items[i-1].day_label||'Séance 1') === (it.day_label||'Séance 1') }))
  });
}
