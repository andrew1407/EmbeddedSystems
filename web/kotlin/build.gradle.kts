// Compiles the Android labs' own algorithm sources (5-lab, 6-lab, 7-lab) to WebAssembly
// for the GitHub Pages showcase. The Android UI files (MainActivity, InputHandler) are left out;
// src/wasmJsMain adds the JS-facing entry points and a tiny System.currentTimeMillis() shim.
plugins {
    kotlin("multiplatform") version "2.3.0"
}

val labSources = tasks.register<Sync>("labSources") {
    val app = "app/src/main/java/com/diches/embeddedsystems"
    from("../../5-lab/$app") { include("FermaFunction.kt", "InputErrors.kt") }
    from("../../6-lab/$app") { include("perceptron/*.kt") ; into("") }
    from("../../7-lab/$app") { include("geneticAlgorithm/*.kt") }
    into(layout.buildDirectory.dir("labSources"))
}

kotlin {
    @OptIn(org.jetbrains.kotlin.gradle.ExperimentalWasmDsl::class)
    wasmJs {
        outputModuleName.set("labs")
        browser()
        binaries.executable()
    }
    sourceSets {
        val wasmJsMain by getting {
            kotlin.srcDir(labSources)
        }
    }
}

// ./gradlew showcase  ->  web/kotlin-wasm/{labs.mjs, labs.uninstantiated.mjs, labs.wasm}
tasks.register<Sync>("showcase") {
    dependsOn("wasmJsProductionExecutableCompileSync")
    from(layout.buildDirectory.dir("compileSync/wasmJs/main/productionExecutable/optimized")) {
        include("labs.mjs", "labs.uninstantiated.mjs", "labs.wasm")
    }
    into("../kotlin-wasm")
}
