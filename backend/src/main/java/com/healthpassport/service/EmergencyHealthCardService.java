package com.healthpassport.service;

import com.healthpassport.dto.EmergencyHealthCardRequest;
import com.healthpassport.dto.EmergencyHealthCardResponse;
import com.healthpassport.entity.EmergencyHealthCard;
import com.healthpassport.entity.User;
import com.healthpassport.repository.EmergencyHealthCardRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmergencyHealthCardService {
    private final EmergencyHealthCardRepository emergencyCardRepository;
    private final UserService userService;

    public EmergencyHealthCardService(EmergencyHealthCardRepository emergencyCardRepository, UserService userService) {
        this.emergencyCardRepository = emergencyCardRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public Optional<EmergencyHealthCardResponse> getForOwner(String email) {
        User owner = userService.findByEmail(email);
        return emergencyCardRepository.findByUserId(owner.getId()).map(this::toResponse);
    }

    @Transactional
    public EmergencyHealthCardResponse createOrUpdate(String email, EmergencyHealthCardRequest request) {
        User owner = userService.findByEmail(email);
        EmergencyHealthCard card = emergencyCardRepository.findByUserId(owner.getId())
            .orElseGet(() -> {
                EmergencyHealthCard newCard = new EmergencyHealthCard();
                newCard.setUser(owner);
                return newCard;
            });

        card.setBloodGroup(clean(request.bloodGroup()));
        card.setAllergies(clean(request.allergies()));
        card.setCurrentMedications(clean(request.currentMedications()));
        card.setMedicalConditions(clean(request.medicalConditions()));
        card.setEmergencyContactName(clean(request.emergencyContactName()));
        card.setEmergencyContactRelationship(clean(request.emergencyContactRelationship()));
        card.setEmergencyContactPhone(clean(request.emergencyContactPhone()));
        card.setAdditionalNotes(clean(request.additionalNotes()));

        EmergencyHealthCard saved = emergencyCardRepository.save(card);
        return toResponse(saved);
    }

    private String clean(String val) {
        return (val == null || val.isBlank()) ? null : val.trim();
    }

    private EmergencyHealthCardResponse toResponse(EmergencyHealthCard card) {
        return new EmergencyHealthCardResponse(
            card.getId(),
            card.getUser().getFullName(),
            card.getBloodGroup(),
            card.getAllergies(),
            card.getCurrentMedications(),
            card.getMedicalConditions(),
            card.getEmergencyContactName(),
            card.getEmergencyContactRelationship(),
            card.getEmergencyContactPhone(),
            card.getAdditionalNotes(),
            card.getCreatedAt(),
            card.getUpdatedAt()
        );
    }
}
