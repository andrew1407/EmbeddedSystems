@file:OptIn(kotlin.js.ExperimentalJsExport::class)

import com.diches.embeddedsystems.FermaFunction
import com.diches.embeddedsystems.InputErrors
import com.diches.embeddedsystems.geneticAlgorithm.GeneticCycle
import com.diches.embeddedsystems.perceptron.Perceptron

// JS-facing entry points. Each one mirrors what the lab's InputHandler does on "Calculate"
// and returns a small JSON string for the page to render.

private fun q(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

/** 5-lab: same input checks and result mapping as 5-lab InputHandler.submitOnClick. */
@JsExport
fun fermat(input: String): String {
    val error = when {
        input.isEmpty() -> InputErrors.IS_EMPTY
        !Regex("""\d+""").matches(input) -> InputErrors.NOT_INT
        input.toLongOrNull() == null -> InputErrors.NOT_INT
        else -> null
    }
    if (error != null) return """{"error":${q(error.msg)}}"""
    val (time, res) = FermaFunction(input.toLong())
    val (a, b) = res
    val err = when {
        a == 0L && b == 0L -> InputErrors.IS_EVEN
        a == -1L && b == -1L -> InputErrors.NOT_FACTORIZED
        a == -2L && b == -2L -> InputErrors.OUT_OF_TIME
        else -> null
    }
    return if (err != null) """{"time":$time,"error":${q(err.msg)}}"""
    else """{"time":$time,"a":"$a","b":"$b"}"""
}

/** 6-lab: deadline is seconds when byTime, otherwise an iteration count. */
@JsExport
fun perceptron(threshold: Int, learningRate: Float, byTime: Boolean, deadline: Float): String {
    val p = Perceptron(threshold, learningRate)
    val r = if (byTime) p.calcWeights(deadline) else p.calcWeights(deadline.toInt())
    return """{"w1":${r.values[0]},"w2":${r.values[1]},"time":${r.timeElapsed},"iterations":${r.iterations}}"""
}

/** 7-lab: a·x1 + b·x2 + c·x3 + d·x4 = y with the given population size. */
@JsExport
fun genetic(y: Int, population: Int, a: Int, b: Int, c: Int, d: Int): String {
    val coefs = listOf(a, b, c, d)
    val (time, solution) = GeneticCycle(y, population, coefs).findSolution()
    val outOfTime = time > 3000
    return """{"time":$time,"outOfTime":$outOfTime,"x":[${solution.joinToString(",")}]}"""
}
