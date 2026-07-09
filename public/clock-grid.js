// Logica di griglia condivisa tra admin e display: costruzione dei quadranti,
// mappatura cifre->orologi e gestione degli stati (live/custom/wave/park).
// Ogni cifra occupa un blocco di 2 colonne x 3 righe (vedi clock-font.js).
const ClockGrid = (function () {
  function digitCount(cfg) {
    return Math.floor(cfg.cols / 2) * Math.floor(cfg.rows / 3);
  }

  function create(container, initialCfg) {
    let clocks = [];
    let cfg = null;
    let liveTimer = null;

    function cellIndex(r, c) { return r * cfg.cols + c; }

    function build(newCfg) {
      stopLive();
      cfg = { rows: newCfg.rows, cols: newCfg.cols };
      container.innerHTML = '';
      container.style.gridTemplateColumns = `repeat(${cfg.cols}, var(--clock-size))`;
      container.style.gridTemplateRows = `repeat(${cfg.rows}, var(--clock-size))`;
      clocks = [];
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const clockDiv = document.createElement('div');
          clockDiv.className = 'clock';
          if (c % 2 === 1 && c < cfg.cols - 1) clockDiv.classList.add('digit-gap');
          const h1 = document.createElement('div'); h1.className = 'hand';
          const h2 = document.createElement('div'); h2.className = 'hand';
          clockDiv.appendChild(h1); clockDiv.appendChild(h2);
          container.appendChild(clockDiv);
          clocks.push({ h1, h2, cum1: 135, cum2: 135 });
        }
      }
      fitToViewport();
    }

    function setHandTarget(hand, cumProp, obj, targetDeg) {
      const current = obj[cumProp];
      const currentMod = ((current % 360) + 360) % 360;
      let delta = targetDeg - currentMod;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      obj[cumProp] = current + delta;
      hand.style.transform = `rotate(${obj[cumProp]}deg)`;
    }

    function showDigit(digit, digitIndex) {
      const digitsPerBand = Math.floor(cfg.cols / 2);
      const band = Math.floor(digitIndex / digitsPerBand);
      const colInBand = digitIndex % digitsPerBand;
      for (let localRole = 0; localRole < 6; localRole++) {
        const r = band * 3 + Math.floor(localRole / 2);
        const c = colInBand * 2 + (localRole % 2);
        const clk = clocks[cellIndex(r, c)];
        if (!clk) continue;
        const [a1, a2] = ClockFont.anglesForCell(digit, localRole);
        setHandTarget(clk.h1, 'cum1', clk, a1);
        setHandTarget(clk.h2, 'cum2', clk, a2);
      }
    }

    function showNumber(str) {
      const n = digitCount(cfg);
      const chars = String(str).padStart(n, ' ').slice(-n).split('');
      chars.forEach((ch, i) => {
        const d = /[0-9]/.test(ch) ? parseInt(ch, 10) : undefined;
        showDigit(d, i);
      });
    }

    function parkAll() {
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const localRole = (r % 3) * 2 + (c % 2);
          const park = ClockFont.ROLES[localRole].park;
          const clk = clocks[cellIndex(r, c)];
          setHandTarget(clk.h1, 'cum1', clk, park);
          setHandTarget(clk.h2, 'cum2', clk, park);
        }
      }
    }

    function showWave() {
      clocks.forEach((clk, idx) => {
        const phase = (idx * 24) % 360;
        setHandTarget(clk.h1, 'cum1', clk, phase);
        setHandTarget(clk.h2, 'cum2', clk, (phase + 180) % 360);
      });
    }

    function startLive() {
      stopLive();
      tickLive();
      liveTimer = setInterval(tickLive, 1000);
    }
    function stopLive() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }
    function tickLive() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      showNumber(hh + mm);
    }

    function applyState(state) {
      if (!cfg || state.rows !== cfg.rows || state.cols !== cfg.cols) {
        build({ rows: state.rows || 3, cols: state.cols || 8 });
      }
      if (state.mode === 'live') startLive();
      else {
        stopLive();
        if (state.mode === 'custom') showNumber(state.customDigits || '');
        else if (state.mode === 'wave') showWave();
        else if (state.mode === 'park') parkAll();
      }
    }

    function fitToViewport() {
      container.style.transform = 'none';
      const rect = container.getBoundingClientRect();
      const parent = container.parentElement;
      const maxW = parent.clientWidth * 0.94;
      const maxH = parent.clientHeight * 0.94;
      const scale = Math.min(maxW / rect.width, maxH / rect.height, 1.6);
      container.style.transform = `scale(${scale})`;
    }

    window.addEventListener('resize', () => { if (cfg) fitToViewport(); });

    build(initialCfg);

    return {
      build, showNumber, parkAll, showWave, startLive, stopLive, applyState, fitToViewport,
      digitCount: () => digitCount(cfg),
    };
  }

  return { create, digitCount };
})();
