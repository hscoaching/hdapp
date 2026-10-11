// HS Coaching — espace admin : sauvegardes, copie chez soi, restauration (grand admin uniquement).
// Dépend de admin.html : api(), refreshIfNeeded(), getSession(), SUPABASE_URL, SUPABASE_ANON_KEY, escapeHtml(), toast(), IS_SUPER.

const BK_LIMIT_DAYS = 30;       // au-delà : rappel rouge
const BK_WARN_DAYS = 20;        // à partir de : orange
const BK_LABELS = {
  profiles: 'Comptes', coach_profiles: 'Fiches coach', coach_contact_requests: 'Demandes de coaching', exercises: 'Exercices',
  programs: 'Programmes', program_exercises: 'Exercices des programmes', sessions: 'Séances', session_logs: 'Séries',
  session_edit_requests: 'Demandes de correction', body_logs: 'Poids de corps', body_goals: 'Objectifs de poids',
  recovery_checkins: 'Récupération', badge_revocations: 'Badges retirés', conversations: 'Conversations', messages: 'Messages',
  challenges: 'Challenges', challenge_participants: 'Participants aux challenges', challenge_attempts: 'Essais de challenges',
  push_subscriptions: 'Notifications', app_visits: 'Visites', guest_profiles: 'Invités', exercise_tips: 'Conseils',
  team_messages: "Messages d'équipe", prog_folders: 'Dossiers', rest_timers: 'Minuteurs'
};
const BK_NEW = ['exercise_tips', 'team_messages', 'prog_folders', 'rest_timers'];

async function backupCall(action, extra){
  await refreshIfNeeded(); const s = getSession();
  return fetch(`${SUPABASE_URL}/functions/v1/backup-db`, { method:'POST', headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${s?.access_token}`, 'Content-Type':'application/json' }, body: JSON.stringify(Object.assign({ action }, extra || {})) });
}

function bkDaysSince(iso){ if(!iso) return null; const t = new Date(iso).getTime(); return isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000); }
function bkFmtDate(iso){ try{ return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) + ' · ' + new Date(iso).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }); }catch(e){ return iso || ''; } }
function bkFileDate(name){
  const m = /^backup-(\d{4}-\d{2}-\d{2})\.json$/.exec(name); if(m) return new Date(m[1] + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  const a = /^avant-restauration-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/.exec(name); if(a) return a[3] + '/' + a[2] + ' ' + a[4] + ' h ' + a[5];
  return name;
}
function bkDot(c){ return `<span style="width:10px;height:10px;border-radius:50%;flex:none;background:${c}"></span>`; }
function bkStatusRow(color, title, sub){
  return `<div style="display:flex;gap:10px;align-items:center;border:1px solid var(--line);background:var(--surface-2);border-radius:12px;padding:10px 12px;margin-bottom:8px">${bkDot(color)}<div><div style="font-weight:700;font-size:13.5px">${title}</div><div style="font-size:12px;opacity:.7">${sub}</div></div></div>`;
}
function bkLocalState(lastDownload){
  const d = bkDaysSince(lastDownload);
  if(d == null) return { color:'#ff6b6b', title:'Ta copie chez toi : aucune pour l\'instant', sub:'Télécharge-en une dès maintenant', due:true, days:null };
  const when = d === 0 ? "aujourd'hui" : d === 1 ? 'hier' : 'il y a ' + d + ' jours';
  if(d > BK_LIMIT_DAYS) return { color:'#ff6b6b', title:'Ta copie chez toi : ' + when, sub:'Elle date de plus de ' + BK_LIMIT_DAYS + ' jours', due:true, days:d };
  if(d >= BK_WARN_DAYS) return { color:'#f0b34a', title:'Ta copie chez toi : ' + when, sub:'Télécharge-en une avant ' + BK_LIMIT_DAYS + ' jours', due:false, days:d };
  return { color:'#5ac77b', title:'Ta copie chez toi : ' + when, sub:'À jour', due:false, days:d };
}

async function bkDownload(btn){
  const old = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Préparation…'; }
  try{
    const r = await backupCall('download'); if(!r.ok) throw new Error('bk');
    const blob = await r.blob(), url = URL.createObjectURL(blob), el = document.createElement('a');
    el.href = url; el.download = 'hs-coaching-sauvegarde-' + new Date().toISOString().slice(0,10) + '.json'; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Sauvegarde téléchargée');
    return true;
  }catch(e){ console.error(e); toast('Sauvegarde impossible, réessaie'); return false; }
  finally{ if(btn){ btn.disabled = false; btn.textContent = old; } refreshBackupBadge(); }
}

// Pastille + bandeau de rappel sur le tableau de bord (grand admin)
async function refreshBackupBadge(){
  const b = document.getElementById('bkBtn'); if(!b || !IS_SUPER) return;
  let j = null;
  try{ const r = await backupCall('status'); if(r.ok) j = await r.json(); }catch(e){}
  if(!j) return;
  const st = bkLocalState(j.last_download);
  b.textContent = '💾 Sauvegardes' + (st.due ? ' ●' : ''); b.style.borderColor = st.due ? '#ff6b6b' : '';
  let ban = document.getElementById('bkBanner');
  if(!st.due){ if(ban) ban.remove(); return; }
  if(!ban){
    ban = document.createElement('div'); ban.id = 'bkBanner';
    ban.style.cssText = 'border:1px solid #ff6b6b;background:rgba(255,107,107,.08);border-radius:12px;padding:10px 12px;margin-bottom:12px;display:flex;gap:10px;align-items:center;font-size:13px';
    const tabs = document.querySelector('.tabs'); if(tabs && tabs.parentNode) tabs.parentNode.insertBefore(ban, tabs); else return;
  }
  ban.innerHTML = `<div style="flex:1"><b>${escapeHtml(st.days == null ? 'Aucune copie chez toi pour l\'instant' : 'Ta copie chez toi date de ' + st.days + ' jours')}</b><div style="opacity:.7;font-size:12px">Une copie à jour te protège d'une perte des données.</div></div><button type="button" class="btn btn-ghost" id="bkBanBtn" style="white-space:nowrap">Télécharger</button>`;
  ban.querySelector('#bkBanBtn').onclick = e => bkDownload(e.currentTarget);
}

function bkOverlay(){
  const old = document.getElementById('bkOv'); if(old) old.remove();
  const ov = document.createElement('div'); ov.id = 'bkOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1300;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  ov.onclick = e => { if(e.target === ov) ov.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'max-width:480px;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:20px 18px;max-height:92vh;overflow:auto';
  ov.appendChild(box); document.body.appendChild(ov);
  return { ov, box };
}

async function openBackups(){
  const { ov, box } = bkOverlay();
  box.innerHTML = `<h2 style="margin:0 0 10px">💾 Sauvegardes</h2><div id="bkTop">Chargement…</div>`;
  let j = null;
  try{ const r = await backupCall('status'); if(!r.ok) throw new Error('st'); j = await r.json(); }
  catch(e){ box.innerHTML = `<h2 style="margin:0 0 10px">💾 Sauvegardes</h2><div>Liste indisponible.</div><div style="margin-top:12px"><button class="btn btn-ghost" id="bkX">Fermer</button></div>`; box.querySelector('#bkX').onclick = () => ov.remove(); return; }
  const files = (j.files || []).filter(x => /^(backup|avant-restauration)-/.test(x.name));
  const autos = files.filter(x => x.name.startsWith('backup-'));
  const last = autos[0];
  const lastDays = last ? (Date.now() - new Date(last.at).getTime()) / 3600000 : null;
  const autoRow = last && lastDays < 36
    ? bkStatusRow('#5ac77b', 'Sauvegarde automatique : OK', 'Dernière copie ' + escapeHtml(bkFmtDate(last.at)) + ' · ' + autos.length + ' gardées')
    : bkStatusRow('#ff6b6b', 'Sauvegarde automatique : à vérifier', last ? 'Dernière copie ' + escapeHtml(bkFmtDate(last.at)) : 'Aucune copie trouvée');
  const st = bkLocalState(j.last_download);
  const chips = Object.keys(BK_LABELS).map(k => `<span style="font-size:11px;border:1px solid ${BK_NEW.includes(k) ? '#fff' : 'var(--line)'};border-radius:20px;padding:3px 8px;opacity:${BK_NEW.includes(k) ? 1 : .75}">${escapeHtml(BK_LABELS[k])}</span>`).join('');
  const hist = files.slice(0, 6).map(x => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px"><span>${escapeHtml(bkFileDate(x.name))}</span><span style="opacity:.6">${x.name.startsWith('avant-') ? 'avant restauration' : 'auto'}</span></div>`).join('');
  box.innerHTML = `<h2 style="margin:0 0 4px">💾 Sauvegardes</h2>
    <div style="font-size:12.5px;opacity:.7;margin-bottom:12px">Une copie de toutes les données est faite automatiquement chaque nuit. Les 14 dernières sont gardées chez Supabase.</div>
    ${autoRow}${bkStatusRow(st.color, st.title, st.sub)}
    <button class="btn btn-accent" id="bkNow" style="width:100%;justify-content:center;margin-top:4px">⬇️ Télécharger ma copie</button>
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin:16px 2px 6px">Ce qui est sauvegardé · ${Object.keys(BK_LABELS).length} tables</div>
    <div style="display:flex;flex-wrap:wrap;gap:5px">${chips}</div>
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin:16px 2px 4px">Historique</div>
    <div>${hist || '<div style="opacity:.6;font-size:13px">Aucune copie.</div>'}</div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" id="bkRestore" style="flex:1;justify-content:center">♻️ Restaurer une sauvegarde</button><button class="btn btn-ghost" id="bkX">Fermer</button></div>
    <div style="font-size:12px;opacity:.65;margin-top:10px">Le fichier téléchargé contient les données de tes clients : range-le dans un endroit privé.</div>`;
  box.querySelector('#bkX').onclick = () => ov.remove();
  box.querySelector('#bkNow').onclick = async e => { const ok = await bkDownload(e.currentTarget); if(ok){ ov.remove(); openBackups(); } };
  box.querySelector('#bkRestore').onclick = () => bkRestoreStart(ov, box, files);
}

// ---------------- Restauration ----------------
function bkRestoreHead(sub){ return `<h2 style="margin:0 0 4px">♻️ Restaurer</h2><div style="font-size:12.5px;opacity:.7;margin-bottom:12px">${sub}</div>`; }

function bkRestoreStart(ov, box, files){
  const list = files.slice(0, 8).map(x => `<div class="bk-pick" data-f="${escapeHtml(x.name)}" style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px;cursor:pointer"><span>${escapeHtml(bkFileDate(x.name))} · ${x.name.startsWith('avant-') ? 'avant restauration' : 'auto'}</span><span style="opacity:.6">Choisir</span></div>`).join('');
  box.innerHTML = bkRestoreHead('Choisis un fichier de sauvegarde téléchargé avant, ou une des copies automatiques.') +
    `<input type="file" id="bkFile" accept=".json,application/json" style="display:none">
     <button class="btn btn-ghost" id="bkPickFile" style="width:100%;justify-content:center">📁 Choisir un fichier sur mon appareil</button>
     <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin:16px 2px 4px">Ou une copie automatique</div>
     <div>${list || '<div style="opacity:.6;font-size:13px">Aucune copie.</div>'}</div>
     <div id="bkMsg" style="color:#ff8a8a;font-size:13px;margin-top:10px"></div>
     <div style="margin-top:14px"><button class="btn btn-ghost" id="bkBack">← Retour</button></div>`;
  box.querySelector('#bkBack').onclick = () => { ov.remove(); openBackups(); };
  const fi = box.querySelector('#bkFile');
  box.querySelector('#bkPickFile').onclick = () => fi.click();
  fi.onchange = async () => { const f = fi.files && fi.files[0]; if(!f) return; try{ bkRestorePreview(ov, box, JSON.parse(await f.text()), f.name); }catch(e){ box.querySelector('#bkMsg').textContent = "Ce fichier n'est pas une sauvegarde valide."; } };
  box.querySelectorAll('.bk-pick').forEach(el => el.onclick = async () => {
    const msg = box.querySelector('#bkMsg'); msg.textContent = 'Chargement…'; msg.style.color = '';
    try{ const r = await backupCall('get', { file: el.dataset.f }); if(!r.ok) throw new Error('get'); bkRestorePreview(ov, box, await r.json(), el.dataset.f); }
    catch(e){ msg.style.color = '#ff8a8a'; msg.textContent = 'Impossible de lire cette copie.'; }
  });
}

async function bkRestorePreview(ov, box, obj, label){
  if(!obj || typeof obj.tables !== 'object' || obj.tables === null || Array.isArray(obj.tables)){
    const m = box.querySelector('#bkMsg'); if(m){ m.style.color = '#ff8a8a'; m.textContent = "Ce fichier n'est pas une sauvegarde valide."; } return;
  }
  box.innerHTML = bkRestoreHead('Analyse de la copie…');
  let res;
  try{ res = await api('/rest/v1/rpc/admin_restore_backup', { method:'POST', body: JSON.stringify({ p_tables: obj.tables, p_mode:'exact', p_dry:true }) }); }
  catch(e){
    let d = ''; try{ d = JSON.parse(e.detail || '{}').message || ''; }catch(_){}
    box.innerHTML = bkRestoreHead('') + `<div style="color:#ff8a8a;font-size:13px">${escapeHtml(/admin_restore_backup/.test(d) || e.status === 404 ? "La restauration n'est pas encore installée dans la base (script add-restauration.sql à lancer)." : 'Analyse impossible. ' + d)}</div><div style="margin-top:14px"><button class="btn btn-ghost" id="bkBack">← Retour</button></div>`;
    box.querySelector('#bkBack').onclick = () => { ov.remove(); openBackups(); }; return;
  }
  const T = res.tables || {};
  const rows = Object.keys(T).filter(k => T[k] && !T[k].skipped).map(k => ({ k, t: T[k] }));
  const changed = rows.filter(r => r.t.to_add || r.t.to_update || r.t.to_delete);
  const tot = res.totals || {};
  const lines = changed.map(r => {
    const parts = [];
    if(r.t.to_add) parts.push('+ ' + r.t.to_add + ' à remettre');
    if(r.t.to_update) parts.push(r.t.to_update + ' modifié' + (r.t.to_update > 1 ? 's' : ''));
    if(r.t.to_delete) parts.push('<span class="bk-del" style="color:#ff8a8a">− ' + r.t.to_delete + ' à supprimer</span>');
    return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px"><span>${escapeHtml(BK_LABELS[r.k] || r.k)}</span><span style="opacity:.85;text-align:right">${parts.join(' · ')}</span></div>`;
  }).join('');
  const nothing = !tot.to_add && !tot.to_update && !tot.to_delete;
  const nRows = rows.reduce((a, r) => a + (r.t.in_file || 0), 0);
  box.innerHTML = bkRestoreHead('Rien n\'est modifié à cette étape.') +
    bkStatusRow('#5ac77b', 'Copie : ' + escapeHtml(obj.created_at ? bkFmtDate(obj.created_at) : label), rows.length + ' tables · ' + nRows + ' lignes') +
    `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin:12px 2px 4px">Ce qui changerait</div>` +
    (nothing ? '<div style="opacity:.75;font-size:13.5px;padding:8px 0">Rien à restaurer : ta base est déjà identique à cette copie.</div>' : `<div id="bkLines">${lines}</div>`) +
    (nothing ? '' : `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin:14px 2px 6px">Mode</div>
      <label style="display:block;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:6px;cursor:pointer;font-size:13.5px"><input type="radio" name="bkMode" value="merge" checked> <b>Ajouter et mettre à jour</b> (recommandé)<div style="opacity:.65;font-size:12px;margin-left:22px">Remet ce qui manque. Ne supprime rien.</div></label>
      <label style="display:block;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;font-size:13.5px"><input type="radio" name="bkMode" value="exact"> <b>Remettre exactement comme la copie</b><div style="color:#ff8a8a;font-size:12px;margin-left:22px">Supprime ce qui a été créé après cette date (${tot.to_delete || 0} ligne${(tot.to_delete || 0) > 1 ? 's' : ''}). Les comptes ne sont jamais supprimés.</div></label>`) +
    `<div style="display:flex;gap:10px;margin-top:14px">${nothing ? '' : '<button class="btn btn-accent" id="bkNext" style="flex:1;justify-content:center">Continuer</button>'}<button class="btn btn-ghost" id="bkBack">← Retour</button></div>`;
  box.querySelector('#bkBack').onclick = () => { ov.remove(); openBackups(); };
  const sync = () => {
    const mode = (box.querySelector('input[name=bkMode]:checked') || {}).value;
    box.querySelectorAll('.bk-del').forEach(el => el.parentNode.parentNode.style.display = mode === 'exact' ? '' : 'none');
    // en mode « ajouter », une table qui n'a que des suppressions n'a rien à montrer
    box.querySelectorAll('#bkLines > div').forEach(row => { const onlyDel = row.querySelector('.bk-del') && row.querySelectorAll('span span').length === 1 && !/\+ |modifi/.test(row.textContent); if(onlyDel) row.style.display = mode === 'exact' ? '' : 'none'; });
  };
  box.querySelectorAll('input[name=bkMode]').forEach(r => r.onchange = sync); sync();
  const nx = box.querySelector('#bkNext');
  if(nx) nx.onclick = () => bkRestoreConfirm(ov, box, obj, (box.querySelector('input[name=bkMode]:checked') || {}).value || 'merge', tot, label);
}

function bkRestoreConfirm(ov, box, obj, mode, tot, label){
  const exact = mode === 'exact';
  box.innerHTML = bkRestoreHead('Dernière vérification.') +
    `<div style="border:1px solid #f0b34a;background:rgba(240,179,74,.08);border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:10px">Avant de commencer, une copie de l'état actuel est enregistrée automatiquement. Tu pourras revenir en arrière avec elle.</div>
     <div style="font-size:13.5px;margin-bottom:10px">${exact ? 'Mode : <b>exactement comme la copie</b> (' + (tot.to_delete || 0) + ' suppression(s))' : 'Mode : <b>ajouter et mettre à jour</b> (aucune suppression)'}</div>
     <div style="font-size:12px;opacity:.7;margin-bottom:6px">Tape RESTAURER pour confirmer</div>
     <input id="bkWord" type="text" autocomplete="off" autocapitalize="characters" style="width:100%;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:inherit;padding:12px;font:inherit;font-size:16px">
     <div id="bkMsg" style="font-size:13px;margin-top:10px"></div>
     <div style="display:flex;gap:10px;margin-top:12px"><button class="btn btn-accent" id="bkGo" style="flex:1;justify-content:center" disabled>♻️ Restaurer maintenant</button><button class="btn btn-ghost" id="bkCancel">Annuler</button></div>`;
  const w = box.querySelector('#bkWord'), go = box.querySelector('#bkGo'), msg = box.querySelector('#bkMsg');
  w.oninput = () => { go.disabled = w.value.trim().toUpperCase() !== 'RESTAURER'; };
  box.querySelector('#bkCancel').onclick = () => { ov.remove(); openBackups(); };
  go.onclick = async () => {
    go.disabled = true; w.disabled = true; msg.style.color = ''; msg.textContent = 'Copie de sécurité en cours…';
    let safety = '';
    try{ const r = await backupCall('safety'); const j = await r.json(); if(!r.ok || !j.ok) throw new Error('safety'); safety = j.file; }
    catch(e){ msg.style.color = '#ff8a8a'; msg.textContent = "Copie de sécurité impossible : la restauration n'a pas été lancée."; go.disabled = false; w.disabled = false; return; }
    msg.textContent = 'Restauration en cours…';
    try{
      const res = await api('/rest/v1/rpc/admin_restore_backup', { method:'POST', body: JSON.stringify({ p_tables: obj.tables, p_mode: mode, p_dry: false }) });
      bkRestoreDone(ov, box, res, safety);
    }catch(e){
      let d = ''; try{ d = JSON.parse(e.detail || '{}').message || ''; }catch(_){}
      msg.style.color = '#ff8a8a'; msg.textContent = 'Restauration impossible, rien n\'a été modifié. ' + d;
      go.disabled = false; w.disabled = false;
    }
  };
}

function bkRestoreDone(ov, box, res, safety){
  const tot = (res && res.totals) || {};
  const failed = tot.failed || 0;
  const errs = Object.keys((res && res.tables) || {}).filter(k => res.tables[k] && (res.tables[k].error || res.tables[k].failed)).map(k => `<div style="font-size:12px;opacity:.8;padding:2px 0">${escapeHtml(BK_LABELS[k] || k)} : ${escapeHtml(String(res.tables[k].failed || ''))} ligne(s) ignorée(s) — ${escapeHtml(String(res.tables[k].error || ''))}</div>`).join('');
  box.innerHTML = bkRestoreHead('Terminé.') +
    bkStatusRow(failed ? '#f0b34a' : '#5ac77b', (failed ? 'Restauration terminée avec des lignes ignorées' : 'Restauration terminée'), (tot.to_add || 0) + ' remise(s) · ' + (tot.to_update || 0) + ' modifiée(s) · ' + (tot.to_delete || 0) + ' supprimée(s)' + (failed ? ' · ' + failed + ' ignorée(s)' : '')) +
    (errs ? `<div style="margin:6px 0 10px">${errs}</div>` : '') +
    `<div style="font-size:12.5px;opacity:.75;margin-bottom:12px">Copie de sécurité : ${escapeHtml(safety)}<br>Recharge l'appli pour voir les données à jour.</div>
     <div style="display:flex;gap:10px"><button class="btn btn-accent" id="bkReload" style="flex:1;justify-content:center">Recharger l'appli</button><button class="btn btn-ghost" id="bkX2">Fermer</button></div>`;
  box.querySelector('#bkReload').onclick = () => location.reload();
  box.querySelector('#bkX2').onclick = () => ov.remove();
}
