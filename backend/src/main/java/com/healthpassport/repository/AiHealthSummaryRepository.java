package com.healthpassport.repository;

import com.healthpassport.entity.AiHealthSummary;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiHealthSummaryRepository extends JpaRepository<AiHealthSummary, Long> {
    Optional<AiHealthSummary> findByRecordId(Long recordId);
    Optional<AiHealthSummary> findByRecordIdAndUserId(Long recordId, Long userId);
    void deleteByRecordId(Long recordId);
}
