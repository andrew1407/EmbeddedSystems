// See SystemShim.kt.
package com.diches.embeddedsystems.perceptron

internal object System {
    fun currentTimeMillis(): Long = com.diches.embeddedsystems.nowMillis()
}
