package com.healthpassport.repository;

import com.healthpassport.entity.FamilyMembership;
import com.healthpassport.entity.FamilyMembership.MembershipStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyMembershipRepository extends JpaRepository<FamilyMembership, Long> {
    List<FamilyMembership> findAllByUserId(Long userId);
    List<FamilyMembership> findAllByFamilyGroupId(Long familyGroupId);
    List<FamilyMembership> findAllByFamilyGroupIdAndStatus(Long familyGroupId, MembershipStatus status);
    Optional<FamilyMembership> findByFamilyGroupIdAndUserId(Long familyGroupId, Long userId);
    boolean existsByFamilyGroupIdAndUserId(Long familyGroupId, Long userId);
}

