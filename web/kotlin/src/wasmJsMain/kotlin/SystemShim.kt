// The lab sources call System.currentTimeMillis(), which is java.lang.System on Android.
// Kotlin/Wasm has no java.lang, so each lab package gets a same-named object that the
// unqualified call resolves to. Only differences between calls are used, so a monotonic
// clock is enough.
package com.diches.embeddedsystems

import kotlin.time.TimeSource

private val origin = TimeSource.Monotonic.markNow()

internal fun nowMillis(): Long = origin.elapsedNow().inWholeMilliseconds

internal object System {
    fun currentTimeMillis(): Long = nowMillis()
}
