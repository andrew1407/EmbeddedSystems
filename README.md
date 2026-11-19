# EmbeddedSystems

<p align="center">
  <a href="https://andrew1407.github.io/EmbeddedSystems/" title="Open the labs in the browser">
    <img src="web/icon.svg" alt="Embedded Systems Labs" width="140" height="140">
  </a>
</p>

[![pages deploy badge](https://github.com/andrew1407/EmbeddedSystems/actions/workflows/pages.yml/badge.svg)](https://andrew1407.github.io/EmbeddedSystems/)

A collection of university lab works on embedded and real-time systems, implemented in Python and Kotlin. The Python labs cover signal modeling and processing plus a real-time scheduling study; the Kotlin labs are Android apps demonstrating a Fermat factorization, a perceptron, and a genetic algorithm.

## Labs

| Lab | Topic | Language |
| --- | --- | --- |
| [`1-lab`](1-lab/1-lab.py) | Random harmonic signal generation; mean and variance; computational complexity vs. number of harmonics | Python |
| [`2-lab`](2-lab/2-lab.py) | Auto- and cross-correlation; `list` vs. `array` performance comparison | Python |
| [`3-lab`](3-lab/3-lab.py) | Discrete Fourier transform (DFT); `list` vs. `array` performance comparison | Python |
| [`4-lab`](4-lab/4-lab.py) | Fast Fourier transform (FFT) with memoization, compared against DFT | Python |
| [`5-lab`](5-lab) | Fermat factorization of an integer (Android app) | Kotlin |
| [`6-lab`](6-lab) | Perceptron learning with iteration/time deadlines (Android app) | Kotlin |
| [`7-lab`](7-lab) | Genetic algorithm solving a linear equation `a·x1 + b·x2 + c·x3 + d·x4 = y` (Android app) | Kotlin |
| [`rgr`](rgr/main.py) | Real-time task scheduling: FIFO, Earliest Deadline First (EDF), and Rate Monotonic (RM) over an Erlang/Poisson task flow, with plots and JSON output | Python |

## Showcase

**[Open the labs in the browser](https://andrew1407.github.io/EmbeddedSystems/)**. Every lab runs from its own source code, with adjustable parameters, interactive charts, and buttons to copy each chart (PNG or CSV), table and set of results.

- **Python labs (1–4, `rgr`)** run in [Pyodide](https://pyodide.org), in a Web Worker so the page never freezes. [`web/showcase.py`](web/showcase.py) loads each lab script's functions (skipping its top-level plotting code) and calls them. The `rgr/scheduling` package is imported unchanged.
- **Kotlin labs (5–7)** are compiled to WebAssembly from the Android projects' algorithm sources (`FermaFunction.kt`, `perceptron/`, `geneticAlgorithm/`) by the Kotlin/Wasm build in [`web/kotlin`](web/kotlin). The Android UI files are left out.

Run it locally (needs JDK 17+):

```sh
cd web/kotlin && ./gradlew showcase && cd ../..   # builds web/kotlin-wasm/
python -m http.server                             # then open http://localhost:8000/web/
```

The [pages workflow](.github/workflows/pages.yml) builds and deploys it on every push to `main`.

## Tech stack

- **Python** with `matplotlib` for the signal-processing labs and the [`rgr`](rgr) scheduling project.
- **Kotlin / Android** ([`5-lab`](5-lab), [`6-lab`](6-lab), [`7-lab`](7-lab)): Android Gradle Plugin 4.1.2, Kotlin 1.4.31, Gradle 6.5, `compileSdk`/`targetSdk` 30, `minSdk` 16, Java 8.

## How to run

### Python labs (1–4)

Each lab is a single self-contained script that prints results and opens `matplotlib` plots:

```sh
pip install matplotlib
python 1-lab/1-lab.py
```

Substitute [`2-lab/2-lab.py`](2-lab/2-lab.py), [`3-lab/3-lab.py`](3-lab/3-lab.py), or [`4-lab/4-lab.py`](4-lab/4-lab.py) as needed.

### Scheduling project (`rgr`)

Run from inside the [`rgr`](rgr) directory so the local [`scheduling`](rgr/scheduling) and [`plots`](rgr/plots.py) modules resolve. It writes generated tasks and per-algorithm timelines as JSON to `out/json` and plots to `out/imgs`, and prints average wait time and missed deadlines per algorithm.

```sh
pip install matplotlib
cd rgr
python main.py
```

### Kotlin / Android labs (5–7)

Each lab is a standalone Gradle/Android project. Build or install on a device or emulator:

```sh
cd 5-lab
./gradlew assembleDebug      # build the APK
./gradlew installDebug       # install on a connected device/emulator
```

The same commands apply to [`6-lab`](6-lab) and [`7-lab`](7-lab). The projects can also be opened directly in Android Studio.

## Project structure

```
EmbeddedSystems/
├── 1-lab/1-lab.py            # signal generation, mean/variance, complexity
├── 2-lab/2-lab.py            # correlation, list vs. array timing
├── 3-lab/3-lab.py            # DFT, list vs. array timing
├── 4-lab/4-lab.py            # FFT vs. DFT
├── 5-lab/                    # Android app: Fermat factorization
│   └── app/src/main/java/com/diches/embeddedsystems/
├── 6-lab/                    # Android app: perceptron
│   └── app/src/main/java/com/diches/embeddedsystems/perceptron/
├── 7-lab/                    # Android app: genetic algorithm
│   └── app/src/main/java/com/diches/embeddedsystems/geneticAlgorithm/
├── rgr/                      # real-time scheduling study
│   ├── main.py
│   ├── plots.py
│   └── scheduling/
│       ├── flow.py           # Erlang/Poisson task flow
│       ├── fifo.py           # FIFO scheduler
│       ├── edf.py            # Earliest Deadline First
│       ├── rm.py             # Rate Monotonic
│       ├── priority_scheduler.py
│       ├── analyzer.py       # wait time, idle, missed deadlines
│       ├── datastructs.py
│       └── tools.py
└── web/                      # GitHub Pages showcase
    ├── index.html, app.js    # page, charts, copy buttons
    ├── pyworker.js, worker.js, bridge.py, showcase.py, pyodide.toml   # Python labs in a Pyodide worker
    ├── kt-worker.js          # runs the Kotlin/Wasm labs in a module worker
    ├── icon.svg              # logo / favicon
    └── kotlin/               # Kotlin/Wasm build of labs 5–7
```
