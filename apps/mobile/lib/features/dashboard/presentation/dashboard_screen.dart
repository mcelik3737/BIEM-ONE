import 'package:flutter/material.dart';
import '../../../core/navigation/app_router.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Dashboard',
      currentIndex: 0,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionCard(
            title: 'Daily pulse',
            subtitle: 'A simple starter snapshot of delivery operations.',
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: const [
                _MetricChip(label: 'Projects', value: '18'),
                _MetricChip(label: 'Tasks', value: '42'),
                _MetricChip(label: 'Alerts', value: '7'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Quick access',
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Go to projects'),
                  subtitle: const Text('Review stage progress and site activity'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushReplacementNamed(context, AppRouter.projects),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Go to my tasks'),
                  subtitle: const Text('Follow assigned work across field and office'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushReplacementNamed(context, AppRouter.myTasks),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 96,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8F1),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}
