package com.healthpassport.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
    name = "doctor_share_sessions",
    indexes = {
        @Index(name = "idx_share_owner_active", columnList = "owner_user_id,active"),
        @Index(name = "idx_share_token_hash", columnList = "tokenHash")
    }
)
public class DoctorShareSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_share_owner"))
    private User owner;

    // Secure SHA-256 hash of the 12-character high-entropy sharing code
    @Column(nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "doctor_share_session_records",
        joinColumns = @JoinColumn(name = "session_id", foreignKey = @ForeignKey(name = "fk_share_session")),
        inverseJoinColumns = @JoinColumn(name = "record_id", foreignKey = @ForeignKey(name = "fk_share_record")),
        indexes = {
            @Index(name = "idx_share_session_record", columnList = "session_id,record_id")
        }
    )
    private Set<MedicalRecord> authorizedRecords = new HashSet<>();

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }

    public Set<MedicalRecord> getAuthorizedRecords() { return authorizedRecords; }
    public void setAuthorizedRecords(Set<MedicalRecord> authorizedRecords) { this.authorizedRecords = authorizedRecords; }

    public boolean isValid() {
        return active && Instant.now().isBefore(expiresAt);
    }
}
