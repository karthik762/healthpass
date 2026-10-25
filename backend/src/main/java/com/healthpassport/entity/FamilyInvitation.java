package com.healthpassport.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "family_invitations",
    indexes = {
        @Index(name = "idx_invite_code_hash", columnList = "codeHash"),
        @Index(name = "idx_invite_group", columnList = "family_group_id")
    }
)
public class FamilyInvitation {
    public enum InvitationStatus { ACTIVE, REVOKED, EXPIRED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_group_id", nullable = false, foreignKey = @ForeignKey(name = "fk_invite_group"))
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_invite_creator"))
    private User createdBy;

    // Secure SHA-256 hash of the code
    @Column(nullable = false, length = 64)
    private String codeHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.ACTIVE;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public FamilyGroup getFamilyGroup() { return familyGroup; }
    public void setFamilyGroup(FamilyGroup familyGroup) { this.familyGroup = familyGroup; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public String getCodeHash() { return codeHash; }
    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }
    public InvitationStatus getStatus() { return status; }
    public void setStatus(InvitationStatus status) { this.status = status; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isValid() {
        return status == InvitationStatus.ACTIVE && Instant.now().isBefore(expiresAt);
    }
}
