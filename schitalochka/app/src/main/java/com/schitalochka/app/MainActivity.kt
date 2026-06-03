package com.schitalochka.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.schitalochka.app.ui.GameScreen
import com.schitalochka.app.ui.MenuScreen
import com.schitalochka.app.ui.ResultScreen
import com.schitalochka.app.ui.SchitalochkaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            SchitalochkaTheme {
                val vm: GameViewModel = viewModel()

                // Звук живёт ровно столько, сколько экран.
                val sound = remember { SoundManager() }
                DisposableEffect(Unit) {
                    onDispose { sound.release() }
                }

                when (vm.screen) {
                    Screen.MENU -> MenuScreen(vm)
                    Screen.PLAYING -> GameScreen(vm, sound)
                    Screen.RESULT -> ResultScreen(vm)
                }
            }
        }
    }
}
