package com.healthpassport.repository;

import com.healthpassport.entity.CommunityHealthConsent;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommunityHealthConsentRepository extends JpaRepository<CommunityHealthConsent, Long> {
    Optional<CommunityHealthConsent> findByUserId(Long userId);

    @Query("SELECT c.user.id FROM CommunityHealthConsent c WHERE c.optedIn = true")
    List<Long> findConsentingUserIds();

    long countByOptedInTrue();
}
