package com.schitalochka.app

import android.media.AudioManager
import android.media.ToneGenerator

/**
 * Простые звуки без аудио-ассетов: системный тон-генератор.
 * Правильный ответ — короткий весёлый «бип», неправильный — низкий короткий сигнал.
 */
class SoundManager {

    private var enabled = true
    private var tone: ToneGenerator? = try {
        ToneGenerator(AudioManager.STREAM_MUSIC, 80)
    } catch (_: RuntimeException) {
        null
    }

    fun setEnabled(value: Boolean) {
        enabled = value
    }

    fun playCorrect() {
        if (!enabled) return
        runCatching { tone?.startTone(ToneGenerator.TONE_PROP_BEEP2, 180) }
    }

    fun playWrong() {
        if (!enabled) return
        runCatching { tone?.startTone(ToneGenerator.TONE_SUP_ERROR, 200) }
    }

    fun release() {
        runCatching { tone?.release() }
        tone = null
    }
}
