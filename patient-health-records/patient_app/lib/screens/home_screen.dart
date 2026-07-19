import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/flippable_ecard.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: () async {
              await authProvider.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Flippable E-Card
          FlippableECard(user: user),
          const SizedBox(height: 24),

          // Quick Actions Section
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),

          // Medical Records Card
          Card.outlined(
            child: ListTile(
              leading: const Icon(Icons.medical_services),
              title: const Text('My Records'),
              subtitle: const Text('View your medical history'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Appointments Card
          Card.outlined(
            child: ListTile(
              leading: const Icon(Icons.calendar_month),
              title: const Text('Appointments'),
              subtitle: const Text('Schedule and manage appointments'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Medications Card
          Card.outlined(
            child: ListTile(
              leading: const Icon(Icons.medication),
              title: const Text('Medications'),
              subtitle: const Text('Track your prescriptions'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Profile Card
          Card.outlined(
            child: ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Profile'),
              subtitle: const Text('Manage your account settings'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
