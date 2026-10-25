package com.healthpassport.repository;

import com.healthpassport.entity.MedicalRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    List<MedicalRecord> findAllByUserIdOrderByRecordDateDesc(Long userId);
    Optional<MedicalRecord> findByIdAndUserId(Long id, Long userId);
    List<MedicalRecord> findAllByUserIdInOrderByRecordDateDesc(List<Long> userIds);
}
