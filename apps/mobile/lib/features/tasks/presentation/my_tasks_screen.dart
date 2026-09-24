import 'package:flutter/material.dart';
import '../../../core/navigation/app_router.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class MyTasksScreen extends StatelessWidget {
  const MyTasksScreen({super.key});

  static const _tasks = [
    ('Approve RF design package', 'High priority'),
    ('Upload installation photo set', 'Due today'),
    ('Review maintenance checklist', 'Due tomorrow'),
  ];

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'My Tasks',
      currentIndex: 2,
      child: SectionCard(
        title: 'Assigned work',
        subtitle: 'A mobile-first task list with clear next actions.',
        child: Column(
          children: _tasks
              .map(
                (task) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(task.$1),
                  subtitle: Text(task.$2),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(
                    context,
                    AppRouter.taskDetail,
                    arguments: task.$1,
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
