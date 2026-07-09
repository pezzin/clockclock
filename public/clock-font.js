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

  return { N, E, S, W, SEG, ROLES, PARK, anglesForCell };
})();
