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
  // Blocs « séances réalisées » : un tableau récapitulatif + le détail série par série de chaque séance
  function sessionBlocks(sessions, logs){
    const by = {};
    (logs || []).forEach(l => { (by[l.session_id] = by[l.session_id] || []).push(l); });
    const list = (sessions || []).filter(s => s.completed_at || by[s.id]).sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    if(!list.length) return [{ type: 'p', text: 'Aucune séance enregistrée.' }];
    const stat = s => {
      const ls = (by[s.id] || []).filter(l => l.reps != null || l.charge != null);
      const vol = ls.reduce((a, l) => a + ((l.reps && l.charge) ? l.reps * l.charge : 0), 0);
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
      exs.forEach(n => byEx[n].sort((a, b) => a.set_number - b.set_number).forEach((l, i) => body.push([i === 0 ? n : '', String(l.set_number), l.reps != null ? String(l.reps) : '', l.charge != null ? num(l.charge, 1) : '', (l.reps && l.charge) ? num(l.reps * l.charge) : ''])));
      if(body.length) blocks.push({ type: 'table', head: ['Exercice', 'Série', 'Reps', 'Charge (kg)', 'Volume (kg)'], body, align: [null, 'right', 'right', 'right', 'right'], widths: [190] });
      else blocks.push({ type: 'p', text: 'Aucune série enregistrée pour cette séance.' });
    });
    return blocks;
  }

  window.HSExport = { pdf, clean, num, fileName, ready, sessionBlocks, durTxt };
})();
