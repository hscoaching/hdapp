// Annuaire des coachs : le client / visiteur choisit un coach dans une liste de fiches, puis lui envoie une demande.
// window.HSCoaches.openDirectory({ fetcher, onSent })  — fetcher(path, init) doit renvoyer une Response (avec la clé API et, si connecté, le jeton).
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cache = null;

  async function listCoaches(fetcher){
    const r = await fetcher('/rest/v1/coach_profiles?select=user_id,display_name,headline,bio,specialties,photo_url&listed=eq.true&order=display_name');
    if(!r.ok) throw new Error('coaches_load_failed');
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }
  function ensureCss(){
    if(document.getElementById('hsCoachCss')) return;
    const st = document.createElement('style'); st.id = 'hsCoachCss';
    st.textContent = `
      .hsc-ov{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1300;display:flex;align-items:flex-end;justify-content:center;overflow:auto}
      .hsc-sheet{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--surface,#16171a);border:1px solid var(--line,#2c2c30);border-radius:20px 20px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom,0px))}
      @media(min-width:640px){.hsc-ov{align-items:center;padding:20px}.hsc-sheet{border-radius:20px}}
      .hsc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
      .hsc-top h2{margin:0;font-size:22px}
      .hsc-x{background:transparent;border:1px solid var(--line,#2c2c30);color:inherit;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;flex:none}
      .hsc-lede{font-size:14px;opacity:.75;margin:0 0 14px}
      .hsc-card{border:1px solid var(--line,#2c2c30);border-radius:16px;padding:14px;margin-bottom:12px;background:var(--surface-2,#1d1e22)}
      .hsc-head{display:flex;gap:12px;align-items:center}
      .hsc-ph{width:56px;height:56px;border-radius:50%;object-fit:cover;flex:none;background:#333}
      .hsc-ini{width:56px;height:56px;border-radius:50%;flex:none;background:var(--accent,#d9ff3f);color:#111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
      .hsc-name{font-weight:800;font-size:17px}
      .hsc-hl{font-size:13px;opacity:.75}
      .hsc-bio{font-size:14px;line-height:1.45;margin:10px 0;white-space:pre-line}
      .hsc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
      .hsc-tag{font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--line,#2c2c30)}
      .hsc-btn{width:100%;padding:12px;border-radius:12px;border:0;background:var(--accent,#d9ff3f);color:#111;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}
      .hsc-btn.ghost{background:transparent;color:inherit;border:1px solid var(--line,#2c2c30)}
      .hsc-f{display:block;margin:12px 0 4px;font-size:13px;opacity:.8}
      .hsc-in{width:100%;box-sizing:border-box;background:var(--surface-2,#1d1e22);border:1px solid var(--line,#2c2c30);border-radius:10px;color:inherit;padding:12px;font-size:16px;font-family:inherit}
      textarea.hsc-in{min-height:90px;resize:vertical}`;
    document.head.appendChild(st);
  }
  function close(){ const o = document.getElementById('hsCoachOv'); if(o) o.remove(); }
  function shell(inner){
    ensureCss(); close();
    const ov = document.createElement('div'); ov.className = 'hsc-ov'; ov.id = 'hsCoachOv';
    ov.onclick = e => { if(e.target === ov) close(); };
    ov.innerHTML = `<div class="hsc-sheet">${inner}</div>`;
    document.body.appendChild(ov);
    const x = ov.querySelector('.hsc-x'); if(x) x.onclick = close;
    return ov;
  }
  function avatar(c){
    const ini = esc((c.display_name || '?').trim().charAt(0).toUpperCase());
    return c.photo_url ? `<img class="hsc-ph" src="${esc(c.photo_url)}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;hsc-ini&quot;>${ini}</div>'">` : `<div class="hsc-ini">${ini}</div>`;
  }

  async function openDirectory(opts){
    const fetcher = opts.fetcher;
    shell(`<div class="hsc-top"><h2>Choisis ton coach</h2><button class="hsc-x" aria-label="Fermer">✕</button></div><div class="hsc-lede">Chargement…</div>`);
    let coaches = [];
    try{ coaches = await listCoaches(fetcher); cache = coaches; }catch(e){ coaches = cache || []; }
    if(!coaches.length){ return openForm(opts, null); }
    const ov = shell(`
      <div class="hsc-top"><h2>Choisis ton coach</h2><button class="hsc-x" aria-label="Fermer">✕</button></div>
      <p class="hsc-lede">Lis les présentations, puis choisis celui ou celle avec qui tu veux travailler. Sans engagement.</p>
      ${coaches.map((c, i) => `<div class="hsc-card">
        <div class="hsc-head">${avatar(c)}<div style="min-width:0"><div class="hsc-name">${esc(c.display_name)}</div>${c.headline ? `<div class="hsc-hl">${esc(c.headline)}</div>` : ''}</div></div>
        ${c.bio ? `<div class="hsc-bio">${esc(c.bio)}</div>` : ''}
        ${c.specialties ? `<div class="hsc-tags">${c.specialties.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8).map(s => `<span class="hsc-tag">${esc(s)}</span>`).join('')}</div>` : ''}
        <button class="hsc-btn" data-i="${i}">Contacter ${esc(c.display_name)}</button></div>`).join('')}
      <button class="hsc-btn ghost" id="hscAny">Je ne sais pas, laissez le premier coach disponible me répondre</button>`);
    ov.querySelectorAll('.hsc-btn[data-i]').forEach(b => b.onclick = () => openForm(opts, coaches[+b.dataset.i]));
    ov.querySelector('#hscAny').onclick = () => openForm(opts, null);
  }

  function openForm(opts, coach){
    const logged = !!opts.loggedIn;
    const ov = shell(`
      <div class="hsc-top"><h2>${coach ? 'Contacter ' + esc(coach.display_name) : 'Contacter un coach'}</h2><button class="hsc-x" aria-label="Fermer">✕</button></div>
      <p class="hsc-lede">${logged ? 'Tu es connecté : si le coach accepte, il te suit directement dans l\'appli (programmes, discussion).' : 'Laisse tes coordonnées, le coach te recontacte. Aucun compte requis.'}</p>
      <div style="display:flex;gap:10px"><div style="flex:1;min-width:0"><label class="hsc-f">Prénom</label><input class="hsc-in" id="hscFirst" type="text" placeholder="Ton prénom" autocomplete="given-name"></div>
      <div style="flex:1;min-width:0"><label class="hsc-f">Nom</label><input class="hsc-in" id="hscLast" type="text" placeholder="Ton nom" autocomplete="family-name"></div></div>
      <label class="hsc-f">Téléphone ou email</label><input class="hsc-in" id="hscContact" type="text" placeholder="06 12 34 56 78 ou email" value="${esc(opts.email || '')}">
      <label class="hsc-f">Message (optionnel)</label><textarea class="hsc-in" id="hscMsg" placeholder="Ton objectif, tes dispos..."></textarea>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="hsc-btn" id="hscSend">Envoyer la demande</button></div>
      ${opts.fromList !== false && (cache && cache.length) ? '<button class="hsc-btn ghost" id="hscBack" style="margin-top:10px">← Voir les coachs</button>' : ''}`);
    const back = ov.querySelector('#hscBack'); if(back) back.onclick = () => openDirectory(opts);
    ov.querySelector('#hscSend').onclick = async () => {
      const first = ov.querySelector('#hscFirst').value.trim(), last = ov.querySelector('#hscLast').value.trim(), name = (first + ' ' + last).trim(), contact = ov.querySelector('#hscContact').value.trim(), msg = ov.querySelector('#hscMsg').value.trim();
      if(!first || !last || !contact){ alert('Prénom, nom et contact requis'); return; }
      const btn = ov.querySelector('#hscSend'); btn.disabled = true;
      const isEmail = contact.includes('@');
      try{
        const r = await opts.fetcher('/rest/v1/coach_contact_requests', { method:'POST', headers:{ Prefer:'return=minimal' },
          body: JSON.stringify({ name, email: isEmail ? contact : null, phone: isEmail ? null : contact, message: msg || null, coach_id: coach ? coach.user_id : null }) });
        if(!r.ok) throw new Error('send_failed');
      }catch(e){ btn.disabled = false; alert('Impossible d\'envoyer la demande. Réessaie.'); return; }
      close();
      if(opts.onSent) opts.onSent(coach);
    };
  }

  window.HSCoaches = { openDirectory, listCoaches };
})();
