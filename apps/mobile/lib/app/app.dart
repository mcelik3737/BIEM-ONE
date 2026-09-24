import 'package:flutter/material.dart';
import '../core/navigation/app_router.dart';
import '../core/theme/app_theme.dart';

class BiemOneApp extends StatelessWidget {
  const BiemOneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BIEM ONE',
      theme: AppTheme.light(),
      debugShowCheckedModeBanner: false,
      initialRoute: AppRouter.login,
      onGenerateRoute: AppRouter.onGenerateRoute,
    );
  }
}
