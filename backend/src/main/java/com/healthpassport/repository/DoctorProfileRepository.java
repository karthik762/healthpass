package com.healthpassport.repository;

import com.healthpassport.entity.DoctorProfile;
import com.healthpassport.entity.DoctorVerificationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);

    @Query("SELECT dp FROM DoctorProfile dp JOIN FETCH dp.user WHERE dp.user.email = :email")
    Optional<DoctorProfile> findByUserEmail(@Param("email") String email);

    boolean existsByMedicalRegistrationNumber(String medicalRegistrationNumber);

    List<DoctorProfile> findByVerificationStatusOrderByCreatedAtDesc(DoctorVerificationStatus status);

    List<DoctorProfile> findAllByOrderByCreatedAtDesc();
}
