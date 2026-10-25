package com.healthpassport.repository;

import com.healthpassport.entity.FamilyInvitation;
import com.healthpassport.entity.FamilyInvitation.InvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyInvitationRepository extends JpaRepository<FamilyInvitation, Long> {
    Optional<FamilyInvitation> findByCodeHash(String codeHash);
    List<FamilyInvitation> findAllByFamilyGroupIdOrderByCreatedAtDesc(Long familyGroupId);
    Optional<FamilyInvitation> findFirstByFamilyGroupIdAndStatusOrderByCreatedAtDesc(Long familyGroupId, InvitationStatus status);
}
