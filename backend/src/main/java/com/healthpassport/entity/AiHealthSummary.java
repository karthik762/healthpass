package com.healthpassport.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "ai_health_summaries",
    uniqueConstraints = @UniqueConstraint(name = "uk_ai_summary_record", columnNames = {"record_id"}),
    indexes = {
        @Index(name = "idx_ai_summary_user", columnList = "user_id"),
        @Index(name = "idx_ai_summary_record", columnList = "record_id")
    }
)
public class AiHealthSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_ai_summary_user"))
    private User user;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id", nullable = false, foreignKey = @ForeignKey(name = "fk_ai_summary_record"))
    private MedicalRecord record;

    @Column(nullable = false, length = 80)
    private String modelName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String overview;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String keyFindings;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String measurements;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String medications;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String followUpInstructions;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionsForDoctor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String missingInformation;

    @Column(nullable = false, length = 1000)
    private String disclaimer;

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

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public MedicalRecord getRecord() {
        return record;
    }

    public void setRecord(MedicalRecord record) {
        this.record = record;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getOverview() {
        return overview;
    }

    public void setOverview(String overview) {
        this.overview = overview;
    }

    public String getKeyFindings() {
        return keyFindings;
    }

    public void setKeyFindings(String keyFindings) {
        this.keyFindings = keyFindings;
    }

    public String getMeasurements() {
        return measurements;
    }

    public void setMeasurements(String measurements) {
        this.measurements = measurements;
    }

    public String getMedications() {
        return medications;
    }

    public void setMedications(String medications) {
        this.medications = medications;
    }

    public String getFollowUpInstructions() {
        return followUpInstructions;
    }

    public void setFollowUpInstructions(String followUpInstructions) {
        this.followUpInstructions = followUpInstructions;
    }

    public String getQuestionsForDoctor() {
        return questionsForDoctor;
    }

    public void setQuestionsForDoctor(String questionsForDoctor) {
        this.questionsForDoctor = questionsForDoctor;
    }

    public String getMissingInformation() {
        return missingInformation;
    }

    public void setMissingInformation(String missingInformation) {
        this.missingInformation = missingInformation;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
