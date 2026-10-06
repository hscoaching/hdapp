// HS Coaching — système de badges (régularité d'abord).
// Calculé à partir des séances terminées d'un client : aucune table supplémentaire.
// Utilisé par compte.html (vue client), programmes.html (fin de séance) et admin.html (vue coach).
(function(){
  const WEEKLY_GOAL = 2;          // séances par semaine pour valider une semaine
  const JOKER_EVERY = 4;          // 1 semaine « joker » (qui ne casse pas la série) toutes les 4 semaines
  const COMEBACK_DAYS = 14;       // pause d'au moins 14 jours avant un « retour en force »

  const DEFS = [
    { id:'s1',   group:'Séances',  icon:'👟', title:'Premier pas',          desc:'Ta première séance terminée',        kind:'sessions', target:1 },
    { id:'s10',  group:'Séances',  icon:'🎯', title:'Habitué',              desc:'10 séances terminées',               kind:'sessions', target:10 },
    { id:'s25',  group:'Séances',  icon:'⭐', title:'Assidu',               desc:'25 séances terminées',               kind:'sessions', target:25 },
    { id:'s50',  group:'Séances',  icon:'🏅', title:'Pilier',               desc:'50 séances terminées',               kind:'sessions', target:50 },
    { id:'s100', group:'Séances',  icon:'👑', title:'Centurion',            desc:'100 séances terminées',              kind:'sessions', target:100 },
    { id:'s250', group:'Séances',  icon:'🔱', title:'Légende',              desc:'250 séances terminées',              kind:'sessions', target:250 },
    { id:'w2',   group:'Régularité', icon:'🔥', title:'Dans le rythme',     desc:`2 semaines d'affilée à ${WEEKLY_GOAL} séances`,  kind:'streak', target:2 },
    { id:'w4',   group:'Régularité', icon:'⚡', title:'Mois parfait',       desc:'4 semaines d\'affilée',              kind:'streak', target:4 },
    { id:'w8',   group:'Régularité', icon:'🚀', title:'Machine',            desc:'8 semaines d\'affilée',              kind:'streak', target:8 },
    { id:'w12',  group:'Régularité', icon:'💎', title:'Inarrêtable',        desc:'12 semaines d\'affilée',             kind:'streak', target:12 },
    { id:'w26',  group:'Régularité', icon:'🌋', title:'Un semestre de feu', desc:'26 semaines d\'affilée',             kind:'streak', target:26 },
    { id:'w52',  group:'Régularité', icon:'🏛️', title:'Une année entière',  desc:'52 semaines d\'affilée',             kind:'streak', target:52 },
    { id:'cb',   group:'Retour en force', icon:'💪', title:'Retour en force',   desc:`Une séance après ${COMEBACK_DAYS} jours ou plus de pause`, kind:'comeback', bonus:true, target:1 },
    { id:'t1',   group:'Poids soulevé', tag:'muscu', icon:'🏋️', title:'1 tonne',         desc:'1 000 kg soulevés au total',         bonus:true, kind:'tonnage', target:1000 },
    { id:'t10',  group:'Poids soulevé', tag:'muscu', icon:'🦾', title:'10 tonnes',       desc:'10 000 kg soulevés au total',        bonus:true, kind:'tonnage', target:10000 },
    { id:'t50',  group:'Poids soulevé', tag:'muscu', icon:'🏗️', title:'50 tonnes',       desc:'50 000 kg soulevés au total',        bonus:true, kind:'tonnage', target:50000 },
    { id:'t100', group:'Poids soulevé', tag:'muscu', icon:'🏔️', title:'100 tonnes',      desc:'100 000 kg soulevés au total',       bonus:true, kind:'tonnage', target:100000 },
    { id:'p1',   group:'Records', tag:'muscu', icon:'🏆', title:'Record battu',      desc:'Une charge supérieure à ta meilleure marque', bonus:true, kind:'pr', target:1 },
    { id:'p10',  group:'Records', tag:'muscu', icon:'🥇', title:'Chasseur de records', desc:'10 records battus',               bonus:true, kind:'pr', target:10 },
    { id:'c1',   group:'Cardio', tag:'cardio', icon:'⏱️', title:'Premier souffle',  desc:'1 h de cardio au total',             kind:'cardiotime', bonus:true, target:3600 },
    { id:'c10',  group:'Cardio', tag:'cardio', icon:'🏃', title:'Endurant',         desc:'10 h de cardio au total',            kind:'cardiotime', bonus:true, target:36000 },
    { id:'c50',  group:'Cardio', tag:'cardio', icon:'🚴', title:'Grand fond',       desc:'50 h de cardio au total',            kind:'cardiotime', bonus:true, target:180000 },
    { id:'c100', group:'Cardio', tag:'cardio', icon:'🫀', title:'Cœur d\'acier',    desc:'100 h de cardio au total',           kind:'cardiotime', bonus:true, target:360000 },
    { id:'cs10', group:'Cardio', tag:'cardio', icon:'🌬️', title:'Cardio régulier',  desc:'10 séances avec au moins 10 min de cardio', kind:'cardiosessions', bonus:true, target:10 },
    { id:'cs25', group:'Cardio', tag:'cardio', icon:'🔄', title:'Cardio fidèle',    desc:'25 séances avec au moins 10 min de cardio', kind:'cardiosessions', bonus:true, target:25 }
  ];

  // Niveaux : calculés avec les badges principaux (séances + régularité), jamais avec les bonus
  const TIERS = [
    { n:'Recrue',  at:0,  t:0 }, { n:'Bronze', at:1,  t:1 }, { n:'Argent', at:3,  t:2 },
    { n:'Or',      at:6,  t:3 }, { n:'Platine', at:9, t:4 }, { n:'Diamant', at:12, t:5 }
  ];
  const TIER_NAMES = ['', 'Bronze', 'Argent', 'Or', 'Platine'];
  // Titres par profil (même palier = même difficulté, vocabulaire du domaine)
  const LADDERS = {
    muscu:  ['Recrue', 'Initié', 'Costaud', 'Athlète de force', 'Colosse', 'Titan'],
    cardio: ['Recrue', 'Marcheur', 'Joggeur', 'Coureur', 'Fondeur', 'Marathonien'],
    hybrid: ['Recrue', 'Touche-à-tout', 'Polyvalent', 'Athlète complet', 'Hybride confirmé', 'Athlète hybride']
  };
  const PROFILE_NAMES = { muscu: 'Force', cardio: 'Endurance', hybrid: 'Hybride' };
  function profileOf(st){
    const tot = st.total || 0, cs = st.cardioSessions || 0, ms = st.muscuSessions || 0;
    if(!st.hasCardio || !tot) return 'muscu';
    if(cs >= 3 && ms >= 3 && Math.min(cs, ms) / tot >= 0.25) return 'hybrid';
    return cs > ms ? 'cardio' : 'muscu';
  }
  function levelOf(pts, profile){
    let i = 0; TIERS.forEach((t, k) => { if(pts >= t.at) i = k; });
    const lad = LADDERS[profile] || LADDERS.muscu;
    return { name: lad[i], tierName: TIERS[i].n, t: TIERS[i].t, pts, profile, profileName: PROFILE_NAMES[profile] || '', ladder: lad, next: TIERS[i+1] ? { at: TIERS[i+1].at, n: lad[i+1], tierName: TIERS[i+1].n } : null, tiers: TIERS };
  }
  function famTier(done, total){ if(!done) return 0; const f = done / total; return f >= 1 ? 4 : f >= .7 ? 3 : f >= .4 ? 2 : 1; }

  // Lundi (heure locale) de la semaine d'une date, exprimé en numéro de semaine absolu
  function weekIndex(d){
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7;                 // lundi = 0
    x.setDate(x.getDate() - day);
    return Math.round((x.getTime() - new Date(1970,0,5).getTime()) / (7*86400000));
  }

  // Séances comptées = terminées + éligibles. data = { sessions:[{id,started_at,completed_at}], logs:[{session_id,exercise_id,reps,charge}] }
  function prepare(data){
    // Seules les séances « éligibles » (faites en direct, assez longues, 1 par jour) comptent pour les badges
    const sessions = (data.sessions || []).filter(s => s && s.completed_at && s.started_at && s.badge_eligible === true)
      .map(s => ({ id:s.id, t:new Date(s.started_at) }))
      .sort((a,b) => a.t - b.t);
    const ids = new Set(sessions.map(s => s.id));
    const hasLogs = Array.isArray(data.logs);
    const logs = hasLogs ? data.logs.filter(l => ids.has(l.session_id)) : [];
    const cardioSet = new Set(data.cardioIds || []);
    const hasCardio = hasLogs && Array.isArray(data.cardioIds);
    // secondes de cardio par séance
    const cardioBySession = {};
    if(hasCardio) logs.forEach(l => { if(l.duration_seconds && cardioSet.has(l.exercise_id)) cardioBySession[l.session_id] = (cardioBySession[l.session_id] || 0) + l.duration_seconds; });
    const muscuBySession = {};
    if(hasLogs) logs.forEach(l => { if(!l.duration_seconds && l.reps && l.charge) muscuBySession[l.session_id] = (muscuBySession[l.session_id] || 0) + 1; });
    return { sessions, logs, hasLogs, hasCardio, cardioBySession, muscuBySession };
  }

  // Statistiques « à la date asOf » sur les séances données
  function stats(sessions, logs, hasLogs, asOf, cardioBySession, hasCardio, muscuBySession){
    const upTo = sessions.filter(s => s.t <= asOf);
    const idSet = new Set(upTo.map(s => s.id));
    const total = upTo.length;
    let cardioSec = 0, cardioSessions = 0, muscuSessions = 0;
    upTo.forEach(s => { const c = (cardioBySession && cardioBySession[s.id]) || 0; cardioSec += c; if(c >= 600) cardioSessions++; if(muscuBySession && muscuBySession[s.id]) muscuSessions++; });

    // Semaines
    const perWeek = {};
    upTo.forEach(s => { const w = weekIndex(s.t); perWeek[w] = (perWeek[w]||0) + 1; });
    let streak = 0, best = 0, lastJoker = -100;
    const curW = weekIndex(asOf);
    if(total){
      const firstW = weekIndex(upTo[0].t);
      for(let w = firstW; w < curW; w++){
        if((perWeek[w]||0) >= WEEKLY_GOAL){ streak++; if(streak > best) best = streak; }
        else if(streak > 0 && w - lastJoker >= JOKER_EVERY){ lastJoker = w; }   // joker : la série tient
        else streak = 0;
      }
    }
    const thisWeek = perWeek[curW] || 0;
    let current = streak;
    if(thisWeek >= WEEKLY_GOAL){ current = streak + 1; if(current > best) best = current; }

    // Retour en force
    let comebacks = 0;
    for(let i = 1; i < upTo.length; i++){
      if((upTo[i].t - upTo[i-1].t) / 86400000 >= COMEBACK_DAYS) comebacks++;
    }

    // Tonnage + records
    let tonnage = 0, prs = 0;
    if(hasLogs){
      const bySession = {};
      logs.forEach(l => {
        if(!idSet.has(l.session_id)) return;
        if(!l.duration_seconds && l.reps != null && l.charge != null) tonnage += l.reps * l.charge;
        if(l.charge == null) return;
        const m = bySession[l.session_id] = bySession[l.session_id] || {};
        if(!(l.exercise_id in m) || l.charge > m[l.exercise_id]) m[l.exercise_id] = l.charge;
      });
      const runMax = {};
      upTo.forEach(s => {
        const m = bySession[s.id]; if(!m) return;
        Object.keys(m).forEach(ex => {
          if(ex in runMax && m[ex] > runMax[ex]) prs++;
          if(!(ex in runMax) || m[ex] > runMax[ex]) runMax[ex] = m[ex];
        });
      });
    }
    return { total, best, current, thisWeek, comebacks, tonnage, prs, hasLogs, hasCardio, cardioSec, cardioSessions, muscuSessions };
  }

  function value(def, st){
    return def.kind === 'sessions' ? st.total
         : def.kind === 'streak'   ? st.best
         : def.kind === 'tonnage'  ? st.tonnage
         : def.kind === 'pr'       ? st.prs
         : def.kind === 'cardiotime' ? st.cardioSec
         : def.kind === 'cardiosessions' ? st.cardioSessions
         : st.comebacks;
  }

  // Résultat complet : stats actuelles + liste des badges (avec date de déblocage)
  function compute(data, now){
    const p = prepare(data);
    let asOf = now || new Date();
    // l'horloge du téléphone peut retarder de quelques minutes sur le serveur : on ne laisse jamais une séance « dans le futur »
    if(p.sessions.length && p.sessions[p.sessions.length-1].t > asOf) asOf = p.sessions[p.sessions.length-1].t;
    const st = stats(p.sessions, p.logs, p.hasLogs, asOf, p.cardioBySession, p.hasCardio, p.muscuBySession);
    const unlockedAt = {};
    // date de déblocage : première séance après laquelle le badge est acquis
    p.sessions.forEach(s => {
      const sst = stats(p.sessions, p.logs, p.hasLogs, s.t, p.cardioBySession, p.hasCardio, p.muscuBySession);
      DEFS.forEach(d => {
        if(!unlockedAt[d.id] && value(d, sst) >= d.target) unlockedAt[d.id] = s.t;
      });
    });
    const revoked = {};
    (data.revoked || []).forEach(r => { revoked[r.badge_id] = r; });
    const badges = DEFS.map(d => {
      const cur = value(d, st);
      const needsLogs = ((d.kind === 'tonnage' || d.kind === 'pr') && !p.hasLogs) || ((d.kind === 'cardiotime' || d.kind === 'cardiosessions') && !p.hasCardio);
      const rev = revoked[d.id] || null;
      return Object.assign({}, d, {
        cur, unlocked: !needsLogs && cur >= d.target && !rev, needsLogs,
        earned: !needsLogs && cur >= d.target,
        revoked: !!rev, revokedReason: rev ? (rev.reason || '') : '',
        unlockedAt: unlockedAt[d.id] || null
      });
    });
    const core = badges.filter(b => !b.bonus), bonus = badges.filter(b => b.bonus);
    return { stats: st, badges, unlockedCount: core.filter(b => b.unlocked).length, coreTotal: core.length, level: levelOf(core.filter(b => b.unlocked).length, profileOf(st)), bonusUnlocked: bonus.filter(b => b.unlocked).length, bonusTotal: bonus.length, goal: WEEKLY_GOAL };
  }

  // Badges débloqués grâce à une séance précise (comparaison avant / après)
  function newlyUnlocked(data, sessionId){
    const after = compute(data);
    const before = compute({
      sessions: (data.sessions||[]).filter(s => s.id !== sessionId),
      logs: data.logs ? data.logs.filter(l => l.session_id !== sessionId) : data.logs,
      revoked: data.revoked
    });
    const had = new Set(before.badges.filter(b => b.unlocked).map(b => b.id));
    return { after, fresh: after.badges.filter(b => b.unlocked && !had.has(b.id)) };
  }

  const nf = n => Math.round(n).toLocaleString('fr-FR');
  function fmtVal(b, v){
    if(b.kind === 'tonnage') return nf(v) + ' kg';
    if(b.kind === 'cardiotime'){ const h = v / 3600; return (h >= 10 ? Math.floor(h) : Math.round(h * 10) / 10).toString().replace('.', ',') + ' h'; }
    return String(Math.min(v, 999999));
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function ensureCss(){
    if(document.getElementById('hsBadgesCss')) return;
    const st = document.createElement('style'); st.id = 'hsBadgesCss';
    st.textContent = `
      .bdg-hero{background:var(--surface,#16171a); border:1px solid var(--line,#2c2c30); border-radius:14px; padding:16px; margin-bottom:16px;}
      .bdg-hero-top{display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;}
      .bdg-streak{font-size:26px; font-weight:800; line-height:1.1;}
      .bdg-streak small{display:block; font-size:12px; font-weight:600; color:var(--ink-muted,#9a9a9e); margin-top:4px;}
      .bdg-count{font-size:13px; color:var(--ink-muted,#9a9a9e); text-align:right;}
      .bdg-count b{display:block; font-size:22px; color:var(--ink,#f5f5f5);}
      .bdg-week{margin-top:14px; font-size:12.5px; color:var(--ink-muted,#9a9a9e);}
      .bdg-dots{display:flex; gap:6px; margin-top:6px;}
      .bdg-dot{width:26px; height:8px; border-radius:99px; background:var(--surface-2,#1f2024); border:1px solid var(--line,#2c2c30);}
      .bdg-dot.on{background:var(--accent,#fff); border-color:var(--accent,#fff);}
      .bdg-group{font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-muted,#9a9a9e); margin:18px 0 8px;}
      .bdg-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px;}
      .bdg{background:var(--surface,#16171a); border:1px solid var(--line,#2c2c30); border-radius:14px; padding:14px 12px; text-align:center;}
      .bdg-ico{font-size:34px; line-height:1; margin-bottom:8px;}
      .bdg-t{font-weight:700; font-size:14px;}
      .bdg-d{font-size:11.5px; color:var(--ink-muted,#9a9a9e); margin-top:4px; line-height:1.35;}
      .bdg-date{font-size:11px; color:var(--accent,#fff); margin-top:6px; font-weight:600;}
      .bdg.locked{opacity:.55;}
      .bdg.locked .bdg-ico{filter:grayscale(1);}
      .bdg-bar{height:5px; border-radius:99px; background:var(--surface-2,#1f2024); margin-top:8px; overflow:hidden;}
      .bdg-bar i{display:block; height:100%; background:var(--ink-muted,#9a9a9e); border-radius:99px;}
      .bdg-prog{font-size:11px; color:var(--ink-muted,#9a9a9e); margin-top:4px;}
      .bdg-new{background:var(--surface,#16171a); border:1px solid var(--accent,#fff); border-radius:14px; padding:14px; margin:0 0 14px; text-align:center;}
      .bdg-new h3{font-size:15px; margin-bottom:10px;}
      .bdg-new-list{display:flex; flex-wrap:wrap; gap:14px; justify-content:center;}
      .bdg-new-item{max-width:130px;}
      .bdg-new-item .bdg-ico{font-size:40px; margin-bottom:4px;}
      .bdg.revoked{opacity:.8; border-color:#c0504d;}
      .bdg.revoked .bdg-ico{filter:grayscale(1);}
      .bdg-rev{font-size:11px; color:#ff8a85; margin-top:6px; font-weight:700;}
      .bdg-rev small{display:block; font-weight:500; color:var(--ink-muted,#9a9a9e);}
      .bdg-act{margin-top:8px; font-family:inherit; font-size:12px; font-weight:700; padding:6px 12px; border-radius:999px; border:1px solid var(--line,#2c2c30); background:var(--surface-2,#1f2024); color:var(--ink,#f5f5f5); cursor:pointer;}
      .bdg-act.warn{border-color:#c0504d; color:#ff8a85;}
      .bdg-rule{font-size:12px; color:var(--ink-muted,#9a9a9e); margin-top:8px; line-height:1.4;}
      .bdg-chip{display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; padding:2px 9px; border-radius:999px; border:1px solid var(--accent,#fff); background:var(--surface-2,#1f2024); vertical-align:middle; margin-left:6px; white-space:nowrap; letter-spacing:0; font-family:'Inter',system-ui,sans-serif;}
      .bdg.featured{border-color:var(--accent,#fff);}
      .bdg-feat{margin-top:8px; font-family:inherit; font-size:12px; font-weight:700; padding:6px 12px; border-radius:999px; border:1px solid var(--accent,#fff); background:none; color:var(--ink,#f5f5f5); cursor:pointer;}
      .bdg-feat.on{background:var(--accent,#fff); color:var(--accent-ink,#0b0b0c);}
      .medal{--c1:#555;--c2:#2a2a2d;--rim:#3a3a3e;width:var(--s,64px);height:var(--s,64px);border-radius:50%;display:grid;place-items:center;position:relative;flex:none;margin:0 auto;background:radial-gradient(circle at 30% 25%,var(--c1),var(--c2) 75%);border:3px solid var(--rim);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 0 0 3px rgba(0,0,0,.18);font-size:calc(var(--s,64px)*.42);line-height:1}
      .medal::after{content:"";position:absolute;inset:6px;border-radius:50%;border:1px dashed rgba(255,255,255,.25)}
      .medal.t0{filter:grayscale(1);opacity:.45}
      .medal.t1{--c1:#e7a26b;--c2:#8a4f27;--rim:#c2773b}
      .medal.t2{--c1:#f1f3f6;--c2:#8d95a3;--rim:#c9cfd9}
      .medal.t3{--c1:#ffe27a;--c2:#b8860b;--rim:#f2c744}
      .medal.t4{--c1:#b8f3ff;--c2:#2f8fae;--rim:#7fdcf2}
      .medal.t5{--c1:#e5c8ff;--c2:#7a3fd1;--rim:#b784f5;box-shadow:0 0 18px rgba(155,100,255,.55),inset 0 0 0 3px rgba(0,0,0,.18)}
      .lvl-hero{background:var(--surface,#16171a);border:1px solid var(--line,#2c2c30);border-radius:18px;padding:18px;display:flex;gap:16px;align-items:center;margin-bottom:10px}
      .lvl-hero .lv{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted,#9a9a9e);font-weight:700}
      .lvl-hero .nm{font-size:28px;font-weight:800;line-height:1.1}
      .lvl-bar{height:7px;border-radius:99px;background:var(--surface-2,#1f2024);margin:10px 0 4px;overflow:hidden}.lvl-bar i{display:block;height:100%;background:var(--ink,#f5f5f5);border-radius:99px}
      .lvl-steps{display:flex;gap:6px;background:var(--surface,#16171a);border:1px solid var(--line,#2c2c30);border-radius:18px;padding:12px 14px;margin-bottom:14px}
      .lvl-steps span{flex:1;text-align:center;font-size:11px;color:var(--ink-muted,#9a9a9e)}.lvl-steps .medal{--s:30px;margin:0 auto 3px;font-size:13px}.lvl-steps .medal::after{display:none}
      .fam{background:var(--surface,#16171a);border:1px solid var(--line,#2c2c30);border-radius:14px;margin-bottom:10px;overflow:hidden}
      .fam>summary{display:flex;gap:12px;align-items:center;padding:12px;cursor:pointer;list-style:none}.fam>summary::-webkit-details-marker{display:none}
      .fam>summary .medal{margin:0}
      .fam .tt{font-weight:700}.fam .tl{font-size:12px;color:var(--ink-muted,#9a9a9e)}.fam .chev{margin-left:auto;color:var(--ink-muted,#9a9a9e)}
      .fam .bdg-grid{padding:0 12px 12px;border-top:1px solid var(--line,#2c2c30);padding-top:12px}
      .fam .bdg-ico{margin-bottom:8px}.fam .bdg-ico .medal{--s:52px}.fam .bdg-ico .medal::after{display:none}
      .bdg-chip .medal{--s:18px;border-width:2px;font-size:10px;margin:0 2px 0 -6px}.bdg-chip .medal::after{display:none}
      .bdg-pill{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--ink-muted,#9a9a9e);margin:0 0 14px}
      .bdg-mini{font-size:12.5px; color:var(--ink-muted,#9a9a9e); margin-top:6px;}
    `;
    document.head.appendChild(st);
  }

  function weekDots(thisWeek, goal){
    let h = '';
    for(let i = 0; i < goal; i++) h += `<span class="bdg-dot ${i < thisWeek ? 'on' : ''}"></span>`;
    return h;
  }

  // Page complète (onglet Badges / fenêtre coach)
  function renderFull(res, opts){
    ensureCss();
    opts = opts || {};
    const st = res.stats, L = res.level;
    const streakTxt = st.current > 0
      ? `🔥 ${st.current} semaine${st.current > 1 ? 's' : ''} de suite`
      : (st.total ? 'Relance ta série cette semaine 💪' : 'Fais ta 1re séance pour démarrer');
    const weekLine = `Cette semaine : ${Math.min(st.thisWeek, 99)}/${res.goal} séance${res.goal > 1 ? 's' : ''}` + (st.thisWeek >= res.goal ? ' ✅' : '');
    const coach = !!opts.coach;
    const medal = (t, icon, size) => `<div class="medal t${t}"${size ? ` style="--s:${size}px"` : ''}>${icon}</div>`;
    const tierOf = (b, list) => b.unlocked ? famTier(list.indexOf(b) + 1, list.length) : 0;
    const badgeHtml = (b, list) => {
      if(b.revoked){
        return `<div class="bdg revoked"><div class="bdg-ico">${medal(0, b.icon)}</div><div class="bdg-t">${esc(b.title)}</div><div class="bdg-d">${esc(b.desc)}</div><div class="bdg-rev">Annulé par le coach${b.revokedReason ? `<small>${esc(b.revokedReason)}</small>` : ''}</div>${coach ? `<button type="button" class="bdg-act" onclick="restoreBadgeAdmin('${b.id}')">Rétablir</button>` : ''}</div>`;
      }
      if(b.unlocked){
        const d = b.unlockedAt ? new Date(b.unlockedAt).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'}) : '';
        const isF = opts.featured === b.id;
        const pickBtn = (!coach && opts.pick) ? `<button type="button" class="bdg-feat ${isF ? 'on' : ''}" onclick="${opts.pick}(${isF ? "'level'" : `'${b.id}'`})">${isF ? '★ Affiché à côté de ton nom' : 'Afficher à côté de mon nom'}</button>` : '';
        return `<div class="bdg${isF ? ' featured' : ''}"><div class="bdg-ico">${medal(tierOf(b, list), b.icon)}</div><div class="bdg-t">${esc(b.title)}</div><div class="bdg-d">${esc(b.desc)}</div>${d ? `<div class="bdg-date">${d}</div>` : ''}${pickBtn}${coach ? `<button type="button" class="bdg-act warn" onclick="revokeBadgeAdmin('${b.id}')">Annuler ce badge</button>` : ''}</div>`;
      }
      const pct = b.needsLogs ? 0 : Math.max(0, Math.min(100, Math.round(b.cur / b.target * 100)));
      const prog = b.needsLogs ? '' : (b.kind === 'comeback' ? '' : `<div class="bdg-bar"><i style="width:${pct}%"></i></div><div class="bdg-prog">${fmtVal(b, b.cur)} / ${fmtVal(b, b.target)}</div>`);
      return `<div class="bdg locked"><div class="bdg-ico">${medal(0, b.icon)}</div><div class="bdg-t">${esc(b.title)}</div><div class="bdg-d">${esc(b.desc)}</div>${prog}</div>`;
    };
    const famNames = [];
    res.badges.forEach(b => { if(famNames.indexOf(b.group) < 0) famNames.push(b.group); });
    const famHtml = name => {
      const list = res.badges.filter(b => b.group === name);
      const done = list.filter(b => b.unlocked).length, t = famTier(done, list.length);
      const best = list.slice().reverse().find(b => b.unlocked) || list[0];
      const tag = list[0].tag ? ` · bonus ${list[0].tag}` : '';
      return `<details class="fam"><summary>${medal(t, best.icon, 54)}<div><div class="tt">${esc(name)}</div><div class="tl">${done}/${list.length} · ${t ? TIER_NAMES[t] : 'à débloquer'}${tag}</div></div><span class="chev">▾</span></summary><div class="bdg-grid">${list.map(b => badgeHtml(b, list)).join('')}</div></details>`;
    };
    const coreFams = famNames.filter(n => !res.badges.find(b => b.group === n).bonus);
    const bonusFams = famNames.filter(n => res.badges.find(b => b.group === n).bonus);
    const steps = TIERS.slice(1).map(t => `<span>${medal(L.t >= t.t ? t.t : 0, '★')}${esc(L.ladder[t.t])}</span>`).join('');
    const pts = L.pts, pct = L.next ? Math.round((pts - TIERS[L.t].at) / (L.next.at - TIERS[L.t].at) * 100) : 100;
    const f = opts.featured, onLevel = !f || f === 'level', onNone = f === 'none';
    const pill = opts.pick ? `<div class="bdg-pill">Pastille à côté de ton nom :
        <button type="button" class="bdg-feat ${onLevel ? 'on' : ''}" style="margin:0" onclick="${opts.pick}('level')">Mon niveau</button>
        <button type="button" class="bdg-feat ${onNone ? 'on' : ''}" style="margin:0" onclick="${opts.pick}('none')">Aucune</button>
        <span style="font-size:12px;">ou choisis un badge ci-dessous</span></div>` : '';
    return `
      <div class="lvl-hero">${medal(L.t, '★', 84)}<div style="flex:1"><div class="lv">Niveau ${esc(L.tierName)}${L.t ? ' · profil ' + esc(L.profileName) : ''}</div><div class="nm">${esc(L.name)}</div>
        <div class="lvl-bar"><i style="width:${pct}%"></i></div>
        <div class="bdg-mini" style="margin:0">${L.next ? `${pts}/${L.next.at} badges principaux pour devenir <b>${esc(L.next.n)}</b>` : 'Niveau maximum atteint 🎉'}</div></div></div>
      <div class="lvl-steps">${steps}</div>
      <div class="bdg-hero">
        <div class="bdg-hero-top">
          <div class="bdg-streak">${streakTxt}<small>Meilleure série : ${st.best} semaine${st.best > 1 ? 's' : ''} · ${st.total} séance${st.total > 1 ? 's' : ''} comptée${st.total > 1 ? 's' : ''}</small></div>
          <div class="bdg-count"><b>${res.unlockedCount}/${res.coreTotal}</b>badges principaux${res.bonusUnlocked ? `<small style="display:block;font-size:12px;">+ ${res.bonusUnlocked} bonus</small>` : ''}</div>
        </div>
        <div class="bdg-week">${weekLine}<div class="bdg-dots">${weekDots(st.thisWeek, res.goal)}</div></div>
        <div class="bdg-mini">Objectif : ${res.goal} séances par semaine. Une semaine de pause par mois ne casse pas ta série.</div>
        <div class="bdg-rule">Une séance compte pour les badges si elle est faite en direct, dure au moins 10 minutes, avec au moins 4 séries ou au moins 10 minutes de cardio, et une seule par jour. Les séances saisies après coup ou importées restent dans ton historique mais ne comptent pas. Les badges « bonus » sont facultatifs : muscu, cardio ou retour après une pause, pas besoin de tous les faire.</div>
      </div>
      ${pill}
      <div class="bdg-group">Badges principaux</div>${coreFams.map(famHtml).join('')}
      <div class="bdg-group">Bonus · facultatifs</div>${bonusFams.map(famHtml).join('')}
    `;
  }

  // Carte « nouveaux badges » affichée en fin de séance
  function renderNew(fresh, res){
    ensureCss();
    const st = res.stats;
    const week = `<div class="bdg-mini">${st.current > 0 ? `🔥 ${st.current} semaine${st.current > 1 ? 's' : ''} de suite · ` : ''}Cette semaine : ${st.thisWeek}/${res.goal} séance${res.goal > 1 ? 's' : ''}${st.thisWeek >= res.goal ? ' ✅' : ''}</div>`;
    if(!fresh.length) return `<div class="bdg-new" style="border-color:var(--line,#2c2c30)">${week}</div>`;
    return `<div class="bdg-new"><h3>🎉 ${fresh.length > 1 ? 'Nouveaux badges' : 'Nouveau badge'} !</h3>
      <div class="bdg-new-list">${fresh.map(b => `<div class="bdg-new-item"><div class="bdg-ico">${b.icon}</div><div class="bdg-t">${esc(b.title)}</div><div class="bdg-d">${esc(b.desc)}</div></div>`).join('')}</div>${week}</div>`;
  }

  // Petite pastille à afficher à côté d'un nom : par défaut le niveau, ou un badge précis (s'il est réellement acquis et non annulé), ou rien ('none')
  function chip(res, id){
    if(!res || id === 'none') return '';
    ensureCss();
    if(!id || id === 'level'){
      const L = res.level; if(!L || !L.t) return '';
      return `<span class="bdg-chip" title="Niveau ${esc(L.tierName)}"><div class="medal t${L.t}">★</div>${esc(L.name)}</span>`;
    }
    const b = res.badges.find(x => x.id === id);
    if(!b || !b.unlocked) return '';
    return `<span class="bdg-chip" title="${esc(b.desc)}">${b.icon} ${esc(b.title)}</span>`;
  }

  // Résumé d'une ligne (liste des clients côté coach)
  function summaryLine(res){
    const st = res.stats;
    return `🔥 ${st.current} sem. de suite · ${st.total} séance${st.total > 1 ? 's' : ''}` + (st.hasLogs ? ` · 🏅 ${res.unlockedCount}/${res.coreTotal}${res.bonusUnlocked ? ' +' + res.bonusUnlocked : ''}` : '') + (res.level && res.level.t ? ` · ${res.level.name}` : '');
  }

  // Chargement des séances (et des séries) d'un utilisateur, par pages de 1000 lignes.
  // getJson(path) doit renvoyer le JSON de la réponse (et lever une erreur si la requête échoue).
  async function pageAll(getJson, path){
    let out = [];
    for(let i = 0; i < 40; i++){
      const rows = await getJson(`${path}&limit=1000&offset=${i*1000}`);
      if(!Array.isArray(rows)) throw new Error('badges_load_failed');
      out = out.concat(rows);
      if(rows.length < 1000) break;
    }
    return out;
  }
  async function load(getJson, userId, withLogs){
    const uid = encodeURIComponent(userId);
    const sessions = await pageAll(getJson, `/rest/v1/sessions?select=id,started_at,completed_at,badge_eligible&user_id=eq.${uid}&order=started_at`);
    let logs;
    if(withLogs !== false){
      logs = await pageAll(getJson, `/rest/v1/session_logs?select=id,session_id,exercise_id,reps,charge,duration_seconds,sessions!inner(user_id)&sessions.user_id=eq.${uid}&order=id`);
    }
    let cardioIds;
    if(withLogs !== false){ try{ const c = await getJson('/rest/v1/exercises?select=id&category=eq.Cardio&limit=500'); if(Array.isArray(c)) cardioIds = c.map(x => x.id); }catch(e){} }
    let revoked = [];
    try{ const r = await getJson(`/rest/v1/badge_revocations?select=badge_id,reason&user_id=eq.${uid}`); if(Array.isArray(r)) revoked = r; }catch(e){ revoked = []; }
    return { sessions, logs, revoked, cardioIds };
  }

  window.HSBadges = { chip, compute, newlyUnlocked, renderFull, renderNew, summaryLine, load, WEEKLY_GOAL };
})();
