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

  // Angolo di riposo unico (lancette entrambe verso il basso) per i quadranti
  // spenti: nel pannello vero questi restano quasi invisibili, un mix di
  // angolazioni diverse per ruolo creava invece un disegno a losanghe.
  const PARK = S;
  const ROLES = [
    { dirs: [[E, 'A'], [S, 'F']], park: PARK },
    { dirs: [[W, 'A'], [S, 'B']], park: PARK },
    { dirs: [[N, 'F'], [S, 'E'], [E, 'G']], park: PARK },
    { dirs: [[N, 'B'], [S, 'C'], [W, 'G']], park: PARK },
    { dirs: [[N, 'E'], [E, 'D']], park: PARK },
    { dirs: [[N, 'C'], [W, 'D']], park: PARK },
  ];

  function anglesForCell(digit, roleIndex) {
    const role = ROLES[roleIndex];
    const seg = SEG[digit];
    if (seg === undefined) return [role.park, role.park];
    const active = role.dirs.filter(([dir, key]) => seg[key]).map(([dir]) => dir);
    if (active.length === 0) return [role.park, role.park];
    if (active.length === 1) return [active[0], active[0]];
    if (active.includes(N) && active.includes(S)) return [N, S];
    return [active[0], active[1]];
  }

  return { N, E, S, W, SEG, ROLES, anglesForCell };
})();
