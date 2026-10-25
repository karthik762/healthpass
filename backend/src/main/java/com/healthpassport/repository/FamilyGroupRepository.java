package com.healthpassport.repository;

import com.healthpassport.entity.FamilyGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyGroupRepository extends JpaRepository<FamilyGroup, Long> {
    List<FamilyGroup> findAllByCreatedById(Long userId);
}

