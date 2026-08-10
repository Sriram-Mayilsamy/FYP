import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/access_requests_provider.dart';

/// Patient-facing demo view. It receives hashes/transaction references only;
/// the actual clinical data remains in the existing PostgreSQL API response.
class BlockchainRecordsScreen extends StatefulWidget {
  const BlockchainRecordsScreen({super.key});

  @override
  State<BlockchainRecordsScreen> createState() => _BlockchainRecordsScreenState();
}

class _BlockchainRecordsScreenState extends State<BlockchainRecordsScreen> {
  List<Map<String, dynamic>> _records = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _loadRecords(); }

  Future<void> _loadRecords() async {
    setState(() { _loading = true; _error = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final response = await http.get(Uri.parse('${AccessRequestsProvider.baseUrl}/patients/profile'), headers: {'Authorization': 'Bearer $token'});
      if (response.statusCode != 200) throw Exception('Unable to load records');
      final data = jsonDecode(response.body)['data'];
      setState(() => _records = List<Map<String, dynamic>>.from(data['visits'] ?? []));
    } catch (_) {
      setState(() => _error = 'Unable to load blockchain record status.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My Records')),
    body: _loading ? const Center(child: CircularProgressIndicator()) : _error != null
      ? Center(child: Text(_error!))
      : RefreshIndicator(onRefresh: _loadRecords, child: ListView.builder(
        padding: const EdgeInsets.all(16), itemCount: _records.length,
        itemBuilder: (_, index) {
          final record = _records[index];
          final registered = record['blockchain_transaction_id'] != null;
          final tx = record['blockchain_transaction_id']?.toString().split(':').first;
          return Card(child: ListTile(
            leading: Icon(registered ? Icons.verified : Icons.pending_outlined, color: registered ? Colors.green : Colors.orange),
            title: Text('Record #${record['id']}'),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(registered ? 'Verified by Blockchain' : 'Not yet registered on blockchain'),
              if (tx != null) Text('Transaction: $tx', maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ));
        },
      )),
  );
}
