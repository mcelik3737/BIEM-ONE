import 'package:flutter/material.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/customers/presentation/customers_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/projects/presentation/project_detail_screen.dart';
import '../../features/projects/presentation/projects_screen.dart';
import '../../features/tasks/presentation/my_tasks_screen.dart';
import '../../features/tasks/presentation/task_detail_screen.dart';

class AppRouter {
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const projects = '/projects';
  static const projectDetail = '/project-detail';
  static const myTasks = '/my-tasks';
  static const taskDetail = '/task-detail';
  static const customers = '/customers';
  static const notifications = '/notifications';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case login:
        return MaterialPageRoute<void>(builder: (_) => const LoginScreen());
      case dashboard:
        return MaterialPageRoute<void>(builder: (_) => const DashboardScreen());
      case projects:
        return MaterialPageRoute<void>(builder: (_) => const ProjectsScreen());
      case projectDetail:
        final title = settings.arguments is String ? settings.arguments! as String : 'Project Detail';
        return MaterialPageRoute<void>(
          builder: (_) => ProjectDetailScreen(projectTitle: title),
        );
      case myTasks:
        return MaterialPageRoute<void>(builder: (_) => const MyTasksScreen());
      case taskDetail:
        final title = settings.arguments is String ? settings.arguments! as String : 'Task Detail';
        return MaterialPageRoute<void>(
          builder: (_) => TaskDetailScreen(taskTitle: title),
        );
      case customers:
        return MaterialPageRoute<void>(builder: (_) => const CustomersScreen());
      case notifications:
        return MaterialPageRoute<void>(builder: (_) => const NotificationsScreen());
      default:
        return MaterialPageRoute<void>(builder: (_) => const LoginScreen());
    }
  }
}
