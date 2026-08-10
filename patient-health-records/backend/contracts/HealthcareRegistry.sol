// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Demo registry: this contract deliberately stores only hashes and access audit metadata.
 * Patient clinical data must remain in PostgreSQL.
 */
contract HealthcareRegistry {
    enum AccessStatus { PENDING, APPROVED, REVOKED }

    struct MedicalRecord {
        uint256 recordId;
        string patientId;
        string recordHash;
        uint256 createdAt;
    }

    struct AccessRequest {
        uint256 requestId;
        string patientId;
        string doctorId;
        AccessStatus status;
        uint256 requestedAt;
        uint256 approvedAt;
        uint256 expiresAt;
    }

    uint256 private nextRecordId = 1;
    uint256 private nextRequestId = 1;
    mapping(uint256 => MedicalRecord) private medicalRecords;
    mapping(uint256 => AccessRequest) private accessRequests;

    event MedicalRecordAdded(uint256 indexed recordId, string patientId, string recordHash, uint256 createdAt);
    event AccessRequested(uint256 indexed requestId, string patientId, string doctorId, uint256 requestedAt);
    event AccessApproved(uint256 indexed requestId, uint256 approvedAt, uint256 expiresAt);
    event AccessRevoked(uint256 indexed requestId, uint256 revokedAt);

    function addMedicalRecord(string calldata patientId, string calldata recordHash) external returns (uint256) {
        uint256 recordId = nextRecordId++;
        medicalRecords[recordId] = MedicalRecord(recordId, patientId, recordHash, block.timestamp);
        emit MedicalRecordAdded(recordId, patientId, recordHash, block.timestamp);
        return recordId;
    }

    function requestAccess(string calldata patientId, string calldata doctorId) external returns (uint256) {
        uint256 requestId = nextRequestId++;
        accessRequests[requestId] = AccessRequest(requestId, patientId, doctorId, AccessStatus.PENDING, block.timestamp, 0, 0);
        emit AccessRequested(requestId, patientId, doctorId, block.timestamp);
        return requestId;
    }

    function approveAccess(uint256 requestId, uint256 expiresAt) external {
        AccessRequest storage request = accessRequests[requestId];
        require(request.requestId != 0, "Request not found");
        require(request.status == AccessStatus.PENDING, "Request is not pending");
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        request.status = AccessStatus.APPROVED;
        request.approvedAt = block.timestamp;
        request.expiresAt = expiresAt;
        emit AccessApproved(requestId, request.approvedAt, expiresAt);
    }

    function revokeAccess(uint256 requestId) external {
        AccessRequest storage request = accessRequests[requestId];
        require(request.requestId != 0, "Request not found");
        require(request.status != AccessStatus.REVOKED, "Already revoked");
        request.status = AccessStatus.REVOKED;
        emit AccessRevoked(requestId, block.timestamp);
    }

    function getMedicalRecord(uint256 recordId) external view returns (MedicalRecord memory) {
        require(medicalRecords[recordId].recordId != 0, "Record not found");
        return medicalRecords[recordId];
    }

    function getAccessRequest(uint256 requestId) external view returns (AccessRequest memory) {
        require(accessRequests[requestId].requestId != 0, "Request not found");
        return accessRequests[requestId];
    }
}
