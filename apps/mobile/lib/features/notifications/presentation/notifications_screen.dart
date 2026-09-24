import 'package:flutter/material.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _alerts = [
    'Maintenance reminder needs approval',
    'Project acceptance document uploaded',
    'Field task blocked by site access',
  ];

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Notifications',
      currentIndex: 4,
      child: SectionCard(
        title: 'Alerts and reminders',
        subtitle: 'Start simple, then wire this screen to API-driven notifications.',
        child: Column(
          children: _alerts
              .map(
                (alert) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.circle, size: 10),
                  title: Text(alert),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
