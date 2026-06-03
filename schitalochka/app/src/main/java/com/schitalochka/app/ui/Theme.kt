package com.schitalochka.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Purple = Color(0xFF7C4DFF)
val PurpleDark = Color(0xFF5E35B1)
val Sunny = Color(0xFFFFC107)
val Grass = Color(0xFF4CAF50)
val Coral = Color(0xFFFF5252)
val Sky = Color(0xFF40C4FF)
val Cream = Color(0xFFFFF8E1)

private val ColorScheme = lightColorScheme(
    primary = Purple,
    onPrimary = Color.White,
    secondary = Sunny,
    background = Cream,
    onBackground = Color(0xFF2E2A40),
    surface = Color.White,
    onSurface = Color(0xFF2E2A40),
    error = Coral
)

private val AppTypography = Typography(
    displayLarge = TextStyle(fontSize = 64.sp, fontWeight = FontWeight.Black),
    headlineLarge = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.ExtraBold),
    titleLarge = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold),
    bodyLarge = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Medium)
)

@Composable
fun SchitalochkaTheme(content: @Composable () -> Unit) {
    // Тема светлая всегда — детское приложение, тёмную не используем.
    MaterialTheme(
        colorScheme = ColorScheme,
        typography = AppTypography,
        content = content
    )
}
