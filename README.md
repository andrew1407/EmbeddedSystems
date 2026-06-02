# EmbeddedSystems

A collection of university lab works on embedded and real-time systems, implemented in Python and Kotlin. The Python labs cover signal modeling and processing plus a real-time scheduling study; the Kotlin labs are Android apps demonstrating a Fermat factorization, a perceptron, and a genetic algorithm.

## Labs

| Lab | Topic | Language |
| --- | --- | --- |
| `1-lab` | Random harmonic signal generation; mean and variance; computational complexity vs. number of harmonics | Python |
| `2-lab` | Auto- and cross-correlation; `list` vs. `array` performance comparison | Python |
| `3-lab` | Discrete Fourier transform (DFT); `list` vs. `array` performance comparison | Python |
| `4-lab` | Fast Fourier transform (FFT) with memoization, compared against DFT | Python |
| `5-lab` | Fermat factorization of an integer (Android app) | Kotlin |
| `6-lab` | Perceptron learning with iteration/time deadlines (Android app) | Kotlin |
| `7-lab` | Genetic algorithm solving a linear equation `a·x1 + b·x2 + c·x3 + d·x4 = y` (Android app) | Kotlin |
| `rgr` | Real-time task scheduling: FIFO, Earliest Deadline First (EDF), and Rate Monotonic (RM) over an Erlang/Poisson task flow, with plots and JSON output | Python |

## Tech stack

- **Python** with `matplotlib` for the signal-processing labs and the `rgr` scheduling project.
- **Kotlin / Android** (`5-lab`, `6-lab`, `7-lab`): Android Gradle Plugin 4.1.2, Kotlin 1.4.31, Gradle 6.5, `compileSdk`/`targetSdk` 30, `minSdk` 16, Java 8.

## How to run

### Python labs (1–4)

Each lab is a single self-contained script that prints results and opens `matplotlib` plots:

```sh
pip install matplotlib
python 1-lab/1-lab.py
```

Substitute `2-lab/2-lab.py`, `3-lab/3-lab.py`, or `4-lab/4-lab.py` as needed.

### Scheduling project (`rgr`)

Run from inside the `rgr` directory so the local `scheduling` and `plots` modules resolve. It writes generated tasks and per-algorithm timelines as JSON to `out/json` and plots to `out/imgs`, and prints average wait time and missed deadlines per algorithm.

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

The same commands apply to `6-lab` and `7-lab`. The projects can also be opened directly in Android Studio.

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
└── rgr/                      # real-time scheduling study
    ├── main.py
    ├── plots.py
    └── scheduling/
        ├── flow.py           # Erlang/Poisson task flow
        ├── fifo.py           # FIFO scheduler
        ├── edf.py            # Earliest Deadline First
        ├── rm.py             # Rate Monotonic
        ├── priority_scheduler.py
        ├── analyzer.py       # wait time, idle, missed deadlines
        ├── datastructs.py
        └── tools.py
```
