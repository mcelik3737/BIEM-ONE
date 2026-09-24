import 'package:flutter/material.dart';
import '../../../shared/presentation/widgets/app_shell.dart';
import '../../../shared/presentation/widgets/section_card.dart';

class CustomersScreen extends StatelessWidget {
  const CustomersScreen({super.key});

  static const _customers = [
    'Biem Teknoloji',
    'Anatolia Energy',
    'Marmara Retail',
  ];

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Customers',
      currentIndex: 3,
      child: SectionCard(
        title: 'Customer directory',
        subtitle: 'Keep contacts, contracts, and active projects in one place.',
        child: Column(
          children: _customers
              .map(
                (customer) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(customer),
                  subtitle: const Text('Tap to connect future customer detail workflow'),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
