// Logica del "font": identica al prototipo standalone, riutilizzata da admin e display.
const ClockFont = (function () {
  const N = 0, E = 90, S = 180, W = 270;

  const SEG = {
    0: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0 },
    1: { A: 0, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0 },
    2: { A: 1, B: 1, C: 0, D: 1, E: 1, F: 0, G: 1 },
    3: { A: 1, B: 1, C: 1, D: 1, E: 0, F: 0, G: 1 },
    4: { A: 0, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1 },
    5: { A: 1, B: 0, C: 1, D: 1, E: 0, F: 1, G: 1 },
    6: { A: 1, B: 0, C: 1, D: 1, E: 1, F: 1, G: 1 },
    7: { A: 1, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0 },
    8: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1 },
    9: { A: 1, B: 1, C: 1, D: 1, E: 0, F: 1, G: 1 },
  };

  // Riposo dei quadranti inattivi come nel prodotto vero: una lancetta a
  // sud-ovest (225°) e una a nord-est (45°), che insieme disegnano una linea
  // diagonale completa "/". Diagonale per non confondersi mai con i tratti
  // delle cifre (solo N/E/S/W), uguale per tutti i quadranti per uno sfondo
  // uniforme e calmo.
  const PARK = [225, 45];
  const ROLES = [
    { dirs: [[E, 'A'], [S, 'F']] },
    { dirs: [[W, 'A'], [S, 'B']] },
    { dirs: [[N, 'F'], [S, 'E'], [E, 'G']] },
    { dirs: [[N, 'B'], [S, 'C'], [W, 'G']] },
    { dirs: [[N, 'E'], [E, 'D']] },
    { dirs: [[N, 'C'], [W, 'D']] },
  ];

  // ---------------------------------------------------------------------
  // Glifi esatti 3 colonne x 6 righe, trascritti cella per cella dalle foto
  // del prodotto vero (0,1,3,5,8,9 forniti dal proprietario; 2 = specchio
  // del 5, 6 = rotazione del 9, 4 e 7 disegnati nello stesso linguaggio).
  // Ogni cifra e' il CONTORNO CHIUSO della cifra "spessa": le barre interne
  // rappresentano i fori (0/8/9), l'8 usa le diagonali per la strozzatura.
  // null = quadrante a riposo. Usati quando il riquadro cifra e' 3x6.
  // ---------------------------------------------------------------------
  const NE = 45, SE = 135, SW = 225, NW = 315;
  const GLYPHS_3x6 = {
    0: [
      [[E,S],[E,W],[W,S]],
      [[N,S],[S,S],[N,S]],
      [[N,S],[N,S],[N,S]],
      [[N,S],[N,S],[N,S]],
      [[N,S],[N,N],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
    1: [
      [[E,S],[E,W],[W,S]],
      [[N,E],[W,S],[N,S]],
      [null, [N,S],[N,S]],
      [null, [N,S],[N,S]],
      [null, [N,S],[N,S]],
      [null, [N,E],[N,W]],
    ],
    2: [
      [[E,S],[E,W],[W,S]],
      [[N,E],[W,S],[N,S]],
      [[E,S],[N,W],[N,S]],
      [[N,S],[E,S],[N,W]],
      [[N,S],[N,E],[W,S]],
      [[N,E],[E,W],[N,W]],
    ],
    3: [
      [[E,S],[E,W],[W,S]],
      [[N,E],[W,S],[N,S]],
      [[E,S],[N,W],[N,S]],
      [[N,E],[W,S],[N,S]],
      [[E,S],[N,W],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
    4: [
      [[S,S],null, [S,S]],
      [[N,S],null, [N,S]],
      [[N,S],null, [N,S]],
      [[N,E],[E,W],[N,S]],
      [null, null, [N,S]],
      [null, null, [N,N]],
    ],
    5: [
      [[E,S],[E,W],[W,S]],
      [[N,S],[E,S],[N,W]],
      [[N,S],[N,E],[W,S]],
      [[N,E],[W,S],[N,S]],
      [[E,S],[N,W],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
    6: [
      [[E,S],[E,W],[W,S]],
      [[N,S],[E,S],[N,W]],
      [[N,S],[N,E],[W,S]],
      [[N,S],[S,S],[N,S]],
      [[N,S],[N,N],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
    7: [
      [[E,E],[E,W],[W,S]],
      [null, [E,S],[N,W]],
      [null, [N,S],null ],
      [null, [N,S],null ],
      [null, [N,S],null ],
      [null, [N,N],null ],
    ],
    8: [
      [[E,S],[E,W],[W,S]],
      [[N,S],[S,S],[N,S]],
      [[N,SE],[N,N],[N,SW]],
      [[S,NE],[S,S],[S,NW]],
      [[N,S],[N,N],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
    9: [
      [[E,S],[E,W],[W,S]],
      [[N,S],[S,S],[N,S]],
      [[N,S],[N,N],[N,S]],
      [[N,E],[W,S],[N,S]],
      [[E,S],[N,W],[N,S]],
      [[N,E],[E,W],[N,W]],
    ],
  };

  function anglesForCell(digit, roleIndex) {
    const role = ROLES[roleIndex];
    const seg = SEG[digit];
    if (seg === undefined) return [PARK[0], PARK[1]];
    const active = role.dirs.filter(([dir, key]) => seg[key]).map(([dir]) => dir);
    if (active.length === 0) return [PARK[0], PARK[1]];
    if (active.length === 1) return [active[0], active[0]];
    if (active.includes(N) && active.includes(S)) return [N, S];
    return [active[0], active[1]];
  }

  return { N, E, S, W, SEG, ROLES, PARK, GLYPHS_3x6, anglesForCell };
})();
