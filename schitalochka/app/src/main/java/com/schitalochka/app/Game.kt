package com.schitalochka.app

import kotlin.random.Random

/** Возрастные уровни сложности. */
enum class Difficulty(
    val title: String,
    val subtitle: String,
    val emoji: String
) {
    MALYSH("Малыш", "3–4 года · счёт до 5", "🐣"),
    DOSHKOLNIK("Дошкольник", "5–6 лет · счёт до 10", "🦊"),
    UMNIK("Умник", "7+ лет · сложение и вычитание", "🦉")
}

/** Тип задания. */
enum class QuestionType { COUNT, ADD, SUB }

/** Одно задание раунда. */
data class Question(
    val type: QuestionType,
    val emojis: List<String>,   // объекты для пересчёта (для COUNT)
    val prompt: String,         // текст примера (для ADD/SUB)
    val options: List<Int>,     // варианты ответов
    val answer: Int             // правильный ответ
)

/** Сколько заданий в одном раунде. */
const val QUESTIONS_PER_ROUND = 10

private val COUNT_EMOJIS = listOf(
    "🍎", "🍓", "🍌", "🍊", "🐱", "🐶", "🐰", "🐠", "⭐", "🌸", "🚗", "🎈", "🦋", "🐞"
)

/** Генератор заданий под выбранный уровень. */
object QuestionFactory {

    fun next(difficulty: Difficulty): Question = when (difficulty) {
        Difficulty.MALYSH -> count(maxCount = 5)
        Difficulty.DOSHKOLNIK -> count(maxCount = 10)
        Difficulty.UMNIK -> arithmetic()
    }

    private fun count(maxCount: Int): Question {
        val answer = Random.nextInt(1, maxCount + 1)
        val emoji = COUNT_EMOJIS.random()
        return Question(
            type = QuestionType.COUNT,
            emojis = List(answer) { emoji },
            prompt = "Сколько здесь?",
            options = buildOptions(answer, min = 1, max = maxCount),
            answer = answer
        )
    }

    private fun arithmetic(): Question {
        val isAdd = Random.nextBoolean()
        return if (isAdd) {
            val a = Random.nextInt(1, 11)
            val b = Random.nextInt(1, 11)
            val answer = a + b
            Question(
                type = QuestionType.ADD,
                emojis = emptyList(),
                prompt = "$a + $b = ?",
                options = buildOptions(answer, min = 0, max = 20),
                answer = answer
            )
        } else {
            val a = Random.nextInt(2, 21)
            val b = Random.nextInt(1, a)
            val answer = a - b
            Question(
                type = QuestionType.SUB,
                emojis = emptyList(),
                prompt = "$a − $b = ?",
                options = buildOptions(answer, min = 0, max = 20),
                answer = answer
            )
        }
    }

    /** Три варианта ответа: правильный + два уникальных «обманки» в допустимом диапазоне. */
    private fun buildOptions(answer: Int, min: Int, max: Int): List<Int> {
        val options = linkedSetOf(answer)
        var guard = 0
        while (options.size < 3 && guard < 100) {
            guard++
            val delta = Random.nextInt(1, 4) * if (Random.nextBoolean()) 1 else -1
            val candidate = (answer + delta).coerceIn(min, max)
            options.add(candidate)
        }
        // На редкий случай, если диапазон слишком узкий — добиваем любыми значениями.
        var filler = min
        while (options.size < 3 && filler <= max) {
            options.add(filler)
            filler++
        }
        return options.shuffled()
    }
}

/** Звёзды по результату раунда. */
fun starsFor(correct: Int): Int = when {
    correct >= 9 -> 3
    correct >= 7 -> 2
    correct >= 5 -> 1
    else -> 0
}
