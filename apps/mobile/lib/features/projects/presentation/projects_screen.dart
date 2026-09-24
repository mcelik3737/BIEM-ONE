import 'package:flutter/material.dart';
import '../../../core/navigation/app_router.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class ProjectsScreen extends StatelessWidget {
  const ProjectsScreen({super.key});

  static const _projects = [
    ('Solar Campus Rollout', 'Test'),
    ('Warehouse RF Upgrade', 'RF Tasarım'),
    ('Retail Service Contract', 'Bakım'),
  ];

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Projects',
      currentIndex: 1,
      child: SectionCard(
        title: 'Project list',
        subtitle: 'Starter cards for field-ready project tracking.',
        child: Column(
          children: _projects
              .map(
                (project) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(project.$1),
                  subtitle: Text('Stage: ${project.$2}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(
                    context,
                    AppRouter.projectDetail,
                    arguments: project.$1,
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
