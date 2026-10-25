package com.healthpassport.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "doctor_profiles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_doctor_user", columnNames = "user_id"),
        @UniqueConstraint(name = "uk_doctor_registration_number", columnNames = "medicalRegistrationNumber")
    }
)
public class DoctorProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_doctor_user"))
    private User user;

    @Column(nullable = false, length = 100)
    private String medicalRegistrationNumber;

    @Column(nullable = false, length = 150)
    private String licensingAuthority;

    @Column(nullable = false, length = 100)
    private String professionalQualification;

    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(length = 150)
    private String clinicOrHospitalName;

    @Column(length = 30)
    private String contactNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DoctorVerificationStatus verificationStatus = DoctorVerificationStatus.PENDING_VERIFICATION;

    @Column(length = 500)
    private String verificationNotes;

    private Instant verifiedAt;

    @Column(length = 150)
    private String verifiedBy;

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

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getMedicalRegistrationNumber() { return medicalRegistrationNumber; }
    public void setMedicalRegistrationNumber(String medicalRegistrationNumber) { this.medicalRegistrationNumber = medicalRegistrationNumber; }

    public String getLicensingAuthority() { return licensingAuthority; }
    public void setLicensingAuthority(String licensingAuthority) { this.licensingAuthority = licensingAuthority; }

    public String getProfessionalQualification() { return professionalQualification; }
    public void setProfessionalQualification(String professionalQualification) { this.professionalQualification = professionalQualification; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public String getClinicOrHospitalName() { return clinicOrHospitalName; }
    public void setClinicOrHospitalName(String clinicOrHospitalName) { this.clinicOrHospitalName = clinicOrHospitalName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public DoctorVerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(DoctorVerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }

    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
