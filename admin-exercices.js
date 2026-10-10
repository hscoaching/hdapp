// HS Coaching — espace admin : admin-exercices.js (extrait de admin.html, comportement inchangé)
// ================= EXERCICES =================
let exSearchQ = '';
async function renderExercisesTab(){
  document.getElementById('tabBody').innerHTML = `
    <div class="row-actions"><button class="btn btn-accent" onclick="openExerciseModal()">+ Nouvel exercice</button></div>
    <div class="field" style="margin-top:12px;"><label>Chercher une fiche</label><input id="exSearch" type="text" placeholder="Nom, categorie, muscle..." value="${exSearchQ.replace(/"/g,'&quot;')}" oninput="filterExercisesTab(this.value)"></div>
    <div id="exList" style="margin-top:16px;"></div>
  `;
  filterExercisesTab(exSearchQ);
  document.getElementById('exSearch').focus();
}
function filterExercisesTab(q){
  exSearchQ = q || '';
  const qq = exSearchQ.trim().fold();
  const list = !qq ? exercises : exercises.filter(e=>
    (e.name||'').fold().includes(qq)
    || (e.category||'').fold().includes(qq)
    || (e.short_description||'').fold().includes(qq)
    || (e.primary_muscles||[]).some(m=>(m||'').fold().includes(qq))
    || (e.secondary_muscles||[]).some(m=>(m||'').fold().includes(qq))
  );
  renderExList(list);
}
// Miniature d'un exercice (animée si image de départ + position finale)
function listThumbTag(ex){
  const a = ex.image_start_url, b = ex.image_peak_url || ex.image_url;
  if(a && b && a!==b) return `<img class="anim-img" data-a="${a}" data-b="${b}" data-t="0" src="${a}" alt="" loading="lazy" onerror="this.classList.remove('anim-img'); this.remove();">`;
  const single = b || a;
  return single ? `<img src="${single}" alt="" loading="lazy" onerror="this.remove()">` : '';
}
function renderExList(list){
  const box = document.getElementById('exList');
  if(!box) return;
  box.innerHTML = list.length ? list.map(e=>`
    <div class="card ex-card" onclick="openExerciseModal('${e.id}')">
      <div class="ex-thumb">${listThumbTag(e) || `<span class="ex-thumb-empty">${escapeHtml(e.category||'')}</span>`}</div>
      <div class="ex-card-text"><div class="tag">${escapeHtml(e.category||'')}</div><h3>${escapeHtml(e.name||'')}</h3><p>${escapeHtml(e.short_description||'')}</p></div>
    </div>
  `).join('') : '<div class="empty">Aucune fiche ne correspond a cette recherche.</div>';
}
function exerciseFormHtml(exId){
  const ex = exId ? exercisesById[exId] : null;
  return `
    <div class="field"><label>Nom</label><input id="efName" value="${escapeHtml(ex?.name||'')}"></div>
    <div class="field"><label>Categorie</label>
      <select id="efCat">${["Jambes","Dos","Pectoraux","Épaules","Bras","Abdos"].map(c=>`<option ${ex?.category===c?'selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Description courte</label><input id="efShort" value="${(ex?.short_description||'').replace(/"/g,'&quot;')}"></div>
    <div class="field"><label>Image (URL)</label><input id="efImg" value="${escapeHtml(ex?.image_url||'')}" placeholder="https://...">
      ${ex?.image_url?`<img src="${escapeHtml(ex.image_url)}" style="width:100%;max-width:220px;border-radius:8px;margin-top:8px;" onerror="this.style.display='none'">`:''}
    </div>
    <div class="field"><label>Consigne</label><textarea id="efInstr">${escapeHtml(ex?.instructions||'')}</textarea></div>
    <div class="field"><label>Points techniques (un par ligne)</label><textarea id="efPoints">${escapeHtml((ex?.technique_points||[]).join('\n'))}</textarea></div>
    <div class="row-actions">
      <button class="btn btn-accent" onclick="saveExercise('${exId||''}')">${exId?'Enregistrer':'Creer la fiche'}</button>
      ${(exId && IS_SUPER)?`<button class="btn btn-danger" onclick="deleteExercise('${exId}')">Supprimer</button>`:''}
      <button class="btn btn-ghost" onclick="closeExerciseModal()">Annuler</button>
    </div>
  `;
}
function newExerciseFromBuilder(){
  openExerciseModal();
  // pré-remplit le nom avec ce qui a été tapé dans la recherche (si aucun exercice ne correspondait)
  const q = (document.getElementById('pfSearch')?.value || '').trim();
  const n = document.getElementById('efName');
  if(n && q) n.value = q;
}
function openExerciseModal(exId){
  document.getElementById('exModalTitle').textContent = exId ? 'Modifier la fiche' : 'Nouvelle fiche';
  document.getElementById('exModalBody').innerHTML = exerciseFormHtml(exId);
  document.getElementById('exModalOverlay').classList.add('open');
}
function closeExerciseModal(){
  document.getElementById('exModalOverlay').classList.remove('open');
}
async function saveExercise(exId){
  const name = document.getElementById('efName').value.trim();
  if(!name){ toast('Nom requis'); return; }
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const body = {
    name, slug, category: document.getElementById('efCat').value,
    short_description: document.getElementById('efShort').value.trim(),
    image_url: document.getElementById('efImg').value.trim() || null,
    instructions: document.getElementById('efInstr').value.trim(),
    technique_points: document.getElementById('efPoints').value.split('\n').map(s=>s.trim()).filter(Boolean)
  };
  let savedId = exId;
  try{
    if(exId){
      await api(`/rest/v1/exercises?id=eq.${exId}`, { method:'PATCH', body: JSON.stringify(body) });
    } else {
      const created = await api('/rest/v1/exercises', { method:'POST', headers:{Prefer:'return=representation'}, body: JSON.stringify(body) });
      savedId = created[0].id;
    }
  }catch(e){ toast("Impossible d'enregistrer la fiche."); return; }
  toast('Fiche enregistrée');
  exercises = await api('/rest/v1/exercises?select=*&order=category,name');
  exercisesById = Object.fromEntries(exercises.map(e=>[e.id,e]));
  closeExerciseModal();
  if(document.getElementById('exList')) filterExercisesTab(exSearchQ);
  if(document.getElementById('pfPickEx')){
    if(savedId){
      document.getElementById('pfPickEx').value = savedId;
      if(!exId){ const ps = document.getElementById('pfSearch'); if(ps) ps.value = ''; }
    }
    filterExPicker();
    if(savedId && !exId) document.querySelector(`#pfPickGrid .pick-ex-card[data-id="${savedId}"]`)?.scrollIntoView({block:'center'});
    renderDraftList();
  }
}
async function deleteExercise(exId){
  if(!confirm('Supprimer cette fiche ? (impossible si elle est utilisée dans un programme)')) return;
  try{
    await api(`/rest/v1/exercises?id=eq.${exId}`, { method:'DELETE' });
    toast('Fiche supprimée');
    exercises = exercises.filter(e=>e.id!==exId); exercisesById = Object.fromEntries(exercises.map(e=>[e.id,e]));
    closeExerciseModal();
    if(document.getElementById('exList')) filterExercisesTab(exSearchQ);
    if(document.getElementById('pfPickEx')){ if(document.getElementById('pfPickEx').value===exId) document.getElementById('pfPickEx').value=''; filterExPicker(); renderDraftList(); }
  }catch(e){ toast('Cette fiche est utilisée dans un programme, retire-la d\'abord.'); }
}
