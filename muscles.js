// Filtres par muscle pour le choix d'exercices (page Programmes). Mêmes groupes que la bibliothèque.
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
