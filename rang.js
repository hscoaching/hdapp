/* © 2026 HS Coaching – Tous droits réservés. */
// Rangs de force (Mortel → Immortel) : meilleure série estimée en 1RM, comparée au poids de corps.
(function(){
  const RK = ['Mortel', 'Héros', 'Demi-dieu', 'Olympien', 'Immortel'];
  const SUB = ['Tu démarres', 'Bases solides', 'Niveau intermédiaire', 'Niveau avancé', 'Niveau élite'];
  const NUM = ['I', 'II', 'III', 'IV', 'V'];
  // Seuils (1RM ÷ poids de corps) pour atteindre Héros, Demi-dieu, Olympien, Immortel.
  const LIFTS = [
    { id: 'squat', name: 'Squat', ex: ['Squat'],
      m: [0.75, 1.25, 1.75, 2.25], f: [0.5, 0.9, 1.3, 1.7] },
    { id: 'bench', name: 'Développé couché', ex: ['Développé couché barre', 'Développé couché', 'Développé couché avec pause', 'Développé couché prise large'],
      m: [0.5, 0.9, 1.35, 1.8], f: [0.25, 0.5, 0.85, 1.2] },
    { id: 'deadlift', name: 'Soulevé de terre', ex: ['Soulevé de terre'],
      m: [1.0, 1.5, 2.0, 2.5], f: [0.7, 1.1, 1.5, 2.0] },
    { id: 'ohp', name: 'Développé militaire', ex: ['Développé militaire', 'Développé militaire barre', 'Développé militaire assis barre'],
      m: [0.35, 0.6, 0.85, 1.1], f: [0.2, 0.4, 0.6, 0.8] },
    { id: 'row', name: 'Tirage / Rowing', ex: ['Rowing barre', 'Tirage horizontal', 'Rowing T-bar', 'Rowing assis à la poulie'],
      m: [0.5, 0.8, 1.1, 1.4], f: [0.3, 0.55, 0.8, 1.05] }
  ];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const est = (c, r) => c * (1 + r / 30);
  const kg = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const GOLD = '#d9b25c', GREY = '#6b6b70';

  // Casques : game-icons.net (Lorc, Delapouite et contributeurs), licence CC BY 3.0
  const IC = {"light-helm": "<path fill=\"currentColor\" d=\"M233 25v158h46V25zm-18 21.74c-25.1 7.53-44.9 22.05-60 40.88c-20.7 25.88-32 60.28-33.7 95.38H215zm82 0V183h93.7c-1.7-35.1-13-69.5-33.7-95.38c-15.1-18.83-34.9-33.35-60-40.88M105 201v30h302v-30zm16.8 48c4 23.2 23.2 41.6 48.4 55.1c18.6 9.8 40 16.6 58.8 20.1v-15.3c-13.7-3.7-28.4-9.7-42.2-17c-11.8-6.3-22.8-13.6-31.1-22.1c-6.1-6.1-11-13.1-13.3-20.8zm125.2 0v78h18v-78zm122.6 0c-2.3 7.7-7.2 14.7-13.3 20.8c-8.3 8.5-19.3 15.8-31.1 22.1c-13.8 7.3-28.5 13.3-42.2 17v15.3c18.8-3.5 40.2-10.3 58.8-20.1c25.2-13.5 44.4-31.9 48.4-55.1zm-252.8 33.3c-5.7 54.2-16.7 105.9-27.63 150.1c.19.2 1.82 5.3 6.06 11c4.51 6.1 11.17 13.2 18.67 19.8c11.7 10.2 25.9 18.8 37.1 22.2V313.6c-13.5-8.5-25.6-18.9-34.2-31.3m278.4 0c-8.6 12.4-20.7 22.8-34.2 31.3v171.8c11.2-3.4 25.4-12 37.1-22.2c7.5-6.6 14.2-13.7 18.7-19.8c4.2-5.7 5.8-10.8 6-11c-11-44.2-21.9-95.9-27.6-150.1M256 379c-20.3 0-40.6 1-58.1 3.1c-10.9 1.3-20.7 2.8-28.9 5.1v18.9c7.1-2.4 18.2-4.6 31.1-6.2c16.5-1.9 36.2-2.9 55.9-2.9s39.4 1 55.9 2.9c12.9 1.6 24 3.8 31.1 6.2v-18.9c-8.2-2.3-18-3.8-28.9-5.1c-17.5-2.1-37.8-3.1-58.1-3.1\"/>", "crested-helmet": "<path fill=\"currentColor\" d=\"m207.47 18.875l35.968 162.25c.29 1.087.86 1.863 2.562 2.813c1.7.95 4.433 1.66 7.22 1.656c2.785-.003 5.543-.703 7.25-1.656c1.704-.954 2.276-1.75 2.56-2.813L299 18.875zm88.936 98.03l-15.22 68.657l-.06.22l-.032.187c-1.747 6.52-6.404 11.432-11.5 14.28s-10.738 4.026-16.344 4.03c-5.606.007-11.24-1.15-16.344-4c-5.104-2.847-9.782-7.784-11.53-14.31l-.032-.19l-.063-.218l-14.686-66.218C175 133.818 147.157 164.56 135.53 202.97a459 459 0 0 0 32.314 15.468c26.527 11.43 60.506 22.55 88.5 22.406c28.003-.145 61.81-11.56 88.156-23.22a449 449 0 0 0 32.938-16.25c-12.624-39.968-42.853-71.398-81.032-84.468zm88.97 101.376c-8.365 4.538-19.865 10.487-33.313 16.44c-27.522 12.18-62.797 24.673-95.625 24.843c-32.838.17-68.293-12-96-23.938c-13.614-5.866-25.276-11.744-33.72-16.22c-.51 70.485-3.647 138.64 9.626 188.376c7.135 26.737 18.683 47.874 37.375 62.595c12.092 9.525 27.443 16.584 47.25 20.375V330.125c-28.654 16.12-67.847 2.81-81.064-30.625c8.825-22.322 30.127-33.074 50.78-33c24.583.087 48.224 15.532 48.876 45.094h.094v89h36.03l.002-87.72q-.017-.013-.032-.03c0-.422.022-.834.03-1.25c.655-29.562 24.327-45.007 48.908-45.094c20.654-.074 41.926 10.678 50.75 33c-13.204 33.403-52.324 46.702-80.97 30.656v160.47c19.544-3.867 34.6-11 46.438-20.595c18.396-14.908 29.6-36.337 36.375-63.342c12.59-50.184 8.804-118.532 8.188-188.407z\"/>", "spartan-helmet": "<path fill=\"currentColor\" d=\"M253.714 20.358c-8.79.075-17.448.82-25.89 2.308c-46.55 8.208-89.423 26.157-121.225 52.065c-31.803 25.908-52.572 59.39-56.316 100.053l-.004.04l-.004.04c-8.45 83.885 39.397 152.37 65.604 181.553c5.21 5.804 7.064 13.574 6.533 20.862s-3.04 14.494-6.598 21.838c-7.114 14.688-18.703 30.06-31.03 44.457c-13.957 16.303-27.375 29.703-37.75 39.627c7.203-1.214 14.764-4.37 22.67-9.368c14.66-9.265 29.554-24.475 42.097-41.298c12.543-16.824 22.807-35.28 28.802-50.586c2.998-7.654 4.912-14.54 5.614-19.72c.7-5.178-.177-8.39-.354-8.687c-15.34-25.73-31.257-52.027-40.687-79.112s-12.2-55.565-.073-83.35c25.223-57.79 78.02-85.085 130.772-89.605c52.61-4.508 105.963 12.396 136.545 44.71l23.292 22.474l69.254-41.47c-20.34-26.314-55.49-55.33-96.24-76.257c-33.546-17.226-70.702-28.978-106.18-30.428q-4.436-.182-8.832-.144zM372.42 146.184l-.058-.057l.31.313c-.083-.087-.17-.17-.25-.256zM244.814 118.95a167 167 0 0 0-7.4.457c-3.562.305-7.11.73-10.64 1.255l9.628 45.077a117 117 0 0 1 17.646-3.564l-9.233-43.226zm43.85 3.658c-4.866 12.845-7.33 25.916-6.978 39.04c6.034.48 12.086 1.335 18.12 2.557c-.868-12.19 1.306-24.43 6.362-36.98a173 173 0 0 0-17.504-4.617m-106.672 11.79c-6.112 3.028-12 6.54-17.612 10.532c17.55 8.862 29.7 22.763 34.715 39.594a107.4 107.4 0 0 1 15.564-10.063c-6.122-16.257-17.577-30.086-32.666-40.063zm88.136 44.796q-1.734-.003-3.457.047q-4.014.113-7.952.502c-41.993 4.176-77.31 30.258-87.475 90.07c-2.198 12.94 4.293 42.822 12.246 67.66c7.952 24.836 16.634 45.517 16.634 45.517l.504 1.198l.143 1.295c1.96 17.7-9.11 34.967-21.212 52.26c-8.036 11.486-16.43 22.104-23.97 31.72c24-1.35 45.963-11.985 67.177-30.947c-.124-.5-.17-.71-.313-1.297c-.866-3.594-1.955-8.697-1.687-14.68c.446-9.983 5.674-21.958 18.818-31.868c-24.577-35.02-28.898-78.757-24.06-115.027l.886-6.65l6.626-1.05c58.715-9.29 97.246-28.81 139.34-54.593c-27.566-21.88-61.198-34.115-92.25-34.158zm120.197 37.84c-48.424 30.517-91.56 55.67-157.556 67.35c-3.253 33.408 2.427 71.84 25.226 100.798c12.607.61 23.264 6.977 29.904 16.184c6.747 9.353 9.946 21.162 10.83 33.628c23.288 21.426 62.97 39.024 97.764 56.655c-3.17-39.444-.296-76.34-14.538-114.11l-62.842-25.3l-.062-.027c-14.313-6.018-23.332-13.792-26.512-24.03c-3.18-10.236-.874-19.966 1.188-31.064l2.2-11.852l10.74 5.476c23.407 11.94 51.394 20.52 77.548 20.065l6.582-.116l2.103 6.238c10.593 31.436 12.912 56.612 15.752 82.203l7.787 3.113c4.126-29.38 1.912-68.686-3.862-104.425c-5.463-33.817-14.72-65.03-22.252-80.788zM223.397 441.148c-.01.444.094.455.01.04c-.002-.008-.01-.033-.01-.04\"/>", "laurels": "<path fill=\"currentColor\" d=\"M234.7 18.05c-21 .2-38.8 2.5-62 10.2c-4.1 2-8.2 4.1-12.2 6.2c.8 5.26 3.2 10.77 5.5 14.7c-4.9 4.2-9.6 8.4-14.1 12.8c-3.7-5.5-6.6-11.4-8.3-17.4c-14.2 9.2-27.7 19.6-40.1 31.4c1.9 9.5 9.2 18.21 15.2 24.15c-3.7 5.2-7.2 10.4-10.5 15.7c-8.22-7.2-15.12-15.5-19.32-24.65C74.97 108.1 61.92 126 53.08 142.3c5.29 13 19.01 22.7 29.8 28.4c-2 6.1-3.7 12.2-5.1 18.4c-13.5-6.4-26.3-15.7-34.5-26.6c-8.7 20.1-14.7 40.7-18.2 61.4c9.63 15.5 30.57 22.9 46 25.9q.15 9.6.9 19.2c-17.79-2.7-37.26-9.6-49.9-20.4c-1.6 22.3-.5 44.5 3.4 66.2c15.25 13.7 41.14 15.3 58.6 13.7c2 6.1 4.1 12.2 6.5 18.1c-18.61 4.5-43.29 1.1-59.3-6.2c6.6 23.7 16.4 46.4 29.2 67.4c19.33 8.6 44.52 3.6 61.72-2.5c3.7 5.3 7.6 10.5 11.6 15.5c-17.8 9.5-39.9 11.5-57.52 10.1c12.3 16.3 26.62 31.2 42.72 44.4c4.9 1.1 10.5 1.1 16.7.3c11.7-1.7 25.2-7 37.9-14.7c16.7 13.5 34.9 24.7 54.1 33.1l7.5-17.2c-16-6.9-31.3-16.2-45.6-27.3c13.3-10.9 24.3-24 30.2-36.5c4.7-9.7 6.3-18.4 4.5-26.3c-10.7-5.7-20.6-12.5-29.5-20.3c-7.8 20.8-26.4 36.1-43.5 46c-4-4.9-7.9-9.9-11.6-15c16.8-9.8 39.9-27.5 39.1-47.1c-8.9-10.3-16.6-21.8-22.9-34.1c-12 14-30.7 22.5-46.5 26.7c-2.4-5.8-4.6-11.6-6.6-17.6c16.8-5.2 37.9-13 44.1-29.7c-4.3-11.5-7.5-23.6-9.7-36c-13.8 8.4-32 11.1-46.32 10.9c-.6-6.2-1-12.4-1.2-18.7c15.52-.6 33.92-2.5 44.92-14.3c-.8-12.6-.5-25.5.9-38.5c-13.4 2.8-29 .3-40.42-3.2c1.3-6 2.9-12.1 4.8-18.1c12.82 3.2 27.12 6.7 38.82.8c2.7-13.6 6.7-27.3 12-40.8c-9.9-1.8-20.2-6.3-27.7-10.7c3.3-5.3 6.8-10.5 10.5-15.7c8.1 4.2 16.3 8.8 25.2 8.4c5.7-11.6 12.3-22.65 19.5-32.75c-5.1-2.7-10-6.4-14.4-10.6c4.4-4.3 9.1-8.5 13.9-12.7c3.8 3.54 8 6.18 12.3 8.2c15.9-18.6 35.9-36.23 49-53.8zm38.4 0c15.4 20.75 33.8 35.63 48.9 53.7c4.6-1.76 9.1-5.23 12.3-8.1c4.9 4.2 9.5 8.4 13.9 12.7c-4.4 4.2-9.2 7.9-14.4 10.6c7.3 10.1 13.9 21.05 19.6 32.65c9-.1 18.4-4.4 25.2-8.4c3.7 5.2 7.2 10.4 10.4 15.7c-8.8 5.9-18.2 9.6-27.6 10.7c5.3 13.5 9.3 27.2 12 40.8c12.3 5.4 27.3 2.7 38.7-.8c1.9 6 3.5 12.1 4.9 18.1c-14.2 3.4-27.3 6.2-40.4 3.3c1.4 12.9 1.6 25.8.8 38.5c11.4 12.3 30.2 14.4 44.9 14.2c-.2 6.3-.5 12.5-1.2 18.7c-17.1-.5-32.8-2.5-46.3-10.9c-2.1 12.4-5.3 24.5-9.6 36.1c8.2 17.4 27.8 25.3 44.1 29.6c-2 6-4.2 11.8-6.6 17.6c-18.5-5.6-34.9-13-46.6-26.7c-6.3 12.4-13.9 23.8-22.9 34.1c1.5 22.4 22.4 37.8 39.2 47.1c-3.7 5.1-7.6 10.1-11.6 15c-19-11.8-36.6-25.8-43.5-46c-9 7.8-18.8 14.6-29.6 20.3c-1.8 7.9-.1 16.6 4.5 26.3c6 12.5 17 25.6 30.3 36.5c-14.3 11.1-29.6 20.4-45.6 27.3l7.4 17.2c19.3-8.4 37.4-19.6 54.1-33.2c12.7 7.8 26.2 13.1 38 14.8c6.2.8 11.8.8 16.7-.3c16.1-13.2 30.4-28.1 42.7-44.4c-18 1.7-37.9-2.3-56.5-9.7c-.3-.1-.7-.3-1.1-.4c4.1-5 7.9-10.2 11.7-15.5c18.2 7.8 43.7 11.7 61.6 2.5c12.8-21 22.6-43.7 29.2-67.4c-.4.2-.8.4-1.2.5c-20.5 6.4-40.1 7.6-58.1 5.7c2.4-5.9 4.5-12 6.5-18c19.1 1.7 45.2.1 58.6-13.8c3.9-21.7 5.1-43.9 3.4-66.2c-14.4 10.7-34.9 17.9-49.9 20.4c.5-6.4.9-12.8 1-19.2c16.8-4.8 37.9-10 45.9-25.9c-3.5-20.7-9.5-41.3-18.2-61.4c-9.4 11.6-23.1 21-34.4 26.5c-1.5-6.1-3.2-12.2-5.2-18.3c12-7.4 25.1-15.3 29.9-28.4c-10.1-18.7-22.2-35.8-35.9-51.05c-4.2 9.05-11.1 17.45-19.2 24.65c-3.3-5.3-6.8-10.5-10.6-15.7c6.2-7.17 14.2-14.71 15.2-24.15c-12.4-11.8-25.8-22.2-40-31.4c-1.8 6-4.7 11.9-8.3 17.4c-4.5-4.4-9.2-8.6-14.1-12.8c2.7-4.82 4.7-9.62 5.4-14.7c-4-2.1-8.1-4.2-12.2-6.2c-24.7-8.2-43.3-10.3-66.2-10.2\"/>", "winged-emblem": "<path fill=\"currentColor\" d=\"M36.844 26.188c-7.642 55.355 77.047 132.044 145.125 170C135.185 183.3 67.505 158.733 20.155 128.78c10.17 48.74 83.738 82.165 152.03 107.376c-56.094-.93-104.776-7.642-162.25-25.53c20.11 39.824 95.964 59.89 162.533 67.468c-40.172 8.212-83.4 8.65-127.19 3.062c27.2 25.9 75.004 35.054 124.876 31.125c15.11-1.19 25.764 11.643 33.063 28.97c-16.1 14.04-26.314 34.665-26.314 57.625c0 42.143 34.357 76.5 76.5 76.5s76.5-34.357 76.5-76.5c0-21.61-9.045-41.16-23.53-55.094c7.313-18.595 18.25-32.747 34.093-31.5c49.87 3.93 97.708-5.225 124.905-31.124c-43.79 5.588-87.016 5.15-127.188-3.062c66.57-7.578 142.425-27.644 162.532-67.47c-57.474 17.89-106.156 24.603-162.25 25.532C406.76 210.946 480.33 177.52 490.5 128.78c-47.35 29.953-115.03 54.522-161.813 67.407c68.078-37.955 152.767-114.644 145.125-170C416.836 88.028 362.51 139.09 291.22 166.5c-25.236 9.703-24.56 30.48-8.25 50.156c20.692 24.965 17.825 67.663-8.658 108.625a76.2 76.2 0 0 0-20.906-2.905a76.3 76.3 0 0 0-17.594 2.063c-25.986-40.708-28.71-82.986-8.156-107.782c16.308-19.675 17.017-40.453-8.22-50.156C148.15 139.09 93.823 88.028 36.845 26.187zm211.78 315.093l-13.155 40.845l-39.69 12.125c2.214-28.29 24.578-50.68 52.845-52.97m10.126.033c27.825 2.52 49.785 24.555 52.22 52.406l-40.16-12.91l-12.062-39.5zm52.22 62.937c-2.517 27.602-24.238 49.42-51.783 52.125l12.938-40.25l38.844-11.875zm-115.095.03l40.906 13.158l11.97 39.03c-28.064-2.21-50.31-24.227-52.875-52.187z\"/>"};
  const COIN_DOTS = "<circle cx=\"92.0\" cy=\"50.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"90.6\" cy=\"60.9\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"86.4\" cy=\"71.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"79.7\" cy=\"79.7\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"71.0\" cy=\"86.4\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"60.9\" cy=\"90.6\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"50.0\" cy=\"92.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"39.1\" cy=\"90.6\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"29.0\" cy=\"86.4\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"20.3\" cy=\"79.7\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"13.6\" cy=\"71.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"9.4\" cy=\"60.9\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"8.0\" cy=\"50.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"9.4\" cy=\"39.1\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"13.6\" cy=\"29.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"20.3\" cy=\"20.3\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"29.0\" cy=\"13.6\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"39.1\" cy=\"9.4\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"50.0\" cy=\"8.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"60.9\" cy=\"9.4\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"71.0\" cy=\"13.6\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"79.7\" cy=\"20.3\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"86.4\" cy=\"29.0\" r=\"1.8\" fill=\"DOT\"/><circle cx=\"90.6\" cy=\"39.1\" r=\"1.8\" fill=\"DOT\"/>";
  // couleurs d'évolution : bronze, argent, or, rubis, améthyste (clair, foncé, encre)
  const PAL = [['#e0a878', '#7a4a2a', '#4a2a14'], ['#eeeef5', '#7c7c8a', '#3a3a46'], ['#f6df9a', '#8d6a22', '#5b4210'], ['#ffb3a8', '#b3261e', '#4d0f0b'], ['#e3b5ff', '#5b2aa8', '#2d1058']];
  function emblem(level, size, on){
    const lock = on === false, lv = Math.max(0, Math.min(4, level | 0));
    const p = lock ? ['#3a3a40', '#4a4a50', '#1c1c20'] : PAL[lv];
    const d = p[1], dk = lock ? '#2c2c31' : p[2], fc = p[0];
    const id = (lock ? 'rgGl' : 'rgG' + lv);
    const grad = lock ? '<stop offset="0" stop-color="#58585f"/><stop offset="1" stop-color="#2f2f34"/>' : `<stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/>`;
    const ink = p[2], back = lock ? '#4f4f56' : p[1];
    const ic = (n, x, y, w, h, vb, extra) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" ${extra || ''}>${IC[n]}</svg>`;
    const sq = '0 0 512 512', front = `stroke="${fc}" stroke-width="26" stroke-linejoin="round" paint-order="stroke"`;
    const G = [
      ic('light-helm', 20, 20, 60, 60, sq),
      ic('crested-helmet', 20, 20, 60, 60, sq),
      ic('spartan-helmet', 20, 20, 60, 60, sq),
      ic('laurels', 9, 12, 82, 82, sq, `fill="${back}" opacity=".75"`) + ic('spartan-helmet', 29, 27, 44, 44, sq, front),
      ic('winged-emblem', 12, 17, 76, 50, '0 0 512 340', `fill="${back}" opacity=".85"`) + ic('spartan-helmet', 29, 28, 44, 44, sq, front)
    ];
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${grad}</linearGradient></defs><circle cx="50" cy="50" r="47" fill="url(#${id})" stroke="${dk}" stroke-width="2"/>${COIN_DOTS.replace(/DOT/g, d)}<circle cx="50" cy="50" r="35" fill="${fc}" fill-opacity="${lock ? 1 : .55}" stroke="${dk}" stroke-width="1.5"/><g fill="${ink}" color="${ink}">${G[lv]}</g></svg>`;
  }

  // calcul d'un mouvement
  function rate(lift, sets, bw, sex){
    if(!sets.length) return { lift, none: true };
    const thr = sex === 'female' ? lift.f : lift.m;
    let best = null; sets.forEach(s => { const e = est(s.charge, s.reps); if(!best || e > best.e) best = { e, charge: s.charge, reps: s.reps, date: s.date }; });
    const r = best.e / bw;
    const lvl = thr.filter(t => r >= t).length;
    const lo = lvl === 0 ? 0 : thr[lvl - 1], hi = lvl < 4 ? thr[lvl] : null;
    const prog = hi ? Math.max(0, Math.min(1, (r - lo) / (hi - lo))) : 1;
    // meilleures séries (une par séance)
    const bySess = {}; sets.forEach(s => { const e = est(s.charge, s.reps), k = s.sid; if(!bySess[k] || e > bySess[k].e) bySess[k] = { e, charge: s.charge, reps: s.reps, date: s.date }; });
    const top = Object.values(bySess).sort((a, b) => b.e - a.e).slice(0, 3);
    let targets = [], need = 0;
    if(hi){
      const T = hi * bw; need = T - best.e;
      targets = [3, 6, 10].map(rp => { const c = Math.ceil(T / (1 + rp / 30) / 2.5) * 2.5; return { charge: c, reps: rp, e: est(c, rp) }; });
    }
    return { lift, best, ratio: r, lvl, lo, hi, prog, thr, top, targets, need, nextT: hi ? hi * bw : null, nextName: hi ? RK[lvl + 1] : null };
  }

  function summary(rated){
    const ok = rated.filter(x => !x.none);
    if(!ok.length) return null;
    const pos = ok.reduce((a, x) => a + x.lvl + x.prog, 0) / rated.length;   // moyenne des 5 mouvements de base : un mouvement jamais fait compte pour 0
    const lvl = Math.min(4, Math.floor(pos));
    const prog = lvl === 4 ? 1 : pos - lvl;
    const near = ok.filter(x => x.hi).sort((a, b) => b.prog - a.prog)[0] || null;
    return { lvl, prog, count: ok.length, near };
  }

  function css(){
    if(document.getElementById('rgCss')) return;
    const st = document.createElement('style'); st.id = 'rgCss';
    st.textContent = `.rg-hero{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px;text-align:center;margin-bottom:6px}
.rg-rk{font-family:Georgia,serif;font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};margin:8px 0 2px}
.rg-sub{font-size:13px;color:var(--ink-muted)}.rg-bar{height:8px;background:var(--surface-2);border-radius:9px;overflow:hidden;margin:12px 0 6px}.rg-bar i{display:block;height:100%;background:${GOLD};border-radius:9px}
.rg-sec{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);margin:22px 2px 10px}
.rg-row{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.rg-row summary{list-style:none;cursor:pointer}.rg-row summary::-webkit-details-marker{display:none}
.rg-t{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.rg-n{font-weight:700;font-size:15px}.rg-r{font-size:12px;color:${GOLD};font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.rg-d{font-size:12.5px;color:var(--ink-muted);margin-top:3px}.rg-row .rg-bar{height:6px;margin:8px 0 5px}
.rg-tg{background:var(--surface-2);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:13px}.rg-tg div{display:flex;justify-content:space-between;padding:3px 0}.rg-tg b{color:var(--ink)}
.rg-note{font-size:11.5px;color:var(--ink-muted);margin-top:14px;line-height:1.4;text-align:center}
.rg-opt{display:block;width:100%;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:14px;margin-bottom:10px;font:inherit;font-size:15px;cursor:pointer}
.rg-st{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin-bottom:8px}.rg-st.me{border-color:${GOLD}}.rg-st b{font-family:Georgia,serif;letter-spacing:.1em;text-transform:uppercase;font-size:14px;display:block}.rg-st span{font-size:12px;color:var(--ink-muted)}`;
    document.head.appendChild(st);
  }

  // aperçu des performances attendues pour un poids de corps donné (avant toute série)
  function previewRows(L, bw, sex){
    const thr = sex === 'female' ? L.f : L.m;
    return `<div class="rg-tg">${[1, 2, 3, 4].map(i => `<div><span>${RK[i]}</span><b>${kg(thr[i - 1] * bw)} kg</b></div>`).join('')}</div>`;
  }
  function previewHtml(bw, sex){
    return `<div class="rg-sec">Aperçu des perfs · pour ${kg(bw)} kg</div><div class="rg-d" style="margin:0 2px 10px">Charge à soulever (une série, maximum estimé) pour atteindre chaque rang à ton poids de corps.</div>${LIFTS.map(L => `<details class="rg-row"><summary><div class="rg-t"><span class="rg-n">${esc(L.name)}</span><span class="rg-r">${kg((sex === 'female' ? L.f : L.m)[0] * bw)} kg → ${kg((sex === 'female' ? L.f : L.m)[3] * bw)} kg</span></div></summary>${previewRows(L, bw, sex)}</details>`).join('')}`;
  }
  function liftHtml(x, bw, sex){
    const L = x.lift;
    if(x.none) return `<details class="rg-row" style="opacity:.85"><summary><div class="rg-t"><span class="rg-n">${esc(L.name)}</span><span class="rg-d" style="margin:0">Pas encore de série · voir les objectifs</span></div></summary>${previewRows(L, bw, sex)}</details>`;
    const tg = x.hi ? `<div class="rg-sec" style="margin:16px 0 8px">Pour passer ${RK[x.lvl + 1]}, une seule série :</div><div class="rg-tg" style="margin:0">${x.targets.map(t => `<div><b>${kg(t.charge)} kg × ${t.reps} reps</b><span>${kg(t.e)} kg estimé</span></div>`).join('')}</div>` : '';
    const ladder = `<div class="rg-tg">${[1, 2, 3, 4].map(i => `<div style="${x.lvl + 1 === i ? 'color:var(--ink);font-weight:700' : ''}"><span>${x.lvl + 1 === i ? '→ ' : ''}${RK[i]}</span><span>${kg(x.thr[i - 1] * bw)} kg</span></div>`).join('')}</div>`;
    const top = x.top.length ? `<div class="rg-sec" style="margin:16px 0 8px">Tes meilleures séries</div>${x.top.map(t => `<div class="rg-d" style="display:flex;justify-content:space-between;margin:4px 0"><span>${new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span><b style="color:var(--ink)">${kg(t.charge)} kg × ${t.reps}</b> · ${kg(t.e)} kg estimé</span></div>`).join('')}` : '';
    return `<details class="rg-row"><summary><div class="rg-t"><span class="rg-n">${esc(L.name)}</span><span class="rg-r">${RK[x.lvl]}</span></div><div class="rg-bar"><i style="width:${Math.round(x.prog * 100)}%"></i></div><div class="rg-d">${kg(x.best.e)} kg estimé · ${kg(x.ratio).replace(/,0$/, '')} × ton poids${x.hi ? ' · ' + RK[x.lvl + 1] + ' à ' + kg(x.nextT) + ' kg' : ' · rang maximum'}</div></summary>
      <div class="rg-d" style="margin-top:12px">Ta meilleure série : <b style="color:var(--ink)">${kg(x.best.charge)} kg × ${x.best.reps} reps</b> (maximum estimé ${kg(x.best.e)} kg)</div>${ladder}${tg}${top}</details>`;
  }

  // ---------- Endurance ----------
  // Seuils de temps au 5 km (en secondes) pour atteindre Héros, Demi-dieu, Olympien, Immortel (plus petit = mieux)
  const RUN5 = { male: [2400, 1920, 1560, 1260], female: [2760, 2220, 1800, 1440] };
  // Seuils de cardio par semaine (minutes) pour atteindre Héros, Demi-dieu, Olympien, Immortel
  const VOLW = [45, 90, 150, 240];
  const RUN_RE = /course|running|footing|jogging|trail/i;
  const fmtDur = sec => { const m = Math.round(sec / 60); if(m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : ''); };
  const fmtPace = sPerKm => { const t = Math.round(sPerKm), m = Math.floor(t / 60), s = t % 60; return m + ':' + String(s).padStart(2, '0') + ' /km'; };
  const fmtKm = d => (Math.round(d * 100) / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const riegel = (t, d1, d2) => t * Math.pow(d2 / d1, 1.06);

  function rateEndurance(logs, sex){
    const now = Date.now(), cut = now - 28 * 864e5;
    const mins = logs.filter(l => new Date(l.date).getTime() >= cut).reduce((a, l) => a + l.sec, 0) / 60 / 4;   // min / semaine
    let vol = null;
    if(logs.length){
      const lvl = VOLW.filter(t => mins >= t).length, lo = lvl === 0 ? 0 : VOLW[lvl - 1], hi = lvl < 4 ? VOLW[lvl] : null;
      vol = { mins, lvl, prog: hi ? Math.max(0, Math.min(1, (mins - lo) / (hi - lo))) : 1, hi };
    }
    // course : meilleure sortie = celle qui projette le meilleur 5 km
    let run = null;
    if(sex === 'male' || sex === 'female'){
      const efforts = logs.filter(l => RUN_RE.test(l.name) && l.km >= 1.5 && l.sec >= 480).map(l => ({ ...l, t5: riegel(l.sec, l.km, 5) })).sort((a, b) => a.t5 - b.t5);
      const e = efforts[0];
      if(e){
        const thr = RUN5[sex], t5 = e.t5;
        const lvl = thr.filter(t => t5 <= t).length, hi = lvl < 4 ? thr[lvl] : null, lo = lvl === 0 ? thr[0] * 1.25 : thr[lvl - 1];
        const prog = hi ? Math.max(0, Math.min(1, (lo - t5) / (lo - hi))) : 1;
        run = { e, t5, lvl, prog, hi, thr, proj: [[5, 5], [10, 10], [21.0975, 'Semi-marathon']].map(([d, n]) => ({ n: typeof n === 'number' ? n + ' km' : n, t: riegel(e.sec, e.km, d) })) };
      }
    }
    return { vol, run };
  }

  function enduSummary(en){
    const cands = [];
    if(en.run) cands.push({ pos: en.run.lvl + en.run.prog, lvl: en.run.lvl, prog: en.run.prog, from: 'run' });
    if(en.vol) cands.push({ pos: en.vol.lvl + en.vol.prog, lvl: en.vol.lvl, prog: en.vol.prog, from: 'vol' });
    if(!cands.length) return null;
    return cands.sort((a, b) => b.pos - a.pos)[0];
  }

  function enduHtml(en, sum){
    let h = '';
    if(en.run){
      const r = en.run, e = r.e, pace = e.sec / e.km;
      h += `<div class="rg-sec">Course à pied · ta meilleure sortie</div><div class="rg-row"><div class="rg-t"><span class="rg-n">${esc(e.name)}</span><span class="rg-d" style="margin:0">${new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <div style="display:flex;gap:8px;margin-top:12px">${[[fmtKm(e.km) + ' km', 'distance'], [fmtDur(e.sec), 'durée'], [fmtPace(pace), 'allure']].map(([a, b]) => `<div style="flex:1;background:var(--surface-2);border-radius:10px;padding:10px 6px;text-align:center"><b style="display:block;font-size:16px">${a}</b><span style="font-size:11px;color:var(--ink-muted)">${b}</span></div>`).join('')}</div></div>
        <div class="rg-sec">À ce rythme, tu devrais courir</div><div class="rg-row" style="padding:4px 14px">${r.proj.map(p => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px"><span>${esc(p.n)}</span><b>${fmtDur(p.t)}</b></div>`).join('').replace(/border-bottom:1px solid var\(--line\);font-size:14px"><span>Semi/, 'font-size:14px"><span>Semi')}</div>`;
      if(r.hi) h += `<div class="rg-sec">Mon prochain objectif</div><div class="rg-row" style="border-color:${GOLD}"><div class="rg-t"><span class="rg-n">Courir un 5 km en ${fmtDur(r.hi)}</span><span class="rg-r">→ ${RK[r.lvl + 1]}</span></div><div class="rg-d">soit ${fmtPace(r.hi / 5)}, contre ${fmtPace(r.t5 / 5)} aujourd'hui</div></div>`;
      h += `<div class="rg-note">Projection d'après ta meilleure sortie (formule de Riegel). Elle suppose un entraînement adapté à la distance.</div>`;
    }
    if(en.vol){
      const v = en.vol;
      h += `<div class="rg-sec">Cardio par semaine</div><div class="rg-row"><div class="rg-t"><span class="rg-n">Volume moyen</span><span class="rg-r">${RK[v.lvl]}</span></div><div class="rg-bar"><i style="width:${Math.round(v.prog * 100)}%"></i></div><div class="rg-d"><b style="color:var(--ink)">${fmtDur(v.mins * 60)}</b> par semaine (moyenne sur 4 semaines)${v.hi ? ' · objectif ' + RK[v.lvl + 1] + ' : <b style="color:var(--ink)">' + fmtDur(v.hi * 60) + '</b> par semaine' : ' · rang maximum'}</div></div>`;
    }
    return h;
  }

  async function load(box, o){
    css();
    box.innerHTML = '<div class="empty">Chargement…</div>';
    const uid = encodeURIComponent(o.uid);
    const getJson = async p => { const r = await o.apiFetch(p); if(!r.ok) throw new Error('load_failed'); return r.json(); };
    const chain = async (...paths) => { let err; for(const p of paths){ try{ return await getJson(p); }catch(e){ err = e; } } throw err; };
    let sex, bw;
    try{
      const pr = await getJson(`/rest/v1/profiles?select=sex&id=eq.${uid}`);
      sex = pr && pr[0] ? pr[0].sex : null;
    }catch(e){ box.innerHTML = '<div class="empty">Les rangs arrivent bientôt. Réessaie après la prochaine mise à jour.</div>'; return; }
    try{
      const bl = await getJson(`/rest/v1/body_logs?select=weight_kg,logged_at&user_id=eq.${uid}&weight_kg=not.is.null&order=logged_at.desc&limit=1`);
      bw = bl && bl[0] ? Number(bl[0].weight_kg) : null;
    }catch(e){ bw = null; }
    const ladderHtml = (me) => `<div class="rg-sec">Les rangs</div>${RK.map((n, i) => `<div class="rg-st${me === i ? ' me' : ''}">${emblem(i, 38, me === i)}<div><b>${n}</b><span>${SUB[i]}${me === i ? ' · ton rang' : ''}</span></div></div>`).join('')}`;

    // — force —
    let sum = null, rated = [];
    if((sex === 'male' || sex === 'female') && bw){
      const names = [...new Set(LIFTS.flatMap(l => l.ex))];
      const inList = encodeURIComponent('(' + names.map(n => '"' + n + '"').join(',') + ')');
      const base = `/rest/v1/session_logs?select=reps,charge,session_id,sessions!inner(started_at,user_id),exercises!inner(name)&sessions.user_id=eq.${uid}&exercises.name=in.${inList}&reps=gte.1&reps=lte.10&charge=gt.0&duration_seconds=is.null&limit=5000`;
      try{
        const rows = await chain(base + '&sessions.for_name=is.null', base);
        const byName = {}; (rows || []).forEach(r => { const k = norm(r.exercises && r.exercises.name); (byName[k] = byName[k] || []).push({ charge: Number(r.charge), reps: r.reps, date: r.sessions && r.sessions.started_at, sid: r.session_id }); });
        rated = LIFTS.map(L => rate(L, L.ex.flatMap(n => byName[norm(n)] || []), bw, sex));
        sum = summary(rated);
      }catch(e){ console.error(e); }
    }
    // — endurance —
    let en = { vol: null, run: null }, esum = null;
    try{
      const q = (sel, extra) => `/rest/v1/session_logs?select=${sel},sessions!inner(started_at,user_id),exercises!inner(name,category)&sessions.user_id=eq.${uid}&exercises.category=eq.Cardio&duration_seconds=gt.0&limit=5000${extra}`;
      const rows = await chain(q('duration_seconds,distance_km', '&sessions.for_name=is.null'), q('duration_seconds,distance_km', ''), q('duration_seconds', '&sessions.for_name=is.null'), q('duration_seconds', ''));
      const logs = (rows || []).map(r => ({ sec: r.duration_seconds, km: r.distance_km ? Number(r.distance_km) : 0, date: r.sessions && r.sessions.started_at, name: (r.exercises && r.exercises.name) || '' })).filter(l => l.date);
      en = rateEndurance(logs, sex);
      esum = enduSummary(en);
    }catch(e){ console.error(e); }

    let out = '';
    // hero : meilleur rang parmi force et endurance
    const axes = [];
    if(sum) axes.push({ t: 'Force', lvl: sum.lvl, prog: sum.prog, sub: `Rang de force · moyenne des 5 mouvements de base · estimé pour ${kg(bw)} kg${sum.count < 5 ? ' · ' + sum.count + ' sur 5 classé' + (sum.count > 1 ? 's' : '') : ''}` });
    if(esum) axes.push({ t: 'Endurance', lvl: esum.lvl, prog: esum.prog, sub: esum.from === 'run' ? 'Rang d\'endurance · course à pied' : 'Rang d\'endurance · cardio par semaine' });
    if(axes.length){
      const best = axes.slice().sort((a, b) => (b.lvl + b.prog) - (a.lvl + a.prog))[0];
      out += `<div class="rg-hero">${emblem(best.lvl, 96)}<div class="rg-rk">${RK[best.lvl]}</div><div class="rg-sub">${best.sub}</div>${best.lvl < 4 ? `<div class="rg-bar"><i style="width:${Math.round(best.prog * 100)}%"></i></div><div style="font-size:13px">${Math.round(best.prog * 100)} % vers <b>${RK[best.lvl + 1]}</b></div>` : '<div style="font-size:13px;margin-top:10px">Rang maximum atteint</div>'}${axes.length > 1 ? `<div class="rg-sub" style="margin-top:10px">${axes.map(a => `${a.t} : <b style="color:var(--ink)">${RK[a.lvl]}</b>`).join(' · ')}</div>` : ''}</div>`;
    }
    // force
    if(sum){
      const nx = sum.near;
      if(nx) out += `<div class="rg-sec">Mon prochain objectif · force</div><div class="rg-row" style="border-color:${GOLD}"><div class="rg-t"><span class="rg-n">${esc(nx.lift.name)}</span><span class="rg-r">→ ${RK[nx.lvl + 1]}</span></div><div class="rg-d">+${kg(nx.need)} kg sur ton maximum estimé · par exemple <b style="color:var(--ink)">${kg(nx.targets[1].charge)} kg × ${nx.targets[1].reps} reps</b></div></div>`;
      out += `<div class="rg-sec">Force · par mouvement</div>${rated.map(x => liftHtml(x, bw, sex)).join('')}<div class="rg-note">Estimation d'après des moyennes de pratiquants. Le rang compte ta meilleure série de toutes tes séances (jusqu'à 10 reps), avec la formule charge × (1 + reps ÷ 30). Le rang de force est la moyenne des 5 mouvements de base : un mouvement jamais fait compte comme Recrue, donc travailler les 5 fait monter ton rang. Il évolue avec ton poids de corps.</div>`;
    } else if(sex === 'male' || sex === 'female'){
      out += bw ? `<div class="rg-sec">Force</div><div class="rg-row"><div class="rg-d" style="margin:0">Pas de musculation enregistrée. Le rang de force apparaît dès que tu notes une charge sur un grand mouvement : squat, développé couché, soulevé de terre, développé militaire ou tirage.</div></div>` + previewHtml(bw, sex)
        : `<div class="rg-sec">Force</div><div class="rg-row"><div class="rg-d" style="margin:0">Ajoute ton poids (onglet Poids) pour estimer ton rang de force.</div><button type="button" class="btn btn-accent btn-sm" id="rgGoW" style="margin-top:10px">Ajouter mon poids</button></div>`;
    }
    out += enduHtml(en, esum);
    // sexe non renseigné
    if(!sex){
      out += `<div class="rg-sec">${o.coach ? 'Sexe du client (pour estimer son niveau de force)' : 'Pour estimer ton niveau de force'}</div><p class="rg-d" style="margin:0 0 14px">${o.coach ? 'Sert uniquement à choisir les bons barèmes. Le poids est celui de l\'onglet Poids du client.' : 'Ton sexe sert uniquement à choisir les bons barèmes. Ton poids est celui de l\'onglet Poids.'}</p>
        <button type="button" class="rg-opt" data-s="male">Homme</button><button type="button" class="rg-opt" data-s="female">Femme</button><button type="button" class="rg-opt" data-s="none">Je préfère ne pas préciser</button>
        <p class="rg-note" style="text-align:left">Sans réponse, tu gardes les badges et le rang d'endurance (cardio par semaine), sans rang de force.</p>`;
    } else if(sex === 'none'){
      out += `<div class="rg-sec">Force</div><div class="rg-row"><div class="rg-d" style="margin:0">Tu as choisi de ne pas préciser ton sexe : pas de rang de force ni de projection de course.</div><button type="button" class="btn btn-ghost btn-sm" id="rgChg" style="margin-top:10px">Changer</button></div>`;
    }
    const best = axes.length ? axes.slice().sort((a, b) => (b.lvl + b.prog) - (a.lvl + a.prog))[0].lvl : -1;
    if(!axes.length && sex && sex !== 'none' && !(en.vol)) out = `<div class="empty">Pas encore de rang. Il apparaît dès que tu notes une charge sur un grand mouvement, ou du cardio.</div>` + out;
    box.innerHTML = out + ladderHtml(best) + `<div class="rg-note" style="opacity:.7">Illustrations des rangs : game-icons.net (Lorc, Delapouite et contributeurs), licence CC BY 3.0.</div>`;
    box.querySelectorAll('.rg-opt').forEach(b => b.onclick = async () => {
      box.querySelectorAll('.rg-opt').forEach(x => x.disabled = true);
      try{ if(o.setSex) await o.setSex(b.dataset.s); else await o.rpc('set_my_sex', { p_sex: b.dataset.s }); load(box, o); }catch(e){ console.error(e); box.querySelectorAll('.rg-opt').forEach(x => x.disabled = false); if(o.toast) o.toast('Impossible pour le moment. Réessaie.'); }
    });
    const chg = box.querySelector('#rgChg'); if(chg) chg.onclick = async () => { try{ if(o.setSex) await o.setSex(null); else await o.rpc('set_my_sex', { p_sex: null }); load(box, o); }catch(e){ console.error(e); } };
    const gw = box.querySelector('#rgGoW'); if(gw) gw.onclick = () => { if(o.goPoids) o.goPoids(); };
  }

  // Rang résumé pour plusieurs clients (cartes du coach) : 4 requêtes groupées
  async function batch(getJson, ids){
    const out = {};
    if(!ids.length) return out;
    const names = [...new Set(LIFTS.flatMap(l => l.ex))];
    const inNames = encodeURIComponent('(' + names.map(n => '"' + n + '"').join(',') + ')');
    const chain = async (...ps) => { let err; for(const p of ps){ try{ return await getJson(p); }catch(e){ err = e; } } throw err; };
    for(let i = 0; i < ids.length; i += 40){
      const part = ids.slice(i, i + 40), inIds = encodeURIComponent('(' + part.join(',') + ')');
      let profs = [], wts = [], str = [], car = [];
      try{ profs = await getJson(`/rest/v1/profiles?select=id,sex&id=in.${inIds}`); }catch(e){ return out; }   // colonne absente : pas de rangs
      try{ wts = await getJson(`/rest/v1/body_logs?select=user_id,weight_kg,logged_at&user_id=in.${inIds}&weight_kg=not.is.null&order=logged_at.desc&limit=5000`); }catch(e){}
      const sx = `/rest/v1/session_logs?select=reps,charge,session_id,sessions!inner(started_at,user_id),exercises!inner(name)&sessions.user_id=in.${inIds}&exercises.name=in.${inNames}&reps=gte.1&reps=lte.10&charge=gt.0&duration_seconds=is.null&limit=10000`;
      try{ str = await chain(sx + '&sessions.for_name=is.null', sx); }catch(e){}
      const cx = sel => `/rest/v1/session_logs?select=${sel},sessions!inner(started_at,user_id),exercises!inner(name,category)&sessions.user_id=in.${inIds}&exercises.category=eq.Cardio&duration_seconds=gt.0&limit=10000`;
      try{ car = await chain(cx('duration_seconds,distance_km') + '&sessions.for_name=is.null', cx('duration_seconds,distance_km'), cx('duration_seconds') + '&sessions.for_name=is.null', cx('duration_seconds')); }catch(e){}
      const bw = {}; wts.forEach(w => { if(bw[w.user_id] == null) bw[w.user_id] = Number(w.weight_kg); });
      const sBy = {}; str.forEach(r => { const u = r.sessions && r.sessions.user_id; (sBy[u] = sBy[u] || []).push(r); });
      const cBy = {}; car.forEach(r => { const u = r.sessions && r.sessions.user_id; (cBy[u] = cBy[u] || []).push(r); });
      profs.forEach(p => {
        const sex = p.sex, axes = [];
        if((sex === 'male' || sex === 'female') && bw[p.id]){
          const byName = {}; (sBy[p.id] || []).forEach(r => { const k = norm(r.exercises && r.exercises.name); (byName[k] = byName[k] || []).push({ charge: Number(r.charge), reps: r.reps, date: r.sessions.started_at, sid: r.session_id }); });
          const sum = summary(LIFTS.map(L => rate(L, L.ex.flatMap(n => byName[norm(n)] || []), bw[p.id], sex)));
          if(sum) axes.push({ t: 'Force', lvl: sum.lvl, prog: sum.prog });
        }
        const logs = (cBy[p.id] || []).map(r => ({ sec: r.duration_seconds, km: r.distance_km ? Number(r.distance_km) : 0, date: r.sessions.started_at, name: (r.exercises && r.exercises.name) || '' }));
        if(logs.length){ const es = enduSummary(rateEndurance(logs, sex)); if(es) axes.push({ t: 'Endurance', lvl: es.lvl, prog: es.prog }); }
        if(axes.length){ const best = axes.sort((a, b) => (b.lvl + b.prog) - (a.lvl + a.prog))[0]; out[p.id] = { lvl: best.lvl, name: RK[best.lvl], axis: best.t, axes }; }
        else out[p.id] = { none: true, needSex: !sex };
      });
    }
    return out;
  }
  function chip(info){
    if(!info) return '';
    if(info.none) return info.needSex ? '<span class="badge rk-chip" style="vertical-align:middle;opacity:.55" title="Sexe non renseigné : pas de rang de force">🏛 Rang ?</span>' : '';
    return `<span class="badge rk-chip" style="vertical-align:middle;border-color:${GOLD};color:${GOLD}" title="Rang ${esc(info.axis.toLowerCase())}">🏛 ${esc(info.name)}</span>`;
  }

  // ---------- Badges de rang & montée de rang ----------
  async function fetchData(getJson, uid){
    const u = encodeURIComponent(uid);
    const chain = async (...ps) => { let err; for(const p of ps){ try{ return await getJson(p); }catch(e){ err = e; } } throw err; };
    let sex = null, bw = null, rows = [], cardio = [];
    try{ const pr = await getJson(`/rest/v1/profiles?select=sex&id=eq.${u}`); sex = pr && pr[0] ? pr[0].sex : null; }catch(e){ return null; }
    try{ const bl = await getJson(`/rest/v1/body_logs?select=weight_kg&user_id=eq.${u}&weight_kg=not.is.null&order=logged_at.desc&limit=1`); bw = bl && bl[0] ? Number(bl[0].weight_kg) : null; }catch(e){}
    const names = [...new Set(LIFTS.flatMap(l => l.ex))];
    const inList = encodeURIComponent('(' + names.map(n => '"' + n + '"').join(',') + ')');
    const sx = `/rest/v1/session_logs?select=reps,charge,session_id,sessions!inner(started_at,user_id),exercises!inner(name)&sessions.user_id=eq.${u}&exercises.name=in.${inList}&reps=gte.1&reps=lte.10&charge=gt.0&duration_seconds=is.null&limit=5000`;
    try{ rows = await chain(sx + '&sessions.for_name=is.null', sx); }catch(e){}
    const cx = (sel, ex) => `/rest/v1/session_logs?select=${sel},session_id,sessions!inner(started_at,user_id),exercises!inner(name,category)&sessions.user_id=eq.${u}&exercises.category=eq.Cardio&duration_seconds=gt.0&limit=5000${ex}`;
    try{ cardio = await chain(cx('duration_seconds,distance_km', '&sessions.for_name=is.null'), cx('duration_seconds,distance_km', ''), cx('duration_seconds', '&sessions.for_name=is.null'), cx('duration_seconds', '')); }catch(e){}
    return { sex, bw, rows, cardio };
  }
  // photographie des rangs (en ignorant éventuellement une séance)
  function snapshot(d, excludeSid){
    const rows = (d.rows || []).filter(r => !excludeSid || r.session_id !== excludeSid);
    const car = (d.cardio || []).filter(r => !excludeSid || r.session_id !== excludeSid);
    const out = { force: null, endu: null, lifts: {}, best: -1 };
    if((d.sex === 'male' || d.sex === 'female') && d.bw){
      const byName = {}; rows.forEach(r => { const k = norm(r.exercises && r.exercises.name); (byName[k] = byName[k] || []).push({ charge: Number(r.charge), reps: r.reps, date: r.sessions && r.sessions.started_at, sid: r.session_id }); });
      const rated = LIFTS.map(L => rate(L, L.ex.flatMap(n => byName[norm(n)] || []), d.bw, d.sex));
      rated.forEach(x => { out.lifts[x.lift.id] = x.none ? 0 : x.lvl; });
      const sum = summary(rated);
      if(sum) out.force = { lvl: sum.lvl, prog: sum.prog };
    }
    const logs = car.map(r => ({ sec: r.duration_seconds, km: r.distance_km ? Number(r.distance_km) : 0, date: r.sessions && r.sessions.started_at, name: (r.exercises && r.exercises.name) || '' })).filter(l => l.date);
    if(logs.length){ const es = enduSummary(rateEndurance(logs, d.sex)); if(es) out.endu = { lvl: es.lvl, prog: es.prog }; }
    const c = [out.force, out.endu].filter(Boolean).sort((a, b) => (b.lvl + b.prog) - (a.lvl + a.prog))[0];
    out.best = c ? c.lvl : -1;
    return out;
  }
  function medal(i, got){
    return `<div style="flex:1;text-align:center;${got ? '' : 'opacity:.45'}">${emblem(i, 46, got)}<div style="font-size:11px;margin-top:4px;color:${got ? GOLD : 'var(--ink-muted)'};font-weight:700;letter-spacing:.06em;text-transform:uppercase">${RK[i]}</div></div>`;
  }
  // bloc « Badges de rang » (onglet Badges)
  function badgesHtml(snap){
    css();
    const row = (title, lvl) => `<div class="rg-row"><div class="rg-n" style="margin-bottom:10px">${title}</div><div style="display:flex;gap:6px">${[1, 2, 3, 4].map(i => medal(i, lvl >= i)).join('')}</div></div>`;
    const lifts = LIFTS.map(L => { const l = snap.lifts[L.id] || 0; return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span>${esc(L.name)}</span><span style="display:flex;gap:5px;align-items:center">${[1, 2, 3, 4].map(i => `<span title="${RK[i]}" style="width:11px;height:11px;border-radius:50%;background:${l >= i ? GOLD : 'var(--surface-2)'};border:1px solid ${l >= i ? GOLD : 'var(--line)'}"></span>`).join('')}<b style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${l ? GOLD : 'var(--ink-muted)'};min-width:74px;text-align:right">${RK[l]}</b></span></div>`; }).join('');
    return `<div class="rg-sec" style="margin-top:26px">🏛 Badges de rang</div>${row('Force · moyenne des 5 mouvements', snap.force ? snap.force.lvl : 0)}${row('Endurance', snap.endu ? snap.endu.lvl : 0)}<div class="rg-row"><div class="rg-n" style="margin-bottom:4px">Par mouvement</div>${lifts}</div>`;
  }
  // petite carte « ton rang » (haut de l'onglet Badges)
  function miniHtml(snap, goto){
    css();
    if(snap.best < 0) return `<div class="rg-row" style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="${goto}"><div style="flex:0 0 auto">${emblem(0, 44, false)}</div><div><div class="rg-n">Ton rang</div><div class="rg-d" style="margin:0">Découvre ton niveau de force et d'endurance →</div></div></div>`;
    return `<div class="rg-row" style="display:flex;align-items:center;gap:12px;cursor:pointer;border-color:${GOLD}" onclick="${goto}"><div style="flex:0 0 auto">${emblem(snap.best, 44)}</div><div style="flex:1"><div class="rg-n">Rang · <span style="color:${GOLD};text-transform:uppercase;letter-spacing:.08em">${RK[snap.best]}</span></div><div class="rg-d" style="margin:0">${[snap.force ? 'Force : ' + RK[snap.force.lvl] : '', snap.endu ? 'Endurance : ' + RK[snap.endu.lvl] : ''].filter(Boolean).join(' · ')}</div></div><span style="color:var(--ink-muted)">›</span></div>`;
  }
  // montée de rang provoquée par la séance sid (fin de séance)
  async function rankUp(getJson, uid, sid){
    const d = await fetchData(getJson, uid);
    if(!d) return '';
    const b = snapshot(d, sid), a = snapshot(d, null);
    const ups = [];
    if(a.best >= 1 && a.best > b.best) ups.push({ big: true, txt: 'Rang global : ' + (b.best >= 0 ? RK[b.best] + ' → ' : '') + RK[a.best] });
    if(a.force && a.force.lvl >= 1 && a.force.lvl > (b.force ? b.force.lvl : -1) && !(a.best > b.best && a.force.lvl === a.best)) ups.push({ txt: 'Force : ' + (b.force ? RK[b.force.lvl] + ' → ' : '') + RK[a.force.lvl] });
    if(a.endu && a.endu.lvl >= 1 && a.endu.lvl > (b.endu ? b.endu.lvl : -1) && !(a.best > b.best && a.endu.lvl === a.best)) ups.push({ txt: 'Endurance : ' + (b.endu ? RK[b.endu.lvl] + ' → ' : '') + RK[a.endu.lvl] });
    LIFTS.forEach(L => { const x = a.lifts[L.id] || 0, y = b.lifts[L.id] || 0; if(x >= 1 && x > y) ups.push({ txt: L.name + ' : ' + RK[y] + ' → ' + RK[x] }); });
    if(!ups.length) return '';
    css();
    const lvl = Math.max(a.best, 1), share = `J'ai atteint le rang ${RK[lvl]} sur HS Coaching !`;
    window.__rgShare = share;
    return `<div class="rg-hero" style="border-color:${GOLD};margin-bottom:14px"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted)">🏛 Nouveau rang !</div>${emblem(lvl, 84)}<div class="rg-rk">${RK[lvl]}</div>${ups.map(u => `<div class="rg-sub" style="${u.big ? 'color:var(--ink);font-weight:700' : ''}">${esc(u.txt)}</div>`).join('')}<button type="button" class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="HSRang.share()">Partager</button></div>`;
  }
  async function share(){
    const t = window.__rgShare || 'Mon rang sur HS Coaching';
    try{ if(navigator.share){ await navigator.share({ text: t }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
    try{ await navigator.clipboard.writeText(t); alert('Texte copié : ' + t); }catch(e){ alert(t); }
  }

  window.HSRang = { emblem, load, batch, chip, fetchData, snapshot, badgesHtml, miniHtml, rankUp, share, RK, LIFTS, rate, est, rateEndurance };
})();
