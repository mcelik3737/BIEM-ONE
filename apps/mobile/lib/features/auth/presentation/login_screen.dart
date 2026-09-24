import 'package:flutter/material.dart';
import '../../../core/navigation/app_router.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF3E5CF), Color(0xFFF7F2EA)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                Text(
                  'BIEM ONE',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Business operations in your pocket.',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: const Color(0xFF6B6258),
                      ),
                ),
                const SizedBox(height: 32),
                const TextField(
                  decoration: InputDecoration(
                    labelText: 'Email',
                    hintText: 'admin@biem.one',
                  ),
                ),
                const SizedBox(height: 16),
                const TextField(
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: 'Admin123!',
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.pushReplacementNamed(context, AppRouter.dashboard),
                  child: const SizedBox(
                    width: double.infinity,
                    child: Center(child: Text('Login')),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Starter account: admin@biem.one / Admin123!',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const Spacer(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
