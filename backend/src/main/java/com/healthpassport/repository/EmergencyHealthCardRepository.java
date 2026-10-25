package com.healthpassport.repository;

import com.healthpassport.entity.EmergencyHealthCard;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmergencyHealthCardRepository extends JpaRepository<EmergencyHealthCard, Long> {
    Optional<EmergencyHealthCard> findByUserId(Long userId);
}
