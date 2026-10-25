package com.healthpassport.service;

import com.healthpassport.dto.*;
import com.healthpassport.entity.DoctorShareSession;
import com.healthpassport.entity.MedicalRecord;
import com.healthpassport.entity.User;
import com.healthpassport.exception.ConflictException;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.exception.SecurityAccessDeniedException;
import com.healthpassport.repository.DoctorShareSessionRepository;
import com.healthpassport.repository.MedicalRecordRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DoctorShareService {
    // Exclude easily confused characters like O, 0, I, 1
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 12;
    private final SecureRandom secureRandom = new SecureRandom();

    private final DoctorShareSessionRepository sessionRepository;
    private final MedicalRecordRepository recordRepository;
    private final UserService userService;
    private final RateLimiterService rateLimiterService;
    private final com.healthpassport.repository.AiHealthSummaryRepository summaryRepository;

    public DoctorShareService(
        DoctorShareSessionRepository sessionRepository,
        MedicalRecordRepository recordRepository,
        UserService userService,
        RateLimiterService rateLimiterService,
        com.healthpassport.repository.AiHealthSummaryRepository summaryRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.recordRepository = recordRepository;
        this.userService = userService;
        this.rateLimiterService = rateLimiterService;
        this.summaryRepository = summaryRepository;
    }

    @Transactional
    public DoctorShareSessionResponse createSession(String patientEmail, CreateDoctorShareSessionRequest request) {
        User patient = userService.findByEmail(patientEmail);

        if (request.recordIds() == null || request.recordIds().isEmpty()) {
            throw new ConflictException("At least one medical record must be selected for sharing");
        }

        if (request.expiryMinutes() == null || request.expiryMinutes() <= 0) {
            throw new ConflictException("Expiry duration must be greater than zero");
        }

        // Verify ownership of EVERY selected record on the server
        Set<MedicalRecord> authorizedRecords = new HashSet<>();
        for (Long recordId : request.recordIds()) {
            MedicalRecord record = recordRepository.findByIdAndUserId(recordId, patient.getId())
                .orElseThrow(() -> new SecurityAccessDeniedException("Record " + recordId + " does not belong to the authenticated patient"));
            authorizedRecords.add(record);
        }

        String rawCode = generateSecureCode();
        String codeHash = hashToken(rawCode);

        DoctorShareSession session = new DoctorShareSession();
        session.setOwner(patient);
        session.setTokenHash(codeHash);
        session.setExpiresAt(Instant.now().plus(Duration.ofMinutes(request.expiryMinutes())));
        session.setActive(true);
        session.setAuthorizedRecords(authorizedRecords);

        DoctorShareSession saved = sessionRepository.save(session);
        return toSessionResponse(saved, rawCode);
    }

    @Transactional(readOnly = true)
    public List<DoctorShareSessionResponse> listSessionsForPatient(String patientEmail) {
        User patient = userService.findByEmail(patientEmail);
        return sessionRepository.findAllByOwnerIdOrderByCreatedAtDesc(patient.getId())
            .stream()
            .map(s -> toSessionResponse(s, null))
            .toList();
    }

    @Transactional
    public void revokeSession(String patientEmail, Long sessionId) {
        User patient = userService.findByEmail(patientEmail);
        DoctorShareSession session = sessionRepository.findByIdAndOwnerId(sessionId, patient.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Sharing session not found"));
        session.setActive(false);
        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public DoctorSharedRecordsResponse validateAndAccessRecords(String clientIp, String rawCode) {
        if (rawCode == null || rawCode.trim().isEmpty()) {
            throw new SecurityAccessDeniedException("Invalid sharing code");
        }

        String normalizedCode = rawCode.trim().toUpperCase();
        // Rate limit attempts per IP address
        rateLimiterService.checkRateLimit("doctor-access:" + (clientIp != null ? clientIp : "unknown"));

        String hash = hashToken(normalizedCode);
        DoctorShareSession session = sessionRepository.findWithRecordsByTokenHash(hash)
            .orElseThrow(() -> new SecurityAccessDeniedException("Invalid, expired, or revoked sharing code"));

        if (!session.isActive()) {
            throw new SecurityAccessDeniedException("This sharing session has been revoked by the patient");
        }

        if (Instant.now().isAfter(session.getExpiresAt())) {
            throw new SecurityAccessDeniedException("This sharing session has expired");
        }

        List<MedicalRecordResponse> recordResponses = session.getAuthorizedRecords().stream()
            .sorted(Comparator.comparing(MedicalRecord::getRecordDate).reversed())
            .map(this::toRecordResponse)
            .toList();

        return new DoctorSharedRecordsResponse(
            session.getOwner().getFullName(),
            session.getExpiresAt(),
            true, // read-only
            recordResponses,
            "Access is read-only and restricted to records authorized by the patient. Code verification does not constitute professional licensure verification."
        );
    }

    @Transactional(readOnly = true)
    public MedicalRecordResponse getSpecificSharedRecord(String clientIp, String rawCode, Long recordId) {
        DoctorSharedRecordsResponse sharedRecords = validateAndAccessRecords(clientIp, rawCode);
        return sharedRecords.records().stream()
            .filter(r -> r.id().equals(recordId))
            .findFirst()
            .orElseThrow(() -> new SecurityAccessDeniedException("Record not authorized or not found in this sharing session"));
    }

    @Transactional(readOnly = true)
    public AiSummaryResponse getSharedRecordSummary(String clientIp, String rawCode, Long recordId) {
        // Enforce doctor sharing validation and explicit record authorization
        MedicalRecordResponse record = getSpecificSharedRecord(clientIp, rawCode, recordId);

        return summaryRepository.findByRecordId(record.id())
            .map(s -> new AiSummaryResponse(
                s.getId(),
                record.id(),
                record.title(),
                record.recordType(),
                record.providerName(),
                record.recordDate(),
                s.getModelName(),
                s.getOverview(),
                s.getKeyFindings(),
                s.getMeasurements(),
                s.getMedications(),
                s.getFollowUpInstructions(),
                s.getQuestionsForDoctor(),
                s.getMissingInformation(),
                s.getDisclaimer(),
                s.getUpdatedAt(),
                true
            ))
            .orElseThrow(() -> new ResourceNotFoundException("No AI clinical summary exists for this authorized medical record"));
    }

    private String generateSecureCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(secureRandom.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    public static String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(raw.trim().toUpperCase().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private DoctorShareSessionResponse toSessionResponse(DoctorShareSession session, String rawCode) {
        boolean expired = Instant.now().isAfter(session.getExpiresAt());
        List<MedicalRecordResponse> records = session.getAuthorizedRecords() != null
            ? session.getAuthorizedRecords().stream().map(this::toRecordResponse).toList()
            : Collections.emptyList();

        return new DoctorShareSessionResponse(
            session.getId(),
            rawCode,
            session.getExpiresAt(),
            session.isActive(),
            expired,
            session.getCreatedAt(),
            session.getAuthorizedRecords() != null ? session.getAuthorizedRecords().size() : 0,
            records
        );
    }

    private MedicalRecordResponse toRecordResponse(MedicalRecord record) {
        return new MedicalRecordResponse(
            record.getId(),
            record.getTitle(),
            record.getRecordType(),
            record.getProviderName(),
            record.getRecordDate(),
            record.getNotes(),
            record.getCreatedAt(),
            record.getUpdatedAt()
        );
    }
}
