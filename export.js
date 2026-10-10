/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// HS Coaching — export PDF en vrai fichier (tableaux), sans passer par la fenêtre d'impression.
// Téléchargement direct sur ordinateur ; sur téléphone, feuille de partage si disponible (sinon téléchargement).
// Les bibliothèques jsPDF + autoTable sont chargées à la demande depuis cdnjs ; si elles ne se chargent pas,
// l'appelant garde son ancien comportement (impression) via la valeur de retour false.
(function(){
  const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
  ];
  let loading = null;
  function loadScript(src){
    return new Promise((ok, ko) => {
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('load ' + src));
      document.head.appendChild(s);
    });
  }
  function ready(){
    if(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    if(!loading) loading = (async () => { for(const u of LIBS) await loadScript(u); })().catch(e => { loading = null; throw e; });
    return loading;
  }

  // Les polices PDF standard ne gèrent pas les emojis ni les espaces fines : on nettoie le texte.
  const MAP = { ' ':' ', ' ':' ', '’':"'", '‘':"'", '“':'"', '”':'"', '–':'-', '—':'-', '…':'...', '→':'->', '·':'-' };
  function clean(v){
    if(v == null) return '';
    return String(v).replace(/[  ’‘“”–—…→·]/g, c => MAP[c])
      .replace(/[\u{1F000}-\u{1FFFF}☀-➿️‍]/gu, '')
      .replace(/[^\x09\x0A\x20-\x7E¡-ÿ]/g, '').replace(/ {2,}/g, ' ').trim();
  }
  function num(n, d){ return clean(Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 0 : d })); }

  function isMobile(){
    try{ return window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }catch(e){ return false; }
  }
  async function deliver(blob, filename){
    if(isMobile() && navigator.canShare && navigator.share){
      try{
        const file = new File([blob], filename, { type: 'application/pdf' });
        if(navigator.canShare({ files: [file] })){ await navigator.share({ files: [file] }); return true; }
      }catch(e){ if(e && e.name === 'AbortError') return true; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
    return true;
  }

  // doc = { title, subtitle, filename, blocks:[ {type:'h', text} | {type:'p', text} | {type:'table', head:[], body:[[]], widths:[], align:[] } ] }
  async function pdf(doc){
    try{ await ready(); }catch(e){ console.error(e); return false; }
    try{
      const { jsPDF } = window.jspdf;
      const d = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = d.internal.pageSize.getWidth(), M = 40;
      let y = 50;
      if(doc.progress){ await progressReport(Object.assign({}, doc.progress, { doc: d })); d.addPage(); }
      const ensure = h => { if(y + h > d.internal.pageSize.getHeight() - 50){ d.addPage(); y = 50; } };
      d.setFont('helvetica', 'bold'); d.setFontSize(20); d.text(clean(doc.title), M, y); y += 20;
      if(doc.subtitle){ d.setFont('helvetica', 'normal'); d.setFontSize(10); d.setTextColor(110); d.text(clean(doc.subtitle), M, y); d.setTextColor(0); y += 10; }
      y += 12;
      (doc.blocks || []).forEach(b => {
        if(b.type === 'h'){
          ensure(46); y += 8;
          d.setFont('helvetica', 'bold'); d.setFontSize(b.small ? 11.5 : 14); d.setTextColor(0);
          d.text(clean(b.text), M, y); y += b.small ? 5 : 7;
          if(!b.small){ d.setDrawColor(200); d.line(M, y, W - M, y); y += 9; } else { y += 5; }
        } else if(b.type === 'p'){
          d.setFont('helvetica', 'normal'); d.setFontSize(10); d.setTextColor(90);
          const lines = d.splitTextToSize(clean(b.text), W - 2 * M);
          ensure(lines.length * 13 + 6); d.text(lines, M, y + 8); y += lines.length * 13 + 6; d.setTextColor(0);
        } else if(b.type === 'table'){
          const colStyles = {};
          (b.align || []).forEach((al, i) => { if(al) colStyles[i] = Object.assign(colStyles[i] || {}, { halign: al }); });
          (b.widths || []).forEach((w, i) => { if(w) colStyles[i] = Object.assign(colStyles[i] || {}, { cellWidth: w }); });
          d.autoTable({
            startY: y, margin: { left: M, right: M, bottom: 50 },
            head: [(b.head || []).map(clean)], body: (b.body || []).map(r => r.map(clean)),
            theme: 'grid', styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, lineColor: [210, 210, 210], lineWidth: 0.4, textColor: 20 },
            headStyles: { fillColor: [30, 30, 34], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [247, 247, 248] }, columnStyles: colStyles
          });
          y = d.lastAutoTable.finalY + 14;
        }
      });
      const pages = d.internal.getNumberOfPages();
      for(let i = 1; i <= pages; i++){
        d.setPage(i); d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(140);
        d.text('HS Coaching - page ' + i + '/' + pages, W - M, d.internal.pageSize.getHeight() - 24, { align: 'right' });
      }
      await deliver(d.output('blob'), doc.filename || 'export.pdf');
      return true;
    }catch(e){ console.error(e); return false; }
  }

  function fileName(prefix, who){
    const slug = clean(who || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return prefix + (slug ? '-' + slug : '') + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.pdf';
  }

  function durTxt(s){
    if(!s.completed_at) return '';
    const sec = s.declared_seconds != null ? s.declared_seconds : Math.round((new Date(s.completed_at) - new Date(s.started_at)) / 1000);
    if(!(sec > 2)) return '';
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? h + ' h ' + String(m).padStart(2, '0') : (m ? m + ' min' : sec + ' s');
  }
  // Texte d'une série : durée (ex. « 20 min ») et/ou reps · charge
  function durFmt(sec){
    sec = Math.round(sec || 0); const m = Math.floor(sec / 60), r = sec % 60;
    return m ? (r ? m + ' min ' + String(r).padStart(2, '0') + ' s' : m + ' min') : r + ' s';
  }
  function setTxt(l){
    const parts = [];
    if(l.duration_seconds) parts.push(durFmt(l.duration_seconds));
    if(l.distance_km){ parts.push(String(l.distance_km).replace('.', ',') + ' km'); if(l.duration_seconds){ const p = Math.round(l.duration_seconds / l.distance_km); parts.push(Math.floor(p/60) + ':' + String(p%60).padStart(2, '0') + ' /km'); } }
    if(l.reps != null) parts.push(l.reps + ' reps');
    if(l.charge != null) parts.push(l.charge + ' kg');
    return parts.join(' · ') || '–';
  }
  const vol1 = l => (!l.duration_seconds && l.reps && l.charge) ? l.reps * l.charge : 0;
  // Blocs « séances réalisées » : un tableau récapitulatif + le détail série par série de chaque séance
  function sessionBlocks(sessions, logs){
    const by = {};
    (logs || []).forEach(l => { (by[l.session_id] = by[l.session_id] || []).push(l); });
    const list = (sessions || []).filter(s => s.completed_at || by[s.id]).sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    if(!list.length) return [{ type: 'p', text: 'Aucune séance enregistrée.' }];
    const stat = s => {
      const ls = (by[s.id] || []).filter(l => l.reps != null || l.charge != null || l.duration_seconds);
      const vol = ls.reduce((a, l) => a + vol1(l), 0);
      return { ls, vol };
    };
    const fd = (s, long) => new Date(s.started_at).toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
    const blocks = [{ type: 'h', text: 'Récapitulatif - ' + list.length + ' séance' + (list.length > 1 ? 's' : '') }];
    blocks.push({ type: 'table', head: ['Date', 'Programme', 'Séance', 'Durée', 'Séries', 'Volume (kg)'],
      body: list.map(s => { const st = stat(s); return [fd(s), (s.programs && s.programs.name) || 'Séance libre', s.day_label || '', durTxt(s), String(st.ls.length), st.vol ? num(st.vol) : '']; }),
      align: [null, null, null, 'right', 'right', 'right'] });
    blocks.push({ type: 'h', text: 'Détail des séances' });
    list.forEach(s => {
      const st = stat(s);
      const exs = []; const byEx = {};
      st.ls.slice().sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at) || a.set_number - b.set_number).forEach(l => {
        const n = (l.exercises && l.exercises.name) || 'Exercice';
        if(!byEx[n]){ byEx[n] = []; exs.push(n); }
        byEx[n].push(l);
      });
      const meta = [durTxt(s) ? 'Durée : ' + durTxt(s) : '', st.vol ? 'Volume : ' + num(st.vol) + ' kg' : '', s.source === 'manual' ? 'Saisie après coup' : ''].filter(Boolean).join(' - ');
      blocks.push({ type: 'h', small: true, text: fd(s, true) + ' - ' + ((s.programs && s.programs.name) || 'Séance libre') + (s.day_label ? ' - ' + s.day_label : '') });
      if(meta) blocks.push({ type: 'p', text: meta });
      const body = [];
      exs.forEach(n => byEx[n].sort((a, b) => a.set_number - b.set_number).forEach((l, i) => body.push([i === 0 ? n : '', String(l.set_number), l.reps != null ? String(l.reps) : '', l.duration_seconds ? durFmt(l.duration_seconds) : '', l.charge != null ? num(l.charge, 1) : '', vol1(l) ? num(vol1(l)) : ''])));
      if(body.length) blocks.push({ type: 'table', head: ['Exercice', 'Série', 'Reps', 'Durée', 'Charge (kg)', 'Volume (kg)'], body, align: [null, 'right', 'right', 'right', 'right', 'right'], widths: [190] });
      else blocks.push({ type: 'p', text: 'Aucune série enregistrée pour cette séance.' });
    });
    return blocks;
  }


  // ---- Rapport de progression (2 pages : résumé + exercices), graphiques dessinés en vectoriel ----
  // opts = { who, periodDays (0 = tout), sessions:[{started_at,date_unknown}], rows:[{exercise_id,charge,reps,duration_seconds,session_id,sessions:{started_at},exercises:{name}}] }
  async function progressReport(opts){
    try{ await ready(); }catch(e){ console.error(e); return false; }
    try{
      const { jsPDF } = window.jspdf;
      const d = opts.doc || new jsPDF({ unit: 'pt', format: 'a4' });
      const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight(), M = 48, CW = W - 2*M;
      const ACC = [31, 79, 216], INK = [17, 17, 17], MUT = [110, 110, 110], LINE = [225, 225, 225], PALE = [201, 207, 221];
      const days = opts.periodDays || 0, now = Date.now(), cut = days ? now - days * 864e5 : 0;
      const inWin = t => !cut || new Date(t).getTime() >= cut;
      const sessions = (opts.sessions || []).filter(s => inWin(s.started_at));
      const rows = (opts.rows || []).filter(r => r.sessions && r.sessions.started_at && inWin(r.sessions.started_at));
      const periodTxt = days === 30 ? '1 dernier mois' : days === 90 ? '3 derniers mois' : days === 180 ? '6 derniers mois' : 'depuis le début';
      const dateTxt = new Date().toLocaleDateString('fr-FR');
      // — calculs —
      const dated = sessions.filter(s => !s.date_unknown);
      let spanWeeks = days ? days / 7 : 1;
      if(!days && dated.length){ const t0 = Math.min(...dated.map(s => new Date(s.started_at).getTime())); spanWeeks = Math.max(1, (now - t0) / (7 * 864e5)); }
      const perWeek = dated.length ? dated.length / spanWeeks : 0;
      const vol = {}; rows.forEach(r => { if(!r.duration_seconds && r.reps && r.charge) vol[r.session_id] = (vol[r.session_id] || 0) + r.reps * r.charge; });
      const totalVol = Object.values(vol).reduce((a, b) => a + b, 0);
      const wk = t => { const x = new Date(t); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0,0,0,0); return x.getTime(); };
      const cnt = {}; (opts.sessions || []).forEach(s => { if(!s.date_unknown){ const k = wk(s.started_at); cnt[k] = (cnt[k] || 0) + 1; } });
      const weeks = []; for(let i = 7; i >= 0; i--){ const k = wk(now - i * 7 * 864e5); weeks.push({ k, n: cnt[k] || 0 }); }
      const volSes = sessions.filter(s => vol[s.id]).sort((a, b) => new Date(a.started_at) - new Date(b.started_at)).slice(-12).map(s => vol[s.id]);
      const byEx = {};
      rows.forEach(r => { if(r.charge == null || r.duration_seconds) return; const e = byEx[r.exercise_id] = byEx[r.exercise_id] || { name: (r.exercises && r.exercises.name) || 'Exercice', by: {} };
        const c = e.by[r.session_id]; if(!c || r.charge > c.charge) e.by[r.session_id] = { t: new Date(r.sessions.started_at).getTime(), charge: r.charge }; });
      const exs = Object.values(byEx).map(e => { const pts = Object.values(e.by).sort((a, b) => a.t - b.t); const f = pts[0].charge, l = pts[pts.length-1].charge;
        return { name: e.name, pts: pts.map(p => p.charge), f, l, diff: Math.round((l - f) * 10) / 10, pct: f > 0 ? (l - f) / f : 0 }; }).filter(e => e.pts.length);
      const prog = exs.filter(e => e.pts.length >= 2 && e.diff > 0).sort((a, b) => b.pct - a.pct);
      const top = prog.slice(0, 5), topN = new Set(top.map(e => e.name));
      const others = exs.filter(e => !topN.has(e.name)).sort((a, b) => b.pts.length - a.pts.length);
      const nf = (n, dd) => num(n, dd == null ? 0 : dd);
      // — dessin —
      const head = () => {
        d.setTextColor(...INK); d.setFont('helvetica', 'bold'); d.setFontSize(9); d.text('HS COACHING', M, 44, { charSpace: 1.5 });
        d.setFontSize(20); d.text(clean('Rapport de progression - ' + (opts.who || '')), M, 68);
        d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.setTextColor(...MUT); d.text(clean('Période : ' + periodTxt + ' - export du ' + dateTxt), M, 84);
        d.setDrawColor(...INK); d.setLineWidth(1.4); d.line(M, 94, W - M, 94);
      };
      const h2 = (t, y) => { d.setFont('helvetica', 'bold'); d.setFontSize(10); d.setTextColor(...INK); d.text(clean(t).toUpperCase(), M, y, { charSpace: 0.6 }); };
      const poly = (vals, x, y, w, h) => {
        const mn = Math.min(...vals), mx = Math.max(...vals), r = (mx - mn) || 1;
        const pts = vals.map((v, i) => [x + (vals.length > 1 ? i * w / (vals.length - 1) : w / 2), y + h - (v - mn) / r * h]);
        d.setDrawColor(...ACC); d.setLineWidth(1.6); for(let i = 1; i < pts.length; i++) d.line(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1]);
        d.setFillColor(...ACC); pts.forEach(p => d.circle(p[0], p[1], 2.2, 'F'));
      };
      head();
      // KPIs
      const kp = [[String(dated.length + sessions.filter(s => s.date_unknown).length), 'séances'], [nf(perWeek, 1), 'séances / semaine'], [nf(totalVol) + ' kg', 'volume soulevé']];
      const kw = (CW - 2 * 10) / 3; let y = 114;
      kp.forEach((k, i) => { const x = M + i * (kw + 10); d.setDrawColor(...LINE); d.setLineWidth(0.8); d.roundedRect(x, y, kw, 54, 5, 5);
        d.setFont('helvetica', 'bold'); d.setFontSize(20); d.setTextColor(...INK); d.text(clean(k[0]), x + 12, y + 28);
        d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(...MUT); d.text(clean(k[1]), x + 12, y + 44); });
      // Régularité
      y = 206; h2('Régularité - 8 dernières semaines', y); y += 14;
      const base = y + 110, bw = (CW - 8 * 14) / 8, maxN = Math.max(3, ...weeks.map(w => w.n)), unit = 90 / maxN;
      weeks.forEach((w, i) => { const x = M + 7 + i * (bw + 14), bh = Math.max(w.n * unit, w.n ? 3 : 0);
        d.setFillColor(...(w.n >= 2 ? ACC : PALE)); if(bh) d.roundedRect(x, base - bh, bw, bh, 2, 2, 'F');
        d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(...INK); if(w.n) d.text(String(w.n), x + bw / 2, base - bh - 4, { align: 'center' });
        d.setTextColor(...MUT); d.setFontSize(8); d.text(new Date(w.k).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), x + bw / 2, base + 12, { align: 'center' }); });
      d.setDrawColor(150); d.setLineWidth(0.6); d.setLineDashPattern([3, 3], 0); d.line(M, base - 2 * unit, W - M, base - 2 * unit); d.setLineDashPattern([], 0);
      d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(...MUT); d.text('--- objectif : 2 par semaine', W - M, y - 14 - 0, { align: 'right' });
      // Volume
      y = base + 44; h2('Volume soulevé par séance', y); y += 12;
      if(volSes.length >= 2){ poly(volSes, M + 6, y + 6, CW - 12, 100);
        d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(...MUT); d.text('première séance', M + 6, y + 124); d.text('dernière', W - M - 6, y + 124, { align: 'right' });
        d.text(clean('Volume = répétitions × charge, cumulé sur toutes les séries d\'une séance.'), M, y + 140);
      } else { d.setFont('helvetica', 'normal'); d.setFontSize(10); d.setTextColor(...MUT); d.text('Pas assez de séances avec poids et répétitions pour tracer une courbe.', M, y + 20); }
      // Mot d'encouragement selon les résultats
      {
        const fn = (opts.who && opts.who !== 'Mon suivi') ? String(opts.who).trim().split(/\s+/)[0] : '';
        const hi = fn ? ', ' + fn : '';
        const b0 = top[0], strong = b0 && b0.pct >= 0.2;
        const regOk = perWeek >= 2, regMid = perWeek >= 1;
        const bigVol = volSes.length >= 3 && volSes[volSes.length-1] > volSes[0] * 1.15;
        let t1;
        if(strong) t1 = 'Bravo' + hi + ' ! ' + b0.name + ' : +' + nf(b0.diff, 1) + ' kg (+' + Math.round(b0.pct * 100) + ' %). C\'est le fruit de ton travail.';
        else if(b0) t1 = 'Belle progression' + hi + ' : ' + b0.name + ' passe de ' + nf(b0.f, 1) + ' à ' + nf(b0.l, 1) + ' kg. Chaque kilo compte.';
        else if(dated.length >= 3) t1 = 'Tu as posé de bonnes bases' + hi + '. Les charges vont bientôt suivre : continue à les noter.';
        else t1 = 'Premier pas réussi' + hi + ' ! Les graphiques se rempliront au fil de tes séances.';
        let t2;
        if(regOk) t2 = 'Ta régularité (' + nf(perWeek, 1) + ' séances par semaine) est exemplaire' + (bigVol ? ' et ton volume ne cesse de monter' : '') + '. Continue comme ça !';
        else if(regMid) t2 = 'Avec une séance de plus par semaine, les résultats vont s\'accélérer. Tu es sur la bonne voie.';
        else t2 = 'L\'important, c\'est de rester dans le rythme : une séance cette semaine et c\'est reparti !';
        d.setFont('helvetica', 'normal'); d.setFontSize(11);
        const lines = d.splitTextToSize(clean(t1 + ' ' + t2), CW - 36);
        const by = y + 168, bh = 24 + lines.length * 14;
        d.setFillColor(244, 247, 255); d.roundedRect(M, by, CW, bh, 6, 6, 'F'); d.setFillColor(...ACC); d.rect(M, by, 4, bh, 'F');
        d.setFont('helvetica', 'bold'); d.setFontSize(9); d.setTextColor(...ACC); d.text('LE MOT DE TON COACH', M + 16, by + 16, { charSpace: 0.8 });
        d.setFont('helvetica', 'normal'); d.setFontSize(11); d.setTextColor(...INK); d.text(lines, M + 16, by + 34);
      }
      // Page 2
      d.addPage(); head(); y = 122; h2('Top 5 des progressions', y); y += 10;
      if(!top.length){ d.setFont('helvetica', 'normal'); d.setFontSize(10); d.setTextColor(...MUT); d.text('Pas encore de progression mesurable sur cette période (2 séances avec charge nécessaires par exercice).', M, y + 20); y += 36; }
      top.forEach(e => { const rh = 52;
        d.setFont('helvetica', 'bold'); d.setFontSize(11); d.setTextColor(...INK); d.text(clean(e.name), M, y + 20, { maxWidth: 200 });
        d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(...MUT); d.text(clean(nf(e.f, 1) + ' -> ' + nf(e.l, 1) + ' kg'), M, y + 36);
        poly(e.pts, M + 250, y + 12, 150, 26);
        d.setFont('helvetica', 'bold'); d.setFontSize(12); d.setTextColor(...ACC); d.text(clean('+' + nf(e.diff, 1) + ' kg'), W - M, y + 22, { align: 'right' });
        d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(...MUT); d.text('+' + Math.round(e.pct * 100) + ' %', W - M, y + 36, { align: 'right' });
        d.setDrawColor(...LINE); d.setLineWidth(0.6); d.line(M, y + rh - 4, W - M, y + rh - 4); y += rh; });
      if(others.length){
        y += 14; h2('Autres exercices', y);
        d.autoTable({ startY: y + 8, margin: { left: M, right: M, bottom: 50 }, theme: 'plain', styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: INK, lineColor: LINE, lineWidth: { bottom: 0.5 } },
          headStyles: { fontStyle: 'normal', textColor: MUT, fontSize: 8.5 },
          head: [['Exercice', 'Première -> dernière charge', 'Écart']],
          body: others.map(e => [clean(e.name), clean(nf(e.f, 1) + ' -> ' + nf(e.l, 1) + ' kg'), e.pts.length < 2 ? '1 séance' : (e.diff > 0 ? '+' + nf(e.diff, 1) + ' kg' : (e.diff < 0 ? nf(e.diff, 1) + ' kg' : '='))]),
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } } });
      }
      if(opts.doc){ d.setTextColor(0); return true; }
      const pages = d.internal.getNumberOfPages();
      for(let i = 1; i <= pages; i++){ d.setPage(i); d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(140);
        d.text('HS Coaching - Régularité & dépassement de soi', M, H - 24); d.text('page ' + i + '/' + pages, W - M, H - 24, { align: 'right' }); }
      await deliver(d.output('blob'), fileName('rapport-progression', opts.who));
      return true;
    }catch(e){ console.error(e); return false; }
  }

  window.HSExport = { pdf, progressReport, clean, num, fileName, ready, sessionBlocks, durTxt, setTxt, durFmt };
})();
