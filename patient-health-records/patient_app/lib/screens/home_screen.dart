import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/access_requests_provider.dart';
import '../widgets/flippable_ecard.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AccessRequestsProvider>(context, listen: false)
          .loadAccessRequests();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Settings',
            onPressed: () {
              Navigator.of(context).pushNamed('/settings');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Provider.of<AccessRequestsProvider>(context, listen: false)
              .loadAccessRequests();
        },
        child: ListView(
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
            const SizedBox(height: 12),

            // Access Management List
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Consumer<AccessRequestsProvider>(
                builder: (context, accessProvider, child) {
                  final pendingCount = accessProvider.pendingRequests.length;
                  final activeCount = accessProvider.activeRequests.length;

                  return Column(
                    children: [
                      // Pending Requests Item
                      ListTile(
                        leading: Stack(
                          children: [
                            const Icon(Icons.schedule, size: 28),
                            if (pendingCount > 0)
                              Positioned(
                                right: 0,
                                top: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.orange,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '$pendingCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        title: const Text('Pending Requests'),
                        subtitle: Text(
                          '$pendingCount doctor${pendingCount != 1 ? 's' : ''} requesting access',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.of(context).pushNamed('/pending-requests');
                        },
                      ),
                      
                      // Divider
                      Divider(height: 1, thickness: 1, color: Colors.grey.shade300),

                      // Active Sessions Item
                      ListTile(
                        leading: Stack(
                          children: [
                            const Icon(Icons.verified_user, size: 28),
                            if (activeCount > 0)
                              Positioned(
                                right: 0,
                                top: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.green,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '$activeCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        title: const Text('Active Sessions'),
                        subtitle: Text(
                          '$activeCount doctor${activeCount != 1 ? 's' : ''} have access',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.of(context).pushNamed('/active-sessions');
                        },
                      ),
                      
                      // Divider
                      Divider(height: 1, thickness: 1, color: Colors.grey.shade300),

                      // Medical Records Item
                      ListTile(
                        leading: const Icon(Icons.medical_services, size: 28),
                        title: const Text('My Records'),
                        subtitle: const Text('View blockchain verification status'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).pushNamed('/my-records'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
