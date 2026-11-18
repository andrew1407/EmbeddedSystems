// Embedded Systems Labs showcase: lab panels, SVG charts, and the two runtimes.
// Python labs call window.pyRun (bridge.py, PyScript); Kotlin labs call the
// WebAssembly module built from the Android labs' sources (kotlin/, ./gradlew showcase).

const REPO = 'https://github.com/Andrew1407/EmbeddedSystems';
const SRC = `${REPO}/tree/main`;
const $ = (s, root = document) => root.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d = 4) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(2);
  return String(+v.toFixed(d));
};
const msFmt = (v) => `${fmt(v, v < 10 ? 3 : 1)} ms`;
const range = (n, f = (i) => i) => Array.from({ length: n }, (_, i) => f(i));
const pause = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const stat = (value, label, cls = '') => `<div class="stat ${cls}"><b>${value}</b><span>${label}</span></div>`;

// ---------------------------------------------------------------- runtimes --
let pyReady = false;
const pyWaiters = [];
window.addEventListener('py-ready', () => {
  pyReady = true;
  document.querySelectorAll('.py-status').forEach((el) => el.remove());
  pyWaiters.splice(0).forEach((f) => f());
});
const whenPy = () => (pyReady ? Promise.resolve() : new Promise((r) => pyWaiters.push(r)));

async function runPy(name, params) {
  await whenPy();
  await pause();
  const res = JSON.parse(window.pyRun(name, JSON.stringify(params)));
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

let ktModule = null;
const kotlin = () => (ktModule ??= import('./kotlin-wasm/labs.mjs'));
async function runKt(name, ...args) {
  const k = await kotlin();
  await pause();
  return JSON.parse(k[name](...args));
}

// ------------------------------------------------------------------ charts --
const charts = new Map();
let chartSeq = 0;

function niceStep(span, count) {
  const raw = span / Math.max(1, count);
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const m = raw / p;
  return (m >= 5 ? 10 : m >= 2 ? 5 : m >= 1 ? 2 : 1) * p;
}
function ticks(min, max, count) {
  if (min === max) { min -= 1; max += 1; }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toPrecision(12));
  return { lo, hi, ticks: out };
}

/** spec: { title, x: label, y: label, series: [{ name, xs, ys, color }], height, dots } */
function chart(spec) {
  const id = `c${++chartSeq}`;
  charts.set(id, spec);
  const keys = spec.series.length > 1
    ? `<span class="keys">${spec.series.map((s) => `<span><i style="background:var(${s.color})"></i>${esc(s.name)}</span>`).join('')}</span>` : '';
  return `<figure class="chart" data-chart="${id}" data-copyable data-title="${esc(spec.title)}"><figcaption><span>${esc(spec.title)}</span>${keys}${actions('png', 'csv')}</figcaption><div class="plot"></div></figure>`;
}

function drawCharts(root = document) {
  root.querySelectorAll('figure.chart').forEach((fig) => {
    const spec = charts.get(fig.dataset.chart);
    const plot = $('.plot', fig);
    if (!spec || !plot.offsetParent) return;
    drawChart(plot, spec);
  });
}
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => drawCharts(), 120); });

function drawChart(plot, spec) {
  const W = Math.max(260, plot.clientWidth), H = spec.height || 230;
  const M = { l: 58, r: 14, t: 8, b: 38 };
  const all = spec.series.flatMap((s) => s.xs.map((x, i) => [x, s.ys[i]])).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!all.length) { plot.innerHTML = '<p class="hint">No data.</p>'; return; }
  const xr = ticks(Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0])), Math.max(3, Math.floor((W - M.l) / 90)));
  const yr = ticks(Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1])), 5);
  // tight x domain reads better for sampled signals
  const x0 = spec.tightX === false ? xr.lo : Math.min(...all.map((p) => p[0])), x1 = spec.tightX === false ? xr.hi : Math.max(...all.map((p) => p[0]));
  const X = (v) => M.l + ((v - x0) / (x1 - x0 || 1)) * (W - M.l - M.r);
  const Y = (v) => H - M.b - ((v - yr.lo) / (yr.hi - yr.lo || 1)) * (H - M.t - M.b);
  const xt = xr.ticks.filter((v) => v >= x0 - 1e-9 && v <= x1 + 1e-9);
  const grid = yr.ticks.map((v) => `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${M.l - 8}" y="${Y(v)}" text-anchor="end" dominant-baseline="middle">${fmt(v, 6)}</text>`).join('')
    + xt.map((v) => `<line x1="${X(v)}" x2="${X(v)}" y1="${H - M.b}" y2="${H - M.b + 4}" stroke="var(--muted)"/><text x="${X(v)}" y="${H - M.b + 16}" text-anchor="middle">${fmt(v, 6)}</text>`).join('');
  const axes = `<line x1="${M.l}" x2="${W - M.r}" y1="${H - M.b}" y2="${H - M.b}" stroke="var(--line)"/>`
    + (yr.lo < 0 && yr.hi > 0 ? `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)" stroke-opacity=".45"/>` : '')
    + `<text x="${(M.l + W - M.r) / 2}" y="${H - 4}" text-anchor="middle">${esc(spec.x)}</text>`
    + `<text transform="translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle">${esc(spec.y)}</text>`;
  const lines = spec.series.map((s) => {
    const pts = s.xs.map((x, i) => `${X(x).toFixed(1)},${Y(s.ys[i]).toFixed(1)}`).join(' ');
    const dots = spec.dots || s.xs.length <= 30 ? s.xs.map((x, i) => `<circle cx="${X(x)}" cy="${Y(s.ys[i])}" r="2.6" fill="var(${s.color})"/>`).join('') : '';
    return `<polyline points="${pts}" fill="none" stroke="var(${s.color})" stroke-width="${s.width || 1.8}" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>${dots}`;
  }).join('');
  plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(spec.title)}">${grid}${axes}${lines}<line class="cross" y1="${M.t}" y2="${H - M.b}" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/><g class="marks"></g></svg><div class="tip" hidden></div>`;

  // hover: nearest sample (by x) of each series
  const svg = $('svg', plot), tip = $('.tip', plot), cross = $('.cross', svg), marks = $('.marks', svg);
  const nearest = (xs, v) => {
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] < v) lo = m; else hi = m; }
    return Math.abs(xs[lo] - v) <= Math.abs(xs[hi] - v) ? lo : hi;
  };
  const move = (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < M.l - 6 || px > W - M.r + 6) return hide();
    const v = x0 + ((px - M.l) / (W - M.l - M.r)) * (x1 - x0);
    const hits = spec.series.map((s) => { const i = nearest(s.xs, v); return { s, x: s.xs[i], y: s.ys[i] }; });
    const hx = X(hits[0].x);
    cross.setAttribute('x1', hx); cross.setAttribute('x2', hx); cross.setAttribute('visibility', 'visible');
    marks.innerHTML = hits.map((h) => `<circle cx="${X(h.x)}" cy="${Y(h.y)}" r="4" fill="var(--panel)" stroke="var(${h.s.color})" stroke-width="2"/>`).join('');
    tip.innerHTML = `<div class="tx">${esc(spec.x)} = ${fmt(hits[0].x, 6)}</div>` + hits.map((h) => `<div><i style="background:var(${h.s.color})"></i>${esc(h.s.name || spec.y)}: ${fmt(h.y, 6)}</div>`).join('');
    tip.hidden = false;
    const left = (hx / W) * rect.width;
    const tw = tip.offsetWidth;
    tip.style.left = `${left + 12 + tw > rect.width ? Math.max(0, left - tw - 12) : left + 12}px`;
    tip.style.top = `${M.t}px`;
  };
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); marks.innerHTML = ''; };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', hide);
}

// -------------------------------------------------------------- lab panels --
const signalFields = (n) => [
  { key: 'harmonics', label: 'Harmonics n', value: 12, min: 1, max: 200 },
  { key: 'w_max', label: 'ω max', value: 1800, min: 1, max: 100000 },
  { key: 'n', label: 'Samples N', value: n, min: 8, max: 2048 },
];
const sweepFields = (step, points, label = 'Sweep step (N)') => [
  { key: 'step', label, value: step, min: 1, max: 1000 },
  { key: 'points', label: 'Sweep points', value: points, min: 2, max: 60 },
];
const signalChart = (d, title = 'Signal x(t)') => chart({ title, x: 't', y: 'x(t)', series: [{ name: 'x', xs: d.t, ys: d.x, color: '--c1' }] });

const LABS = [
  {
    id: 'lab1', tab: '1', name: 'Harmonic signal', lang: 'py', src: `${SRC}/1-lab/1-lab.py`,
    intro: 'Generates a random signal as a sum of <i>n</i> harmonics with random amplitudes and phases, computes its mean M(x) and variance D(x), and measures how generation time grows with the number of harmonics.',
    fields: [...signalFields(1024), ...sweepFields(100, 9, 'Sweep step (harmonics)')],
    hint: 'The lab sweeps harmonics in steps of 1000 with N = 1024 (its <code>DCALLS</code>). That takes a while in the browser, so the default step here is 100.',
    run: (p) => runPy('lab1', p),
    render: (d) => `<div class="stats">${stat(fmt(d.mx, 5), 'mean M(x)')}${stat(fmt(d.dx, 5), 'variance D(x)')}</div>
      <div class="charts">${signalChart(d)}</div>
      <div class="charts two" style="margin-top:16px">
        ${chart({ title: 'O(n): generation time vs harmonics', x: 'harmonics n', y: 'time, ms', series: [{ name: 'generate', xs: d.harmonics, ys: d.gen_ms, color: '--c2' }] })}
        ${chart({ title: 'Generation time vs ln(n)', x: 'ln(n)', y: 'time, ms', series: [{ name: 'generate', xs: d.ln_harmonics, ys: d.gen_ms, color: '--c3' }] })}
      </div>
      <div class="charts" style="margin-top:16px">${chart({ title: 'M(x), D(x) calculation time per sweep point', x: 'harmonics n', y: 'time, ms', series: [{ name: 'M(x), D(x)', xs: d.harmonics, ys: d.param_ms, color: '--c4' }] })}</div>`,
  },
  {
    id: 'lab2', tab: '2', name: 'Correlation', lang: 'py', src: `${SRC}/2-lab/2-lab.py`,
    intro: 'Builds two random harmonic signals, computes the autocorrelation R<sub>xx</sub> and the cross-correlation R<sub>xy</sub> over τ = 0 … N/2 − 2, and compares the speed of Python <code>list</code> and <code>array</code> containers.',
    fields: [...signalFields(64), ...sweepFields(10, 11)],
    run: (p) => runPy('lab2', p),
    render: (d) => `<div class="stats">${stat(msFmt(d.list_ms), 'Rxy with list')}${stat(msFmt(d.array_ms), 'Rxy with array')}${stat(d.interval, 'τ interval')}</div>
      <div class="charts">${chart({ title: 'Signals 1 and 2', x: 't', y: 'x(t)', series: [{ name: 'signal 1', xs: d.t, ys: d.x1, color: '--c1' }, { name: 'signal 2', xs: d.t, ys: d.x2, color: '--c2' }] })}</div>
      <div class="charts two" style="margin-top:16px">
        ${chart({ title: 'Autocorrelation Rxx(τ)', x: 'τ', y: 'Rxx', series: [{ name: 'Rxx', xs: d.auto.t, ys: d.auto.r, color: '--c3' }] })}
        ${chart({ title: 'Cross-correlation Rxy(τ)', x: 'τ', y: 'Rxy', series: [{ name: 'Rxy', xs: d.cross.t, ys: d.cross.r, color: '--c4' }] })}
        ${chart({ title: 'Complexity: signal + correlation time', x: 'N', y: 'time, ms', series: [{ name: 'self (Rxx)', xs: d.sizes, ys: d.self_ms, color: '--c1' }, { name: 'two signals (Rxy)', xs: d.sizes, ys: d.pair_ms, color: '--c2' }] })}
        ${chart({ title: 'Rxy time: list vs array', x: 'N', y: 'time, ms', series: [{ name: 'list', xs: d.sizes, ys: d.pair_list_ms, color: '--c1' }, { name: 'array', xs: d.sizes, ys: d.pair_array_ms, color: '--c5' }] })}
      </div>`,
  },
  {
    id: 'lab3', tab: '3', name: 'DFT', lang: 'py', src: `${SRC}/3-lab/3-lab.py`,
    intro: 'Computes the discrete Fourier transform |F(p)| of a random harmonic signal, with the twiddle factors memoized by p·k, and compares <code>list</code> vs <code>array</code> as the complexity grows as O(N²).',
    fields: [...signalFields(64), ...sweepFields(10, 24)],
    hint: 'The lab sweeps 63 points (N up to 630). The default here stops at 240 to keep the page responsive.',
    run: (p) => runPy('lab3', p),
    render: (d) => `<div class="stats">${stat(msFmt(d.list_ms), 'DFT with list')}${stat(msFmt(d.array_ms), 'DFT with array')}</div>
      <div class="charts two">${signalChart(d)}
        ${chart({ title: 'Spectrum |F(p)|', x: 'p', y: '|F(p)|', series: [{ name: '|F(p)|', xs: d.t, ys: d.spectrum, color: '--c3' }] })}</div>
      <div class="charts" style="margin-top:16px">${chart({ title: 'DFT time: list vs array', x: 'N', y: 'time, ms', series: [{ name: 'list', xs: d.sizes, ys: d.c_list_ms, color: '--c1' }, { name: 'array', xs: d.sizes, ys: d.c_array_ms, color: '--c5' }] })}</div>`,
  },
  {
    id: 'lab4', tab: '4', name: 'FFT', lang: 'py', src: `${SRC}/4-lab/4-lab.py`,
    intro: 'Computes the spectrum with a radix-2 fast Fourier transform (even/odd split, coefficients cached by a <code>memoize</code> decorator) and compares it with the DFT from lab 3.',
    fields: [...signalFields(64), ...sweepFields(10, 32)],
    hint: 'Use an even N: the FFT splits the samples into even and odd halves.',
    run: (p) => runPy('lab4', p),
    render: (d) => `${d.max_diff > 1e-6 ? `<p class="note">The FFT doesn't match the DFT here (max |FFT − DFT| = ${fmt(d.max_diff)}). The lab's <code>memoize</code> caches <code>getCoef(p, N)</code> by <code>p</code> only, so coefficients for N and N/2 overwrite each other.</p>` : ''}
      <div class="stats">${stat(msFmt(d.fft_ms), 'FFT time')}${stat(msFmt(d.dft_ms), 'DFT time')}${stat(fmt(d.max_diff), 'max |FFT − DFT|', d.max_diff > 1e-6 ? 'bad' : 'good')}</div>
      <div class="charts two">${signalChart(d)}
        ${chart({ title: 'Spectrum |F(p)|', x: 'p', y: '|F(p)|', series: [{ name: 'FFT', xs: d.t, ys: d.fft, color: '--c3' }, { name: 'DFT', xs: d.t, ys: d.dft, color: '--c2', dash: true }] })}</div>
      <div class="charts" style="margin-top:16px">${chart({ title: 'FFT time vs N', x: 'N', y: 'time, ms', series: [{ name: 'FFT', xs: d.sizes, ys: d.c_ms, color: '--c3' }] })}</div>`,
  },
  {
    id: 'lab5', tab: '5', name: 'Fermat factorization', lang: 'kt', src: `${SRC}/5-lab/app/src/main/java/com/diches/embeddedsystems`,
    intro: 'Factors an odd number <i>n</i> into <i>a · b</i> with Fermat\'s method: start at x = ⌈√n⌉ and search for x² − n being a perfect square y², then a = x + y, b = x − y. The Android app gives up after 3 seconds.',
    fields: [{ key: 'n', label: 'Odd number n', value: '8051', type: 'text', wide: true }],
    examples: ['8051', '10403', '99400891', '5959', '1234567', '97', '4096', '2147483647'],
    run: (p) => runKt('fermat', String(p.n).trim()),
    render: (d, p) => {
      if (d.error) return `<div class="result"><div class="big bad">${esc(d.error)}</div>${d.time !== undefined ? `<div class="muted">Time elapsed: ${d.time} ms.</div>` : ''}</div>`;
      const ok = BigInt(d.a) * BigInt(d.b) === BigInt(String(p.n).trim());
      return `<div class="result"><div class="big">${esc(String(p.n).trim())} = ${d.a} <span class="muted">×</span> ${d.b}</div>
        <div class="stats">${stat(`a = ${d.a}`, 'x + y')}${stat(`b = ${d.b}`, 'x − y')}${stat(`${d.time} ms`, 'time elapsed')}${stat(ok ? 'a · b = n' : 'a · b ≠ n', 'check', ok ? 'good' : 'bad')}</div></div>`;
    },
  },
  {
    id: 'lab6', tab: '6', name: 'Perceptron', lang: 'kt', src: `${SRC}/6-lab/app/src/main/java/com/diches/embeddedsystems/perceptron`,
    intro: 'Trains a two-weight perceptron so that A(0, 6) and B(1, 5) land above the threshold P, and C(3, 3), D(2, 4) below it. Training stops when all four points are separated or the deadline (time or iterations) runs out.',
    fields: [
      { key: 'threshold', label: 'Threshold P', value: 4, min: 0, max: 100 },
      { key: 'rate', label: 'Learning rate', value: '0.001', options: ['0.001', '0.01', '0.05', '0.1', '0.2', '0.3'] },
      { key: 'mode', label: 'Deadline', value: 'time', radio: [['time', 'Time'], ['iterations', 'Iterations']] },
      { key: 'time', label: 'Time deadline, s', value: '0.5', options: ['0.5', '1', '2', '3'], when: ['mode', 'time'] },
      { key: 'iterations', label: 'Iterations deadline', value: '100', options: ['100', '200', '500', '1000'], when: ['mode', 'iterations'] },
    ],
    run: (p) => runKt('perceptron', p.threshold | 0, +p.rate, p.mode === 'time', p.mode === 'time' ? +p.time : +p.iterations),
    render: (d, p) => perceptronView(d, p.threshold | 0),
  },
  {
    id: 'lab7', tab: '7', name: 'Genetic algorithm', lang: 'kt', src: `${SRC}/7-lab/app/src/main/java/com/diches/embeddedsystems/geneticAlgorithm`,
    intro: 'Searches integer roots of a·x1 + b·x2 + c·x3 + d·x4 = y with a genetic algorithm: random initial genes in 1 … y/2, fitness from |y − value|, tournament selection, one-point crossover and ±1 mutations. Gives up after 3 seconds.',
    fields: [
      { key: 'a', label: 'a', value: 1, min: -1000, max: 1000 }, { key: 'b', label: 'b', value: 1, min: -1000, max: 1000 },
      { key: 'c', label: 'c', value: 2, min: -1000, max: 1000 }, { key: 'd', label: 'd', value: 3, min: -1000, max: 1000 },
      { key: 'y', label: 'y', value: 30, min: 1, max: 100000 }, { key: 'population', label: 'Population', value: 10, min: 2, max: 1000 },
    ],
    run: (p) => runKt('genetic', p.y | 0, p.population | 0, p.a | 0, p.b | 0, p.c | 0, p.d | 0),
    render: (d, p) => {
      const coefs = [p.a, p.b, p.c, p.d].map((v) => v | 0);
      if (d.outOfTime) return `<div class="result"><div class="big bad">Solution wasn't found for 3 seconds</div><div class="muted">Time elapsed: ${d.time} ms.</div></div>`;
      const sum = d.x.reduce((s, x, i) => s + x * coefs[i], 0);
      const eq = d.x.map((x, i) => `${coefs[i]}·<b>${x}</b>`).join(' + ');
      return `<div class="result"><div class="eq">${eq} = ${sum}</div>
        <div class="stats">${d.x.map((x, i) => stat(`x${i + 1} = ${x}`, `gene ${i + 1}`)).join('')}${stat(`${d.time} ms`, 'time elapsed')}${stat(sum === (p.y | 0) ? 'fits y' : `${sum} ≠ y`, 'check', sum === (p.y | 0) ? 'good' : 'bad')}</div></div>`;
    },
  },
  {
    id: 'rgr', tab: 'RGR', name: 'Real-time scheduling', lang: 'py', src: `${SRC}/rgr`,
    intro: 'Generates a stream of tasks from an Erlang flow (order 1 is a Poisson flow). Their execution times are the measured run times of labs 1–7 and their deadlines are 10–20 times that. It then schedules them with FIFO, Earliest Deadline First (EDF) and Rate Monotonic (RM), comparing average wait time, missed deadlines and processor idle time.',
    fields: [
      { key: 'intensity', label: 'Intensity λ', value: 22.26, min: 0.01, max: 500, step: 'any' },
      { key: 'size', label: 'Queue size', value: 40, min: 2, max: 500 },
      { key: 'interval', label: 'Interval, s', value: 0.05, min: 0.001, max: 10, step: 'any' },
      { key: 'order', label: 'Erlang order', value: 1, min: 1, max: 10 },
      { key: 'size_step', label: 'Sweep: size step', value: 5, min: 1, max: 100 },
      { key: 'size_max', label: 'Sweep: max size', value: 300, min: 5, max: 1000 },
      { key: 'intensity_max', label: 'Sweep: max λ', value: 116, min: 2, max: 500 },
    ],
    hint: '<code>rgr/main.py</code> sweeps queue sizes up to 500. The default here is 300 to keep the page responsive.',
    run: (p) => runPy('rgr', { ...p, intensity: +p.intensity, interval: +p.interval }),
    render: (d) => rgrView(d),
  },
];

// ------------------------------------------------------------ custom views --
function perceptronView(d, P) {
  const dots = [['A', 0, 6, true], ['B', 1, 5, true], ['C', 3, 3, false], ['D', 2, 4, false]];
  const value = (x, y) => d.w1 * x + d.w2 * y;
  const checks = dots.map(([n, x, y, above]) => ({ n, x, y, above, v: value(x, y), ok: above ? value(x, y) > P : value(x, y) < P }));
  const solved = checks.every((c) => c.ok);
  // the separating line w1·x + w2·y = P on a fixed 0..4 × 0..7 plane
  const W = 340, H = 300, m = 34, sx = (x) => m + (x / 4) * (W - 2 * m), sy = (y) => H - m - (y / 7) * (H - 2 * m);
  let line = '';
  if (Math.abs(d.w2) > 1e-12) {
    const yAt = (x) => (P - d.w1 * x) / d.w2;
    line = `<line x1="${sx(-1)}" y1="${sy(yAt(-1))}" x2="${sx(5)}" y2="${sy(yAt(5))}" stroke="var(--accent)" stroke-width="2"/>`;
  } else if (Math.abs(d.w1) > 1e-12) {
    const x = P / d.w1;
    line = `<line x1="${sx(x)}" y1="${sy(-1)}" x2="${sx(x)}" y2="${sy(8)}" stroke="var(--accent)" stroke-width="2"/>`;
  }
  const grid = range(5, (i) => `<line x1="${sx(i)}" x2="${sx(i)}" y1="${sy(0)}" y2="${sy(7)}" stroke="var(--grid)"/><text x="${sx(i)}" y="${sy(0) + 15}" text-anchor="middle">${i}</text>`).join('')
    + range(8, (i) => `<line x1="${sx(0)}" x2="${sx(4)}" y1="${sy(i)}" y2="${sy(i)}" stroke="var(--grid)"/><text x="${sx(0) - 8}" y="${sy(i)}" text-anchor="end" dominant-baseline="middle">${i}</text>`).join('');
  const pts = checks.map((c) => `<circle cx="${sx(c.x)}" cy="${sy(c.y)}" r="6" fill="var(${c.above ? '--c3' : '--c2'})" stroke="var(${c.ok ? '--panel' : '--err'})" stroke-width="${c.ok ? 1.5 : 3}"/><text x="${sx(c.x) + 10}" y="${sy(c.y) - 8}" style="fill:var(--ink);font-weight:600">${c.n}</text>`).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W + 60}px;display:block" role="img" aria-label="Points and the learned separating line"><defs><clipPath id="pc"><rect x="${sx(0)}" y="${sy(7)}" width="${sx(4) - sx(0)}" height="${sy(0) - sy(7)}"/></clipPath></defs>${grid}<g clip-path="url(#pc)">${line}</g>${pts}</svg>`;
  const rows = checks.map((c) => `<tr><td><span class="sw" style="background:var(${c.above ? '--c3' : '--c2'})"></span>${c.n}(${c.x}, ${c.y})</td><td>${c.above ? '&gt;' : '&lt;'} P</td><td class="num">${fmt(c.v, 4)}</td><td class="${c.ok ? 'ok' : 'bad'}">${c.ok ? '✓' : '✗'}</td></tr>`).join('');
  return `<div class="stats">${stat(`w1 = ${fmt(d.w1, 5)}`, 'weight 1')}${stat(`w2 = ${fmt(d.w2, 5)}`, 'weight 2')}${stat(`${d.time} ms`, 'time elapsed')}${stat(d.iterations, 'iterations')}${stat(solved ? 'separated' : 'deadline hit', 'result', solved ? 'good' : 'bad')}</div>
    <div class="two-col"><div data-copyable data-title="Perceptron: w1·x + w2·y = ${P}"><div class="copy-head"><span></span>${actions('png')}</div><div class="plot">${svg}</div><div class="legend"><span><span class="sw" style="background:var(--c3)"></span>should be above P</span><span><span class="sw" style="background:var(--c2)"></span>should be below P</span><span><span class="sw" style="background:var(--accent)"></span>w1·x + w2·y = P</span></div></div>
    <div data-copyable style="align-self:start"><div class="copy-head"><span></span>${actions('table')}</div><div class="table-wrap"><table><thead><tr><th>Point</th><th>Target</th><th class="num">w1·x + w2·y</th><th>Fits</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
}

const ALGOS = [['fifo', 'FIFO', '--c1'], ['edf', 'EDF', '--c3'], ['rm', 'RM', '--c2']];
const WCETS = [0.01133, 0.00427, 0.00852, 0.00443, 0.00159, 0.02322, 0.01025]; // rgr/main.py EXECUTION_TIME
const labOf = (wcet) => WCETS.findIndex((w) => Math.abs(w - wcet) < 1e-9) + 1;

function rgrView(d) {
  const cards = ALGOS.map(([k, name, c]) => {
    const r = d.runs[k];
    return `<div class="panel" style="margin:0;padding:14px"><h2 style="margin-bottom:8px"><span class="sw" style="background:var(${c})"></span>${name}</h2><div class="stats" style="margin:0;grid-template-columns:repeat(3,1fr)">${stat(fmt(r.wait_avg, 5), 'avg wait, s')}${stat(r.missed, 'missed deadlines', r.missed ? 'bad' : 'good')}${stat(`${fmt(r.idle * 100, 2)}%`, 'idle')}</div></div>`;
  }).join('');
  const tasks = d.tasks.map((t, i) => `<tr><td class="num">${i + 1}</td><td class="num">${t.arrival.toFixed(5)}</td><td class="num">${t.wcet.toFixed(5)}</td><td>lab ${labOf(t.wcet)}</td><td class="num">${t.deadline.toFixed(5)}</td></tr>`).join('');
  const series = (xs, pick) => ALGOS.map(([k, name, c]) => ({ name, xs, ys: pick(k), color: c }));
  return `<div class="algo-cards">${cards}</div>
    <div class="panel" style="margin:0 0 16px;padding:14px" data-copyable data-title="Execution timeline" id="gantt-box"><div class="copy-head"><h2>Execution timeline <small>· one row per task, ordered by arrival; bars are executed chunks, coloured by the lab the task stands for</small></h2>${actions('png')}</div>
      <div class="tabs" id="gantt-tabs">${ALGOS.map(([k, name], i) => `<button class="tab" data-algo="${k}" aria-selected="${i === 0}">${name}</button>`).join('')}</div>
      <div class="gantt" id="gantt"></div>
      <div class="legend">${range(7, (i) => `<span><span class="sw" style="background:var(--c${i + 1})"></span>lab ${i + 1} · ${WCETS[i]} s</span>`).join('')}<span>grey line: arrival → deadline</span><span><span class="sw" style="background:var(--err);width:3px"></span>missed deadline</span></div>
    </div>
    <div class="charts">${chart({ title: 'Average wait time vs number of tasks', x: 'tasks', y: 'wait time, s', series: series(d.sizes, (k) => d.by_size[k]) })}</div>
    <div class="charts two" style="margin-top:16px">
      ${chart({ title: 'Average wait time vs intensity', x: 'intensity λ', y: 'wait time, s', series: series(d.intensities, (k) => d.by_intensity[k].wait) })}
      ${chart({ title: 'Processor idle vs intensity', x: 'intensity λ', y: 'idle share', series: series(d.intensities, (k) => d.by_intensity[k].idle) })}
    </div>
    <div data-copyable><div class="copy-head" style="margin-top:18px"><h2>Generated tasks <small>· ${d.tasks.length}</small></h2>${actions('table')}</div>
    <div class="table-wrap"><table><thead><tr><th class="num">#</th><th class="num">Arrival, s</th><th class="num">WCET, s</th><th>Task</th><th class="num">Deadline, s</th></tr></thead><tbody>${tasks}</tbody></table></div></div>`;
}

function drawGantt(el, d, algo) {
  const tl = d.runs[algo].timeline;
  if (!tl.length) { el.innerHTML = ''; return; }
  // a task is identified the same way rgr/scheduling/analyzer.py groups its chunks; rows go by arrival
  const key = (t) => `${t.arrival}|${t.wcet}|${t.deadline}`;
  const tasks = d.tasks.map((t, i) => ({ ...t, n: i + 1 })).sort((a, b) => a.arrival - b.arrival);
  const rowOf = new Map(tasks.map((t, i) => [key(t), i]));
  const last = new Map();
  tl.forEach((t) => last.set(key(t), t));
  const end = Math.max(...tl.map((t) => Math.max(t.started + t.executed, t.finished)), ...tasks.map((t) => t.deadline));
  const rows = tasks.length, RH = 15, M = { l: 44, r: 16, t: 8, b: 32 };
  const W = Math.max(el.clientWidth - 2, Math.min(4000, rows * 22)), H = M.t + rows * RH + M.b;
  const X = (v) => M.l + (v / end) * (W - M.l - M.r);
  const Yc = (r) => M.t + r * RH + RH / 2;
  const tk = ticks(0, end, Math.floor(W / 100));
  const grid = tk.ticks.filter((v) => v <= end).map((v) => `<line x1="${X(v)}" x2="${X(v)}" y1="${M.t}" y2="${H - M.b}" stroke="var(--grid)"/><text x="${X(v)}" y="${H - M.b + 16}" text-anchor="middle">${fmt(v, 4)}</text>`).join('');
  const rowsSvg = tasks.map((t, r) => {
    const fin = last.get(key(t)), miss = fin && t.deadline < fin.finished, y = Yc(r);
    return `<line x1="${X(t.arrival)}" x2="${X(t.deadline)}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-opacity=".35" stroke-width="2"/>`
      + `<line x1="${X(t.arrival)}" x2="${X(t.arrival)}" y1="${y - 5}" y2="${y + 5}" stroke="var(--muted)" stroke-width="1.2"/>`
      + `<line x1="${X(t.deadline)}" x2="${X(t.deadline)}" y1="${y - 6}" y2="${y + 6}" stroke="var(${miss ? '--err' : '--muted'})" stroke-width="${miss ? 2.2 : 1.2}"/>`
      + `<text x="${M.l - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" ${miss ? 'style="fill:var(--err)"' : ''}>${t.n}</text>`;
  }).join('');
  const bars = tl.map((t) => {
    const r = rowOf.get(key(t)) ?? 0, lab = labOf(t.wcet);
    const x0 = X(t.started), w = Math.max(1.5, X(t.started + t.executed) - x0);
    return `<rect x="${x0}" y="${Yc(r) - 5}" width="${w}" height="10" rx="2" fill="var(--c${lab || 1})"><title>task ${tasks[r].n} (lab ${lab}) · arrived ${t.arrival} s · ran ${t.executed} s from ${t.started} s · deadline ${t.deadline} s</title></rect>`;
  }).join('');
  el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Execution timeline">${grid}${rowsSvg}${bars}<text x="${(M.l + W) / 2}" y="${H - 4}" text-anchor="middle">time, s</text></svg>`;
}

// ------------------------------------------------------------------ copying --
const ACTION_LABEL = { png: 'Copy image', csv: 'Copy CSV', table: 'Copy table', results: 'Copy results' };
const ACTION_TIP = { png: 'Copy as a PNG image (downloads it if the clipboard is unavailable)', csv: 'Copy the plotted data as CSV', table: 'Copy the table as tab-separated text, pastes into spreadsheets', results: 'Copy the inputs and results as text' };
const actions = (...kinds) => `<span class="copy-actions">${kinds.map((k) => `<button type="button" class="mini" data-act="${k}" title="${ACTION_TIP[k]}">${ACTION_LABEL[k]}</button>`).join('')}</span>`;

// Render an on-screen SVG to PNG: computed colours and fonts are inlined so the image
// matches the current theme, with the caption drawn above it.
function svgPng(svg, title, legend = [], scale = 2) {
  const box = svg.viewBox.baseVal;
  const w = (box && box.width) || +svg.getAttribute('width') || svg.clientWidth;
  const h = (box && box.height) || +svg.getAttribute('height') || svg.clientHeight;
  const clone = svg.cloneNode(true);
  const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el), c = dst[i];
    for (const a of ['fill', 'stroke', 'stroke-opacity', 'fill-opacity', 'stroke-width', 'opacity', 'visibility']) c.setAttribute(a, cs.getPropertyValue(a));
    if (el.tagName === 'text') for (const a of ['font-family', 'font-size', 'font-weight']) c.setAttribute(a, cs.getPropertyValue(a));
    c.removeAttribute('style'); c.removeAttribute('class');
  });
  clone.querySelectorAll('title, .marks').forEach((t) => t.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w); clone.setAttribute('height', h);
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const css = getComputedStyle(document.documentElement);
  const head = title ? 30 : 0, pad = 14;
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = (w + pad * 2) * scale; c.height = (h + head + pad * 2) * scale;
      const ctx = c.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = css.getPropertyValue('--panel').trim();
      ctx.fillRect(0, 0, w + pad * 2, h + head + pad * 2);
      const family = getComputedStyle(document.body).fontFamily;
      if (title) {
        ctx.fillStyle = css.getPropertyValue('--ink').trim();
        ctx.font = `600 14px ${family}`;
        ctx.fillText(title, pad, pad + 14);
        // series keys, right-aligned on the title line
        ctx.font = `12px ${family}`;
        let x = w + pad;
        for (const { name, color } of [...legend].reverse()) {
          x -= ctx.measureText(name).width;
          ctx.fillStyle = css.getPropertyValue('--muted').trim();
          ctx.fillText(name, x, pad + 13);
          x -= 19;
          ctx.fillStyle = css.getPropertyValue(color).trim();
          ctx.fillRect(x, pad + 7, 14, 3);
          x -= 14;
        }
      }
      ctx.drawImage(img, pad, pad + head, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function chartCsv(spec) {
  const s0 = spec.series[0];
  const shared = spec.series.every((s) => s.xs.length === s0.xs.length && s.xs.every((x, i) => x === s0.xs[i]));
  if (shared) return [[spec.x, ...spec.series.map((s) => s.name || spec.y)], ...s0.xs.map((x, i) => [x, ...spec.series.map((s) => s.ys[i])])].map((r) => r.map(csvCell).join(',')).join('\n');
  return [['series', spec.x, spec.y], ...spec.series.flatMap((s) => s.xs.map((x, i) => [s.name, x, s.ys[i]]))].map((r) => r.map(csvCell).join(',')).join('\n');
}
const tableTsv = (table) => [...table.rows].map((r) => [...r.cells].map((c) => c.innerText.trim().replace(/\s+/g, ' ')).join('\t')).join('\n');

function resultsText(sec) {
  const lab = LABS.find((l) => `panel-${l.id}` === sec.id);
  const p = params(lab);
  const lines = [`${lab.tab === 'RGR' ? 'RGR' : `Lab ${lab.tab}`}: ${lab.name}`, `Parameters: ${lab.fields.filter((f) => !f.when || p[f.when[0]] === f.when[1]).map((f) => `${f.label} = ${p[f.key]}`).join(', ')}`];
  const out = $('.out', sec);
  out.querySelectorAll('.big, .eq, .note').forEach((el) => lines.push(el.innerText.trim()));
  out.querySelectorAll('.stats').forEach((st) => {
    const group = st.closest('.panel:not([role])')?.querySelector('h2')?.innerText.trim();
    if (group) lines.push(`${group}:`);
    st.querySelectorAll('.stat').forEach((x) => lines.push(`${group ? '  ' : ''}${$('span', x).innerText.trim()}: ${$('b', x).innerText.trim()}`));
  });
  return lines.join('\n');
}

async function copyAction(btn) {
  const kind = btn.dataset.act, box = btn.closest('[data-copyable]');
  const done = (text) => { btn.textContent = text; setTimeout(() => (btn.textContent = ACTION_LABEL[kind]), 1400); };
  const name = (box?.dataset.title || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    if (kind === 'png') {
      const svg = box.querySelector('.plot svg, .gantt svg, svg');
      const spec = charts.get(box.dataset.chart);
      const legend = spec && spec.series.length > 1 ? spec.series.map((x) => ({ name: x.name, color: x.color }))
        : box.id === 'gantt-box' ? range(7, (i) => ({ name: `lab ${i + 1}`, color: `--c${i + 1}` })) : [];
      try {
        // pass the promise straight to ClipboardItem so Safari keeps the user gesture
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': svgPng(svg, box.dataset.title, legend) })]);
        return done('Copied');
      } catch {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await svgPng(svg, box.dataset.title, legend));
        a.download = `${name}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return done('Downloaded');
      }
    }
    const text = kind === 'csv' ? chartCsv(charts.get(box.dataset.chart))
      : kind === 'table' ? tableTsv(box.querySelector('table'))
      : resultsText(btn.closest('section.panel'));
    await navigator.clipboard.writeText(text);
    done('Copied');
  } catch (e) { console.error(e); done('Failed'); }
}
document.addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'); if (b) copyAction(b); });

// --------------------------------------------------------------- framework --
const nav = $('#nav'), main = $('#labs');
const state = new Map(); // lab id -> { ran, running }

function fieldHtml(lab, f) {
  const id = `${lab.id}-${f.key}`;
  const when = f.when ? ` data-when="${f.when[0]}=${f.when[1]}"` : '';
  if (f.radio) return `<div class="field"${when}><span>${esc(f.label)}</span><div class="seg" role="radiogroup">${f.radio.map(([v, t]) => `<label><input type="radio" name="${f.key}" value="${v}"${v === f.value ? ' checked' : ''}>${t}</label>`).join('')}</div></div>`;
  if (f.options) return `<label class="field" for="${id}"${when}>${esc(f.label)}<select id="${id}" name="${f.key}">${f.options.map((o) => `<option${o === f.value ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
  const type = f.type || 'number';
  const attrs = type === 'number' ? ` min="${f.min}" max="${f.max}" step="${f.step || 1}" required` : ' inputmode="numeric" spellcheck="false"';
  return `<label class="field${f.wide ? ' wide' : ''}" for="${id}"${when}>${esc(f.label)}<input id="${id}" name="${f.key}" type="${type}" value="${esc(f.value)}"${attrs}></label>`;
}

function build() {
  for (const lab of LABS) {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'tab'; b.dataset.lab = lab.id;
    b.setAttribute('aria-controls', `panel-${lab.id}`);
    b.innerHTML = `<span class="lang ${lab.lang}">${lab.lang === 'py' ? 'Py' : 'Kt'}</span>${lab.tab === 'RGR' ? 'RGR' : `Lab ${lab.tab}`}<span class="long muted" style="font-weight:400">· ${esc(lab.name)}</span>`;
    b.onclick = () => select(lab.id, true);
    nav.appendChild(b);

    const sec = document.createElement('section');
    sec.className = 'panel'; sec.id = `panel-${lab.id}`; sec.role = 'tabpanel'; sec.hidden = true;
    sec.innerHTML = `<div class="lab-head"><span class="lang ${lab.lang}">${lab.lang === 'py' ? 'Python' : 'Kotlin → Wasm'}</span><h3>${lab.tab === 'RGR' ? 'RGR' : `Lab ${lab.tab}`}: ${esc(lab.name)}</h3><a href="${lab.src}" target="_blank" rel="noopener">View source</a></div>
      <p class="intro">${lab.intro}</p>
      <form class="params" novalidate>${lab.fields.map((f) => fieldHtml(lab, f)).join('')}<button class="run" type="submit">Run</button></form>
      ${lab.examples ? `<div class="examples"><span>Try</span>${lab.examples.map((e) => `<button type="button" class="chip" data-v="${e}">${e}</button>`).join('')}</div>` : ''}
      ${lab.hint ? `<p class="hint">${lab.hint}</p>` : ''}
      <div class="out" style="margin-top:18px"></div>`;
    main.appendChild(sec);
    state.set(lab.id, { ran: false, running: false });

    const form = $('form', sec);
    const sync = () => sec.querySelectorAll('[data-when]').forEach((el) => {
      const [k, v] = el.dataset.when.split('=');
      el.hidden = new FormData(form).get(k) !== v;
    });
    form.addEventListener('change', sync); sync();
    form.addEventListener('submit', (e) => { e.preventDefault(); run(lab); });
    sec.querySelectorAll('.chip').forEach((c) => c.onclick = () => { form.elements[lab.fields[0].key].value = c.dataset.v; run(lab); });

    if (lab.lang === 'py' && !pyReady) sec.querySelector('.out').before(document.getElementById('py-loading').content.cloneNode(true));
  }
}

function params(lab) {
  const form = $(`#panel-${lab.id} form`);
  const fd = new FormData(form), p = {};
  for (const f of lab.fields) {
    const v = fd.get(f.key);
    p[f.key] = f.type === 'text' || f.options || f.radio ? v : Number(v);
  }
  return p;
}

function invalid(lab, p) {
  for (const f of lab.fields) {
    if (f.type === 'text' || f.options || f.radio) continue;
    const v = p[f.key];
    if (!Number.isFinite(v) || v < f.min || v > f.max || (f.step !== 'any' && !Number.isInteger(v))) return `${f.label} must be ${f.step === 'any' ? 'a number' : 'an integer'} from ${f.min} to ${f.max}.`;
  }
  if (lab.id === 'lab4' && p.n % 2) return 'The FFT needs an even number of samples N.';
  return null;
}

async function run(lab) {
  const st = state.get(lab.id);
  if (st.running) return;
  const sec = $(`#panel-${lab.id}`), btn = $('.run', sec), out = $('.out', sec);
  const p = params(lab);
  const bad = invalid(lab, p);
  if (bad) { out.innerHTML = `<div class="err">${esc(bad)}</div>`; return; }
  st.running = true; st.ran = true;
  btn.disabled = true; btn.textContent = lab.lang === 'py' && !pyReady ? 'Waiting for Python…' : 'Running…';
  out.style.opacity = '.45';
  try {
    const data = await lab.run(p);
    btn.textContent = 'Running…';
    out.innerHTML = `<div class="out-actions">${actions('results')}</div>` + lab.render(data, p);
    drawCharts(out);
    if (lab.id === 'rgr') bindGantt(out, data);
  } catch (e) {
    console.error(e);
    out.innerHTML = `<div class="err">${esc(e.message || e)}</div>`;
  } finally {
    st.running = false; btn.disabled = false; btn.textContent = 'Run'; out.style.opacity = '';
  }
}

function bindGantt(out, d) {
  const tabs = out.querySelectorAll('#gantt-tabs .tab'), el = $('#gantt', out);
  let cur = 'fifo';
  tabs.forEach((t) => t.onclick = () => { tabs.forEach((x) => x.setAttribute('aria-selected', x === t)); cur = t.dataset.algo; drawGantt(el, d, cur); });
  drawGantt(el, d, cur);
  new ResizeObserver(() => drawGantt(el, d, cur)).observe(out);
}

function select(id, push) {
  const lab = LABS.find((l) => l.id === id) || LABS[0];
  nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.lab === lab.id));
  main.querySelectorAll('section.panel[role="tabpanel"]').forEach((s) => s.hidden = s.id !== `panel-${lab.id}`);
  if (push) try { history.replaceState(null, '', `#${lab.id}`); } catch {}
  document.title = `${lab.tab === 'RGR' ? 'RGR' : `Lab ${lab.tab}`} · Embedded Systems Labs`;
  if (!state.get(lab.id).ran) run(lab);
  else drawCharts($(`#panel-${lab.id}`));
}

build();
// elapsed counter for the Python loading notices
const started = Date.now();
const tick = setInterval(() => {
  if (pyReady) return clearInterval(tick);
  const sec = Math.round((Date.now() - started) / 1000);
  document.querySelectorAll('.py-status').forEach((el) => {
    $('.elapsed', el).textContent = sec ? `${sec} s` : '';
    if (sec >= 45) { el.classList.add('slow'); $('.note-text', el).textContent = 'This is taking longer than usual. Check your connection, or reload the page.'; }
  });
}, 1000);
select(location.hash.slice(1), false);
window.addEventListener('hashchange', () => select(location.hash.slice(1), false));
