"""Browser-side glue for the GitHub Pages showcase.

The lab scripts (1-lab ... 4-lab) are written to be run top to bottom: they
compute, print and open matplotlib windows. Here each script's source is
parsed and only its imports (minus matplotlib), constants, lambdas and
functions are executed, so the page calls the lab's own functions with
user-chosen parameters and draws the results itself. The scripts are untouched.
The rgr scheduling package is imported as is.
"""
import ast
from dataclasses import asdict
from time import perf_counter
from array import array
from math import log
import scheduling

ROUND = 6
SERIES_LIMIT = 1024  # keep payloads small: the page never needs more points than this


def load_lab(path: str) -> dict:
  tree = ast.parse(open(path).read(), path)
  keep = []
  for node in tree.body:
    match node:
      case ast.Import() | ast.ImportFrom():
        names = [getattr(node, 'module', None) or ''] + [a.name for a in node.names]
        if not any(n.startswith('matplotlib') for n in names): keep.append(node)
      case ast.FunctionDef() | ast.ClassDef():
        keep.append(node)
      case ast.Assign(targets=[ast.Attribute()]):
        keep.append(node)  # e.g. `memoize.memoized = dict()` in lab 4
      case ast.Assign(targets=[ast.Name(id=name)], value=value) if name.isupper() or isinstance(value, ast.Lambda):
        keep.append(node)
  ns = dict(__name__=path)
  exec(compile(ast.Module(keep, type_ignores=[]), path, 'exec'), ns)
  return ns


LABS = {i: load_lab(f'labs/{i}-lab.py') for i in range(1, 5)}


def r(v): return round(float(v), ROUND)
def rl(xs): return [r(v) for v in list(xs)[:SERIES_LIMIT]]
def ms(seconds): return round(seconds * 1000, 3)


def timed(fn, *args, **kw):
  start = perf_counter()
  res = fn(*args, **kw)
  return res, perf_counter() - start


def lab1(harmonics, w_max, n, step, points):
  L = LABS[1]
  t, x = L['calcSignal'](harmonics=harmonics, wMax=w_max, dCalls=n)
  mx = L['getMx'](x)
  dx = L['getDx'](x, mx, n)
  # getComplexityParams always uses the module's DCALLS for the variance step
  hs, gen_time, param_time = L['getComplexityParams'](step, points + 1)
  return dict(
    t=t, x=rl(x), mx=r(mx), dx=r(dx),
    harmonics=[int(h) for h in hs], ln_harmonics=rl(log(h) for h in hs),
    gen_ms=[ms(v) for v in gen_time],
    # the lab records signalEnd - paramsEnd (negative); flip the sign to show a duration
    param_ms=[ms(-v) for v in param_time],
  )


def lab2(harmonics, w_max, n, step, points):
  L = LABS[2]
  L['DCALLS'] = n  # calcSignal's defaults are bound at definition time, so pass n explicitly
  interval = L['getInterval'](n)
  t1, x1 = L['calcSignal'](harmonics=harmonics, wMax=w_max, dCalls=n)
  t2, x2 = L['calcSignal'](harmonics=harmonics, wMax=w_max, dCalls=n)
  m1, m2 = L['getMx'](x1), L['getMx'](x2)
  auto = L['calcCorrelation']((x1,), (m1,), interval)
  cross, list_time = timed(L['calcCorrelation'], (x1, x2), (m1, m2), interval)
  _, array_time = timed(L['calcCorrelation'], (array('f', x1), array('f', x2)), (m1, m2), interval)
  self_c = L['getCorrelationComplexity'](step, points + 1)
  pair_c = L['getCorrelationComplexity'](step, points + 1, False)
  _, _, pair_arr = L['getCorrelationComplexity'](step, points + 1, False, 'array')
  return dict(
    t=list(t1), x1=rl(x1), x2=rl(x2), interval=interval,
    auto=dict(t=auto[0], r=rl(auto[1])), cross=dict(t=cross[0], r=rl(cross[1])),
    list_ms=ms(list_time), array_ms=ms(array_time),
    sizes=[int(v) for v in self_c[0]],
    self_ms=[ms(v) for v in self_c[1]], pair_ms=[ms(v) for v in pair_c[1]],
    pair_list_ms=[ms(v) for v in pair_c[2]], pair_array_ms=[ms(v) for v in pair_arr],
  )


def lab3(harmonics, w_max, n, step, points):
  L = LABS[3]
  t, x = L['calcSignal'](harmonics=harmonics, wMax=w_max, dCalls=n)
  spectrum, list_time = timed(L['calcDTF'], x)
  _, array_time = timed(L['calcDTF'], x, containerType='array')
  sizes, c_list, c_arr = L['calcComplexity'](step, points + 1)
  return dict(
    t=t, x=rl(x), spectrum=rl(spectrum), list_ms=ms(list_time), array_ms=ms(array_time),
    sizes=[int(v) for v in sizes], c_list_ms=[ms(v) for v in c_list], c_array_ms=[ms(v) for v in c_arr],
  )


def lab4(harmonics, w_max, n, step, points):
  L = LABS[4]
  L['memoize'].memoized.clear()  # a fresh script run starts with an empty cache
  t, x = L['calcSignal'](harmonics=harmonics, wMax=w_max, dCalls=n)
  fft, fft_time = timed(L['calcFFT'], x)
  dft, dft_time = timed(L['calcDTF'], x)
  sizes, c_time = L['calcComplexity'](step, points + 1)
  return dict(
    t=t, x=rl(x), fft=rl(fft), dft=rl(dft), fft_ms=ms(fft_time), dft_ms=ms(dft_time),
    max_diff=r(max(abs(a - b) for a, b in zip(fft, dft))),
    sizes=[int(v) for v in sizes], c_ms=[ms(v) for v in c_time],
  )


ALGORITHMS = dict(fifo=scheduling.fifo, edf=scheduling.earliest_deadline_first, rm=scheduling.rate_monotonic)
# rgr/main.py: average execution time of each lab, used as the task WCETs
EXECUTION_TIME = [0.01133, 0.00427, 0.00852, 0.00443, 0.00159, 0.02322, 0.01025]


def gen_tasks(order, interval, intensity, size):
  flow = scheduling.erlang_tasks_flow(order, interval, intensity, EXECUTION_TIME)
  return [next(flow) for _ in range(size)]


def rgr(order, interval, intensity, size, size_step, size_max, intensity_max):
  tasks = gen_tasks(order, interval, intensity, size)
  runs = {}
  for name, fn in ALGORITHMS.items():
    res = fn(tasks)
    runs[name] = dict(
      wait_avg=r(res.wait_time_avg), idle=r(res.idle), missed=res.missed_deadlines,
      timeline=[asdict(t) for t in res.timeline],
    )
  # rgr/main.py first_plot: average wait vs queue size
  by_size = {k: [] for k in ALGORITHMS}
  sizes = list(range(size_step, size_max + 1, size_step))
  for s in sizes:
    q = gen_tasks(order, interval, intensity, s)
    for name, fn in ALGORITHMS.items(): by_size[name].append(r(fn(q).wait_time_avg))
  # rgr/main.py second_third_plots: average wait and idle vs intensity
  intensities = list(range(1, intensity_max + 1))
  by_int = {k: dict(wait=[], idle=[]) for k in ALGORITHMS}
  for lam in intensities:
    q = gen_tasks(order, interval, lam, size)
    for name, fn in ALGORITHMS.items():
      res = fn(q)
      by_int[name]['wait'].append(r(res.wait_time_avg))
      by_int[name]['idle'].append(r(res.idle))
  return dict(
    tasks=[asdict(t) for t in tasks], runs=runs,
    sizes=sizes, by_size=by_size, intensities=intensities, by_intensity=by_int,
  )


RUNNERS = dict(lab1=lab1, lab2=lab2, lab3=lab3, lab4=lab4, rgr=rgr)
