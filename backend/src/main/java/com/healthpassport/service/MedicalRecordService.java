package com.healthpassport.service;

import com.healthpassport.dto.MedicalRecordRequest;
import com.healthpassport.dto.MedicalRecordResponse;
import com.healthpassport.entity.MedicalRecord;
import com.healthpassport.entity.User;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.repository.MedicalRecordRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MedicalRecordService {
    private final MedicalRecordRepository recordRepository;
    private final UserService userService;
    public MedicalRecordService(MedicalRecordRepository recordRepository, UserService userService) { this.recordRepository = recordRepository; this.userService = userService; }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> listForOwner(String email) {
        User owner = userService.findByEmail(email);
        return recordRepository.findAllByUserIdOrderByRecordDateDesc(owner.getId()).stream().map(this::toResponse).toList();
    }
    @Transactional
    public MedicalRecordResponse create(String email, MedicalRecordRequest request) {
        MedicalRecord record = new MedicalRecord(); record.setUser(userService.findByEmail(email)); apply(record, request);
        return toResponse(recordRepository.save(record));
    }
    @Transactional
    public MedicalRecordResponse update(String email, Long recordId, MedicalRecordRequest request) {
        MedicalRecord record = findOwnedRecord(email, recordId); apply(record, request);
        return toResponse(recordRepository.save(record));
    }
    @Transactional
    public void delete(String email, Long recordId) { recordRepository.delete(findOwnedRecord(email, recordId)); }
    @Transactional(readOnly = true)
    public MedicalRecordResponse findOne(String email, Long recordId) { return toResponse(findOwnedRecord(email, recordId)); }
    private MedicalRecord findOwnedRecord(String email, Long recordId) {
        User owner = userService.findByEmail(email);
        // This query makes ownership an authorization boundary, not just a UI filter.
        return recordRepository.findByIdAndUserId(recordId, owner.getId()).orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
    }
    private void apply(MedicalRecord record, MedicalRecordRequest request) {
        record.setTitle(request.title().trim()); record.setRecordType(request.recordType().trim());
        record.setProviderName(blankToNull(request.providerName())); record.setRecordDate(request.recordDate()); record.setNotes(blankToNull(request.notes()));
    }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private MedicalRecordResponse toResponse(MedicalRecord record) { return new MedicalRecordResponse(record.getId(), record.getTitle(), record.getRecordType(), record.getProviderName(), record.getRecordDate(), record.getNotes(), record.getCreatedAt(), record.getUpdatedAt()); }
}
