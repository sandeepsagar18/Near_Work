import 'package:flutter/material.dart';

class AppTheme {
  static const Color obsidianBackground = Color(0xFF0A0E17);
  static const Color darkCardBackground = Color(0xFF111827);
  static const Color surfaceGlass = Color(0x1F1F293D);
  static const Color glassBorder = Color(0x3300F2FE);

  // Accents
  static const Color neonCyan = Color(0xFF00F2FE);
  static const Color electricPurple = Color(0xFF4FACFE);
  static const Color emeraldGreen = Color(0xFF00E676);
  static const Color warningAmber = Color(0xFFFFD600);
  static const Color alertRed = Color(0xFFFF5252);
  static const Color textMuted = Color(0xFF9CA3AF);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: obsidianBackground,
      primaryColor: neonCyan,
      colorScheme: const ColorScheme.dark(
        primary: neonCyan,
        secondary: electricPurple,
        surface: darkCardBackground,
        background: obsidianBackground,
      ),
      fontFamily: 'Roboto',
      useMaterial3: true,
      cardTheme: CardTheme(
        color: darkCardBackground,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0x22FFFFFF), width: 1),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: darkCardBackground,
        selectedItemColor: neonCyan,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 12,
      ),
    );
  }

  static BoxDecoration glassDecoration({
    Color? borderColor,
    double borderRadius = 20.0,
    List<Color>? gradientColors,
  }) {
    return BoxDecoration(
      color: darkCardBackground.withOpacity(0.85),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ?? glassBorder,
        width: 1.2,
      ),
      boxShadow: [
        BoxShadow(
          color: (borderColor ?? neonCyan).withOpacity(0.12),
          blurRadius: 20,
          spreadRadius: 2,
          offset: const Offset(0, 4),
        ),
      ],
      gradient: gradientColors != null
          ? LinearGradient(
              colors: gradientColors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            )
          : null,
    );
  }
}
