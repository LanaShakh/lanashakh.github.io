package com.schitalochka.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.schitalochka.app.AnswerFeedback
import com.schitalochka.app.Difficulty
import com.schitalochka.app.GameViewModel
import com.schitalochka.app.QUESTIONS_PER_ROUND
import com.schitalochka.app.QuestionType
import com.schitalochka.app.SoundManager
import com.schitalochka.app.starsFor
import kotlinx.coroutines.delay

@Composable
fun MenuScreen(vm: GameViewModel) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("🔢", fontSize = 72.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "Считалочка",
                style = MaterialTheme.typography.headlineLarge,
                color = Purple
            )
            Text(
                "Учимся считать, играя",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(Modifier.height(32.dp))

            Difficulty.entries.forEach { d ->
                DifficultyCard(
                    difficulty = d,
                    bestStars = vm.bestStars(d),
                    onClick = { vm.startGame(d) }
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun DifficultyCard(difficulty: Difficulty, bestStars: Int, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(difficulty.emoji, fontSize = 44.sp)
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    difficulty.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    difficulty.subtitle,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            Text(
                buildString { repeat(3) { append(if (it < bestStars) "⭐" else "☆") } },
                fontSize = 18.sp
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GameScreen(vm: GameViewModel, sound: SoundManager) {
    val q = vm.question
    val feedback = vm.feedback

    // Звук + автопереход после ответа.
    LaunchedEffect(vm.questionNumber, feedback) {
        when (feedback) {
            AnswerFeedback.CORRECT -> {
                sound.playCorrect()
                delay(800)
                vm.advance()
            }
            AnswerFeedback.WRONG -> {
                sound.playWrong()
                delay(1100)
                vm.advance()
            }
            AnswerFeedback.NONE -> {}
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Прогресс раунда.
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Задание ${vm.questionNumber} из $QUESTIONS_PER_ROUND",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(Modifier.weight(1f))
                Text("⭐ ${vm.correctCount}", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = vm.questionNumber.toFloat() / QUESTIONS_PER_ROUND,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
                color = Purple,
                trackColor = Purple.copy(alpha = 0.15f)
            )

            Spacer(Modifier.height(24.dp))

            // Условие задания.
            Text(
                q.prompt,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(Modifier.height(16.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                if (q.type == QuestionType.COUNT) {
                    FlowRow(
                        horizontalArrangement = Arrangement.Center,
                        verticalArrangement = Arrangement.Center
                    ) {
                        q.emojis.forEach { e ->
                            Text(e, fontSize = 52.sp, modifier = Modifier.padding(6.dp))
                        }
                    }
                } else {
                    Text(
                        q.prompt,
                        style = MaterialTheme.typography.displayLarge,
                        color = Purple
                    )
                }
            }

            // Варианты ответов.
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                q.options.forEach { option ->
                    AnswerButton(
                        value = option,
                        state = optionState(option, vm),
                        onClick = { vm.answer(option) }
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

private enum class OptionState { IDLE, CORRECT, WRONG, DISABLED }

private fun optionState(option: Int, vm: GameViewModel): OptionState = when {
    vm.feedback == AnswerFeedback.NONE -> OptionState.IDLE
    option == vm.question.answer -> OptionState.CORRECT
    option == vm.selectedOption -> OptionState.WRONG
    else -> OptionState.DISABLED
}

@Composable
private fun AnswerButton(value: Int, state: OptionState, onClick: () -> Unit) {
    val targetColor = when (state) {
        OptionState.IDLE -> Color.White
        OptionState.CORRECT -> Grass
        OptionState.WRONG -> Coral
        OptionState.DISABLED -> Color.White.copy(alpha = 0.5f)
    }
    val scale by animateFloatAsState(
        targetValue = if (state == OptionState.CORRECT) 1.12f else 1f,
        animationSpec = tween(250),
        label = "answerScale"
    )
    val textColor = if (state == OptionState.IDLE || state == OptionState.DISABLED) Purple else Color.White

    Card(
        modifier = Modifier
            .size(96.dp)
            .scale(scale)
            .clickable(enabled = state == OptionState.IDLE, onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = targetColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("$value", fontSize = 40.sp, fontWeight = FontWeight.Black, color = textColor)
        }
    }
}

@Composable
fun ResultScreen(vm: GameViewModel) {
    val correct = vm.correctCount
    val stars = starsFor(correct)
    val message = when {
        stars == 3 -> "Превосходно!"
        stars == 2 -> "Молодец!"
        stars == 1 -> "Хорошо!"
        else -> "Попробуем ещё?"
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AnimatedVisibility(
                visible = true,
                enter = scaleIn(tween(400)) + fadeIn()
            ) {
                Text(
                    buildString { repeat(3) { append(if (it < stars) "⭐" else "☆") } },
                    fontSize = 56.sp
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(message, style = MaterialTheme.typography.headlineLarge, color = Purple)
            Spacer(Modifier.height(8.dp))
            Text(
                "Правильных ответов: $correct из $QUESTIONS_PER_ROUND",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(40.dp))

            BigButton(text = "Играть ещё", color = Grass) { vm.startGame(vm.difficulty) }
            Spacer(Modifier.height(16.dp))
            BigButton(text = "В меню", color = Purple) { vm.backToMenu() }
        }
    }
}

@Composable
fun BigButton(text: String, color: Color, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = color),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(text, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}
