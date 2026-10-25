package com.healthpassport.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "family_memberships", uniqueConstraints = @UniqueConstraint(name = "uk_family_member", columnNames = {"family_group_id", "user_id"}))
public class FamilyMembership {
    public enum MembershipRole { OWNER, MEMBER }
    public enum MembershipStatus { PENDING, ACTIVE, REJECTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_group_id", nullable = false, foreignKey = @ForeignKey(name = "fk_membership_group"))
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_membership_user"))
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipRole role = MembershipRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status = MembershipStatus.PENDING;

    // Explicit consent: this member grants the family group permission to view their medical records
    @Column(nullable = false)
    private boolean recordAccessGranted = false;

    // Flag indicating this member has requested record access in the group
    @Column(nullable = false)
    private boolean requestedRecordAccess = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public FamilyGroup getFamilyGroup() { return familyGroup; }
    public void setFamilyGroup(FamilyGroup familyGroup) { this.familyGroup = familyGroup; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public MembershipRole getRole() { return role; }
    public void setRole(MembershipRole role) { this.role = role; }
    public MembershipStatus getStatus() { return status; }
    public void setStatus(MembershipStatus status) { this.status = status; }
    public boolean isRecordAccessGranted() { return recordAccessGranted; }
    public void setRecordAccessGranted(boolean recordAccessGranted) { this.recordAccessGranted = recordAccessGranted; }
    public boolean isRequestedRecordAccess() { return requestedRecordAccess; }
    public void setRequestedRecordAccess(boolean requestedRecordAccess) { this.requestedRecordAccess = requestedRecordAccess; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

