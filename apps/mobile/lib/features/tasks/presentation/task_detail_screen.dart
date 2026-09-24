import 'package:flutter/material.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class TaskDetailScreen extends StatelessWidget {
  const TaskDetailScreen({required this.taskTitle, super.key});

  final String taskTitle;

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Task Detail',
      currentIndex: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionCard(
            title: taskTitle,
            subtitle: 'This starter is ready for checklist items, attachments, and comments.',
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Status: In Progress'),
                SizedBox(height: 8),
                Text('Priority: High'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const SectionCard(
            title: 'Next step',
            child: Text('Sync this task with the API and assign ownership with JWT user context.'),
          ),
        ],
      ),
    );
  }
}
