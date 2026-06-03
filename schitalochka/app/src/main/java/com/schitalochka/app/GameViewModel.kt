package com.schitalochka.app

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel

enum class Screen { MENU, PLAYING, RESULT }

/** Результат проверки последнего ответа для обратной связи. */
enum class AnswerFeedback { NONE, CORRECT, WRONG }

class GameViewModel(app: Application) : AndroidViewModel(app) {

    private val prefs = app.getSharedPreferences("schitalochka_prefs", Application.MODE_PRIVATE)

    var screen by mutableStateOf(Screen.MENU)
        private set

    var difficulty by mutableStateOf(Difficulty.MALYSH)
        private set

    var question by mutableStateOf(QuestionFactory.next(Difficulty.MALYSH))
        private set

    /** Номер текущего задания, 1..QUESTIONS_PER_ROUND. */
    var questionNumber by mutableStateOf(1)
        private set

    var correctCount by mutableStateOf(0)
        private set

    /** Выбранный игроком вариант (для подсветки). null — пока не отвечал. */
    var selectedOption by mutableStateOf<Int?>(null)
        private set

    var feedback by mutableStateOf(AnswerFeedback.NONE)
        private set

    /** Лучшее число звёзд за уровень — сохраняется между запусками. */
    fun bestStars(d: Difficulty): Int = prefs.getInt("best_stars_${d.name}", 0)

    fun startGame(d: Difficulty) {
        difficulty = d
        questionNumber = 1
        correctCount = 0
        selectedOption = null
        feedback = AnswerFeedback.NONE
        question = QuestionFactory.next(d)
        screen = Screen.PLAYING
    }

    /**
     * Обрабатывает выбор варианта. Возвращает true, если ответ верный.
     * Пока [feedback] != NONE, повторные нажатия игнорируются.
     */
    fun answer(option: Int): Boolean {
        if (feedback != AnswerFeedback.NONE) return false
        selectedOption = option
        val correct = option == question.answer
        if (correct) correctCount++
        feedback = if (correct) AnswerFeedback.CORRECT else AnswerFeedback.WRONG
        return correct
    }

    /** Переход к следующему заданию или к экрану результата. */
    fun advance() {
        if (feedback == AnswerFeedback.NONE) return
        if (questionNumber >= QUESTIONS_PER_ROUND) {
            saveBest()
            screen = Screen.RESULT
            return
        }
        questionNumber++
        selectedOption = null
        feedback = AnswerFeedback.NONE
        question = QuestionFactory.next(difficulty)
    }

    private fun saveBest() {
        val stars = starsFor(correctCount)
        if (stars > bestStars(difficulty)) {
            prefs.edit().putInt("best_stars_${difficulty.name}", stars).apply()
        }
    }

    fun backToMenu() {
        screen = Screen.MENU
    }
}
