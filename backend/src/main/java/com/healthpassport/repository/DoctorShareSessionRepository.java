package com.healthpassport.repository;

import com.healthpassport.entity.DoctorShareSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorShareSessionRepository extends JpaRepository<DoctorShareSession, Long> {
    List<DoctorShareSession> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Optional<DoctorShareSession> findByIdAndOwnerId(Long id, Long ownerId);

    @EntityGraph(attributePaths = {"owner", "authorizedRecords"})
    Optional<DoctorShareSession> findWithRecordsByTokenHash(String tokenHash);

    Optional<DoctorShareSession> findByTokenHash(String tokenHash);
}
