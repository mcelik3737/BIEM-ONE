import 'package:flutter/material.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class ProjectDetailScreen extends StatelessWidget {
  const ProjectDetailScreen({required this.projectTitle, super.key});

  final String projectTitle;

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Project Detail',
      currentIndex: 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionCard(
            title: projectTitle,
            subtitle: 'Extend this screen with timeline, documents, offers, and AI summaries.',
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current stage: Test'),
                SizedBox(height: 8),
                Text('Assigned team: Delivery + QA'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const SectionCard(
            title: 'Recent activity',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('• Site checks completed'),
                SizedBox(height: 8),
                Text('• Acceptance document requested'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
