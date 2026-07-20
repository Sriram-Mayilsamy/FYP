import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AccessRequestsProvider with ChangeNotifier {
  List<Map<String, dynamic>> _pendingRequests = [];
  List<Map<String, dynamic>> _activeRequests = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get pendingRequests => _pendingRequests;
  List<Map<String, dynamic>> get activeRequests => _activeRequests;
  bool get isLoading => _isLoading;
  String? get error => _error;

  static const String baseUrl = 'http://192.168.1.35:5000/api';

  Future<void> loadAccessRequests() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        _error = 'Not authenticated';
        _isLoading = false;
        notifyListeners();
        return;
      }

      final response = await http.get(
        Uri.parse('$baseUrl/patients/access-requests'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      _isLoading = false;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final requestsData = data['data'] ?? data;
        
        _pendingRequests = List<Map<String, dynamic>>.from(
          requestsData['pending'] ?? []
        );
        _activeRequests = List<Map<String, dynamic>>.from(
          requestsData['active'] ?? []
        );
        
        notifyListeners();
      } else {
        _error = 'Failed to load requests';
        notifyListeners();
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Network error: ${e.toString()}';
      notifyListeners();
    }
  }

  Future<bool> approveRequest(int requestId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      final response = await http.post(
        Uri.parse('$baseUrl/patients/access-requests/$requestId/approve'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        await loadAccessRequests();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to approve request';
      notifyListeners();
      return false;
    }
  }

  Future<bool> rejectRequest(int requestId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      final response = await http.post(
        Uri.parse('$baseUrl/patients/access-requests/$requestId/reject'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        await loadAccessRequests();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to reject request';
      notifyListeners();
      return false;
    }
  }

  Future<bool> terminateRequest(int requestId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      final response = await http.post(
        Uri.parse('$baseUrl/patients/access-requests/$requestId/terminate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        await loadAccessRequests();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to terminate session';
      notifyListeners();
      return false;
    }
  }
}
