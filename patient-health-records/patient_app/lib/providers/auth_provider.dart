import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider with ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _error;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _token != null;

  // Update this to your backend URL
  static const String baseUrl = 'http://192.168.1.35:5000/api';
  // static const String baseUrl = 'http://10.0.2.2:5000/api'; // For Android Emulator
  // static const String baseUrl = 'http://localhost:5000/api'; // For iOS Simulator

  Future<void> loadStoredAuth() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userJson = prefs.getString('user_data');
    if (userJson != null) {
      _user = jsonDecode(userJson);
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/patient-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      _isLoading = false;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        
        // Store token first
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

        // Fetch full patient profile
        final profileResponse = await http.get(
          Uri.parse('$baseUrl/patients/profile'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_token',
          },
        );

        if (profileResponse.statusCode == 200) {
          final profileData = jsonDecode(profileResponse.body);
          final patientData = profileData['data'];
          
          // Map snake_case to camelCase for Flutter
          _user = {
            'id': patientData['user_id'],
            'email': patientData['email'],
            'firstName': patientData['first_name'],
            'lastName': patientData['last_name'],
            'dateOfBirth': patientData['date_of_birth'],
            'phoneNumber': patientData['govt_id_number'], // Using govt ID as phone for now
            'ecardNumber': patientData['ecard_number'],
            'profileVisibility': patientData['profile_visibility'],
            'govtIdType': patientData['govt_id_type'],
            'nearbyHospital': patientData['nearby_hospital_name'],
          };

          // Store user data
          await prefs.setString('user_data', jsonEncode(_user));
          
          notifyListeners();
          return true;
        } else {
          _error = 'Unable to load profile';
          notifyListeners();
          return false;
        }
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Login failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Network error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _error = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');

    notifyListeners();
  }
}
