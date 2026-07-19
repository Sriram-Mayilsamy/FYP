import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class FlippableECard extends StatefulWidget {
  final Map<String, dynamic>? user;

  const FlippableECard({super.key, required this.user});

  @override
  State<FlippableECard> createState() => _FlippableECardState();
}

class _FlippableECardState extends State<FlippableECard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _isFront = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _flipCard() {
    if (_isFront) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    setState(() {
      _isFront = !_isFront;
    });
  }

  String _formatDateIST(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(dateString);
      // Convert to IST (UTC+5:30)
      final istDate = date.toUtc().add(const Duration(hours: 5, minutes: 30));
      return DateFormat('dd MMM yyyy').format(istDate);
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _flipCard,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          final angle = _animation.value * pi;
          final isFrontVisible = angle < pi / 2;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: isFrontVisible
                ? _buildFrontCard()
                : Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(pi),
                    child: _buildBackCard(),
                  ),
          );
        },
      ),
    );
  }

  Widget _buildFrontCard() {
    return AspectRatio(
      aspectRatio: 1.586,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A), // slate-900
              Color(0xFF1E3A8A), // blue-900
              Color(0xFF115E59), // teal-900
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(77),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Tap hint icon
            Positioned(
              top: 12,
              right: 12,
              child: Icon(
                Icons.flip,
                color: Colors.white.withAlpha(102),
                size: 20,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Header Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title and Name
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'E-CARD',
                              style: TextStyle(
                                color: Colors.white.withAlpha(153),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '${widget.user?['firstName'] ?? 'Patient'} ${widget.user?['lastName'] ?? ''}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                height: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Credit Card Icon
                      Icon(
                        Icons.credit_card,
                        color: Colors.white.withAlpha(153),
                        size: 24,
                      ),
                    ],
                  ),

                  // Bottom Section
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Card Number
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CARD NUMBER',
                            style: TextStyle(
                              color: Colors.white.withAlpha(128),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.user?['ecardNumber'] ?? 'N/A',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 2,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // DOB and Verified Badge
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          // DOB
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'DOB',
                                style: TextStyle(
                                  color: Colors.white.withAlpha(128),
                                  fontSize: 10,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formatDateIST(widget.user?['dateOfBirth']),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),

                          // Verified Badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withAlpha(51),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.verified_user,
                                  color: Color(0xFF6EE7B7),
                                  size: 12,
                                ),
                                const SizedBox(width: 4),
                                const Text(
                                  'VERIFIED',
                                  style: TextStyle(
                                    color: Color(0xFF6EE7B7),
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackCard() {
    return AspectRatio(
      aspectRatio: 1.586,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF115E59), // teal-900
              Color(0xFF1E3A8A), // blue-900
              Color(0xFF0F172A), // slate-900
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(77),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Tap hint icon
            Positioned(
              top: 12,
              right: 12,
              child: Icon(
                Icons.flip,
                color: Colors.white.withAlpha(102),
                size: 20,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        color: Colors.white,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'PATIENT DETAILS',
                        style: TextStyle(
                          color: Colors.white.withAlpha(153),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Details Section - Scrollable
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          _buildDetailRow(
                            'Full Name',
                            '${widget.user?['firstName'] ?? ''} ${widget.user?['lastName'] ?? ''}',
                            Icons.person_outline,
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow(
                            'Email',
                            widget.user?['email'] ?? 'N/A',
                            Icons.email_outlined,
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow(
                            'Phone',
                            widget.user?['phoneNumber'] ?? 'N/A',
                            Icons.phone_outlined,
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow(
                            'ID Type',
                            widget.user?['govtIdType'] ?? 'N/A',
                            Icons.badge_outlined,
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow(
                            'Hospital',
                            widget.user?['nearbyHospital'] ?? 'N/A',
                            Icons.local_hospital_outlined,
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow(
                            'Profile',
                            widget.user?['profileVisibility'] ?? 'N/A',
                            widget.user?['profileVisibility'] == 'private'
                                ? Icons.lock_outline
                                : Icons.public,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Footer
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'Tap to flip',
                      style: TextStyle(
                        color: Colors.white.withAlpha(102),
                        fontSize: 9,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          color: Colors.white.withAlpha(128),
          size: 14,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.white.withAlpha(128),
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
