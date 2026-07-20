import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isUpdating = false;

  String _getInitials(Map<String, dynamic>? user) {
    if (user == null) return 'P';
    
    String firstInitial = 'P';
    String lastInitial = '';
    
    // Safely get first name initial
    final firstName = user['firstName'];
    if (firstName != null && firstName.toString().isNotEmpty) {
      firstInitial = firstName.toString().substring(0, 1).toUpperCase();
    }
    
    // Safely get last name initial
    final lastName = user['lastName'];
    if (lastName != null && lastName.toString().isNotEmpty) {
      lastInitial = lastName.toString().substring(0, 1).toUpperCase();
    }
    
    return '$firstInitial$lastInitial';
  }

  Future<void> _toggleProfileVisibility(bool isPrivate) async {
    if (_isUpdating) return;

    setState(() {
      _isUpdating = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final visibility = isPrivate ? 'private' : 'public';

      final response = await http.patch(
        Uri.parse('${AuthProvider.baseUrl}/patients/privacy'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${authProvider.token}',
        },
        body: jsonEncode({
          'profile_visibility': visibility,
        }),
      );

      if (response.statusCode == 200) {
        // Parse response to get the updated visibility value
        final responseData = jsonDecode(response.body);
        final updatedVisibility = responseData['data']['profile_visibility'];
        
        // Update user data locally
        final currentUser = Map<String, dynamic>.from(authProvider.user ?? {});
        currentUser['profileVisibility'] = updatedVisibility;
        
        // Update stored user data
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_data', jsonEncode(currentUser));
        
        // We need to call a method to update the provider's user data
        // For now, we'll trigger a reload by calling loadStoredAuth
        await authProvider.loadStoredAuth();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Profile is now $updatedVisibility'),
              backgroundColor: Colors.green[600],
            ),
          );
        }
      } else {
        // Parse error response
        String errorMessage = 'Failed to update privacy setting';
        try {
          final errorData = jsonDecode(response.body);
          errorMessage = errorData['error'] ?? errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUpdating = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red[600],
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/login',
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.user;
          final profileVisibility = user?['profileVisibility']?.toString();
          final isPrivate = profileVisibility == 'private';

          return ListView(
            children: [
              // User Profile Section
              Container(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: const Color(0xFF3B82F6),
                      child: Text(
                        _getInitials(user),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${user?['firstName']?.toString() ?? 'Patient'} ${user?['lastName']?.toString() ?? ''}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user?['email']?.toString() ?? 'No email',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'E-Card: ${user?['ecardNumber']?.toString() ?? 'N/A'}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Divider
              Divider(height: 1, thickness: 1, color: Colors.grey.shade300),

              // Privacy Toggle
              ListTile(
                leading: Icon(
                  isPrivate ? Icons.lock : Icons.public,
                  color: isPrivate ? Colors.red[600] : Colors.green[600],
                  size: 24,
                ),
                title: const Text(
                  'Profile Privacy',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  isPrivate
                      ? 'Private - Doctors must request access'
                      : 'Public - Verified doctors can view',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
                trailing: Switch(
                  value: isPrivate,
                  onChanged: _isUpdating
                      ? null
                      : (value) => _toggleProfileVisibility(value),
                  activeTrackColor: Colors.red[300],
                  activeThumbColor: Colors.red[600],
                  inactiveTrackColor: Colors.green[300],
                  inactiveThumbColor: Colors.green[600],
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              ),

              // Divider
              Divider(height: 1, thickness: 1, color: Colors.grey.shade300),

              // Logout
              ListTile(
                leading: Icon(
                  Icons.logout,
                  color: Colors.red[600],
                  size: 24,
                ),
                title: const Text(
                  'Logout',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  'Sign out of your account',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
                onTap: _handleLogout,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              ),

              // Divider
              Divider(height: 1, thickness: 1, color: Colors.grey.shade300),
            ],
          );
        },
      ),
    );
  }
}