// See SystemShim.kt.
package com.diches.embeddedsystems.geneticAlgorithm

internal object System {
    fun currentTimeMillis(): Long = com.diches.embeddedsystems.nowMillis()
}
