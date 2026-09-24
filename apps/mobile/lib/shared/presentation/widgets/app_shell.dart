import 'package:flutter/material.dart';
import '../../../core/navigation/app_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({
    required this.title,
    required this.currentIndex,
    required this.child,
    super.key,
  });

  final String title;
  final int currentIndex;
  final Widget child;

  void _onDestinationSelected(BuildContext context, int index) {
    const routes = [
      AppRouter.dashboard,
      AppRouter.projects,
      AppRouter.myTasks,
      AppRouter.customers,
      AppRouter.notifications,
    ];

    Navigator.pushReplacementNamed(context, routes[index]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: child,
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.folder_copy_outlined), label: 'Projects'),
          NavigationDestination(icon: Icon(Icons.task_alt_outlined), label: 'Tasks'),
          NavigationDestination(icon: Icon(Icons.apartment_outlined), label: 'Customers'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), label: 'Alerts'),
        ],
        onDestinationSelected: (index) => _onDestinationSelected(context, index),
      ),
    );
  }
}
