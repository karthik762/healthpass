package com.healthpassport.service;

import com.healthpassport.dto.UserRegistrationRequest;
import com.healthpassport.dto.UserResponse;
import com.healthpassport.entity.User;
import com.healthpassport.exception.ConflictException;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.repository.UserRepository;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.healthpassport.repository.DoctorProfileRepository doctorProfileRepository;

    public UserService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        com.healthpassport.repository.DoctorProfileRepository doctorProfileRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.doctorProfileRepository = doctorProfileRepository;
    }

    @Transactional
    public UserResponse register(UserRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) throw new ConflictException("An account with that email already exists");
        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(com.healthpassport.entity.UserRole.ROLE_PATIENT);
        return toResponse(userRepository.save(user));
    }
    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email)).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
    @Transactional(readOnly = true)
    public java.util.Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    public UserResponse toResponse(User user) {
        com.healthpassport.entity.DoctorVerificationStatus status = null;
        if (user.getRole() == com.healthpassport.entity.UserRole.ROLE_DOCTOR) {
            status = doctorProfileRepository.findByUserId(user.getId())
                .map(com.healthpassport.entity.DoctorProfile::getVerificationStatus)
                .orElse(null);
        }
        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole(),
            status,
            user.getCreatedAt()
        );
    }
    private String normalizeEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}

