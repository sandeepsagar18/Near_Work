package com.example.devicelocator

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.devicelocator.ui.main.MainScreen

@Composable
fun MainNavigation() {
    MainScreen(modifier = Modifier.safeDrawingPadding().padding(16.dp))
}
