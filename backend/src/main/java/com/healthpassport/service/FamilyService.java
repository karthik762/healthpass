package com.healthpassport.service;

import com.healthpassport.dto.*;
import com.healthpassport.entity.FamilyGroup;
import com.healthpassport.entity.FamilyInvitation;
import com.healthpassport.entity.FamilyInvitation.InvitationStatus;
import com.healthpassport.entity.FamilyMembership;
import com.healthpassport.entity.FamilyMembership.MembershipRole;
import com.healthpassport.entity.FamilyMembership.MembershipStatus;
import com.healthpassport.entity.User;
import com.healthpassport.exception.ConflictException;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.repository.FamilyGroupRepository;
import com.healthpassport.repository.FamilyInvitationRepository;
import com.healthpassport.repository.FamilyMembershipRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FamilyService {
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;
    private static final Duration INVITATION_VALIDITY = Duration.ofDays(7);
    private final SecureRandom secureRandom = new SecureRandom();

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyMembershipRepository membershipRepository;
    private final FamilyInvitationRepository invitationRepository;
    private final UserService userService;
    private final MedicalRecordService medicalRecordService;

    public FamilyService(
        FamilyGroupRepository familyGroupRepository,
        FamilyMembershipRepository membershipRepository,
        FamilyInvitationRepository invitationRepository,
        UserService userService,
        MedicalRecordService medicalRecordService
    ) {
        this.familyGroupRepository = familyGroupRepository;
        this.membershipRepository = membershipRepository;
        this.invitationRepository = invitationRepository;
        this.userService = userService;
        this.medicalRecordService = medicalRecordService;
    }


    @Transactional
    public FamilyGroupResponse createFamilyGroup(String email, CreateFamilyGroupRequest request) {
        User creator = userService.findByEmail(email);

        FamilyGroup group = new FamilyGroup();
        group.setName(request.name().trim());
        group.setCreatedBy(creator);
        FamilyGroup savedGroup = familyGroupRepository.save(group);

        // Creator automatically becomes active OWNER
        FamilyMembership ownerMembership = new FamilyMembership();
        ownerMembership.setFamilyGroup(savedGroup);
        ownerMembership.setUser(creator);
        ownerMembership.setRole(MembershipRole.OWNER);
        ownerMembership.setStatus(MembershipStatus.ACTIVE);
        ownerMembership.setRecordAccessGranted(false);
        membershipRepository.save(ownerMembership);

        // Generate initial invitation code for creator
        String code = generateSecureCode();
        FamilyInvitation invitation = new FamilyInvitation();
        invitation.setFamilyGroup(savedGroup);
        invitation.setCreatedBy(creator);
        invitation.setCodeHash(hashToken(code));
        invitation.setStatus(InvitationStatus.ACTIVE);
        invitation.setExpiresAt(Instant.now().plus(INVITATION_VALIDITY));
        invitationRepository.save(invitation);

        return toGroupResponse(savedGroup, creator, code, invitation.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public List<FamilyGroupResponse> getMyFamilyGroups(String email) {
        User caller = userService.findByEmail(email);
        List<FamilyMembership> memberships = membershipRepository.findAllByUserId(caller.getId());

        List<FamilyGroupResponse> responses = new ArrayList<>();
        for (FamilyMembership mem : memberships) {
            FamilyGroup group = mem.getFamilyGroup();
            responses.add(toGroupResponse(group, caller, null, null));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public FamilyGroupResponse getFamilyGroup(String email, Long groupId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        FamilyMembership callerMembership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, caller.getId())
            .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this family group"));

        return toGroupResponse(group, caller, null, null);
    }

    @Transactional
    public FamilyMemberResponse joinFamilyWithCode(String email, JoinFamilyRequest request) {
        User caller = userService.findByEmail(email);
        String rawCode = request.invitationCode().trim().toUpperCase(Locale.ROOT);
        String hash = hashToken(rawCode);

        FamilyInvitation invitation = invitationRepository.findByCodeHash(hash)
            .orElseThrow(() -> new ResourceNotFoundException("Invalid, expired, or revoked invitation code"));

        if (!invitation.isValid()) {
            throw new ConflictException("Invitation code has expired or was revoked");
        }

        FamilyGroup group = invitation.getFamilyGroup();

        Optional<FamilyMembership> existing = membershipRepository.findByFamilyGroupIdAndUserId(group.getId(), caller.getId());
        if (existing.isPresent()) {
            FamilyMembership mem = existing.get();
            if (mem.getStatus() == MembershipStatus.ACTIVE) {
                throw new ConflictException("You are already an active member of this family group");
            } else if (mem.getStatus() == MembershipStatus.PENDING) {
                throw new ConflictException("You already have a pending membership request for this family group");
            } else {
                // If previously rejected, re-apply as PENDING
                mem.setStatus(MembershipStatus.PENDING);
                return toMemberResponse(membershipRepository.save(mem));
            }
        }

        FamilyMembership newMember = new FamilyMembership();
        newMember.setFamilyGroup(group);
        newMember.setUser(caller);
        newMember.setRole(MembershipRole.MEMBER);
        newMember.setStatus(MembershipStatus.PENDING);
        newMember.setRecordAccessGranted(false);
        newMember.setRequestedRecordAccess(false);

        return toMemberResponse(membershipRepository.save(newMember));
    }

    @Transactional
    public FamilyInvitationResponse regenerateInvitationCode(String email, Long groupId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        ensureOwner(group, caller);

        // Revoke any currently active invitation
        invitationRepository.findFirstByFamilyGroupIdAndStatusOrderByCreatedAtDesc(groupId, InvitationStatus.ACTIVE)
            .ifPresent(existing -> {
                existing.setStatus(InvitationStatus.REVOKED);
                invitationRepository.save(existing);
            });

        // Generate new code
        String newCode = generateSecureCode();
        FamilyInvitation invitation = new FamilyInvitation();
        invitation.setFamilyGroup(group);
        invitation.setCreatedBy(caller);
        invitation.setCodeHash(hashToken(newCode));
        invitation.setStatus(InvitationStatus.ACTIVE);
        invitation.setExpiresAt(Instant.now().plus(INVITATION_VALIDITY));
        FamilyInvitation saved = invitationRepository.save(invitation);

        return new FamilyInvitationResponse(saved.getId(), newCode, saved.getExpiresAt(), saved.getStatus().name());
    }

    @Transactional
    public void revokeInvitation(String email, Long groupId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        ensureOwner(group, caller);

        invitationRepository.findFirstByFamilyGroupIdAndStatusOrderByCreatedAtDesc(groupId, InvitationStatus.ACTIVE)
            .ifPresent(existing -> {
                existing.setStatus(InvitationStatus.REVOKED);
                invitationRepository.save(existing);
            });
    }

    @Transactional
    public FamilyMemberResponse acceptMembershipRequest(String email, Long groupId, Long targetMembershipId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        ensureOwner(group, caller);

        FamilyMembership target = membershipRepository.findById(targetMembershipId)
            .filter(m -> m.getFamilyGroup().getId().equals(groupId))
            .orElseThrow(() -> new ResourceNotFoundException("Membership request not found in this group"));

        if (target.getStatus() != MembershipStatus.PENDING) {
            throw new ConflictException("Membership request is not pending");
        }

        target.setStatus(MembershipStatus.ACTIVE);
        return toMemberResponse(membershipRepository.save(target));
    }

    @Transactional
    public void rejectMembershipRequest(String email, Long groupId, Long targetMembershipId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        ensureOwner(group, caller);

        FamilyMembership target = membershipRepository.findById(targetMembershipId)
            .filter(m -> m.getFamilyGroup().getId().equals(groupId))
            .orElseThrow(() -> new ResourceNotFoundException("Membership request not found"));

        target.setStatus(MembershipStatus.REJECTED);
        membershipRepository.save(target);
    }

    @Transactional
    public void removeMemberOrLeave(String email, Long groupId, Long targetMembershipId) {
        User caller = userService.findByEmail(email);
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        FamilyMembership target = membershipRepository.findById(targetMembershipId)
            .filter(m -> m.getFamilyGroup().getId().equals(groupId))
            .orElseThrow(() -> new ResourceNotFoundException("Membership not found"));

        boolean isSelf = target.getUser().getId().equals(caller.getId());
        boolean isOwner = group.getCreatedBy().getId().equals(caller.getId());

        if (!isSelf && !isOwner) {
            throw new ResourceNotFoundException("You are not authorized to remove this member");
        }

        // If the owner leaves and there are others, they cannot leave without transferring or disbanding
        if (isSelf && target.getRole() == MembershipRole.OWNER) {
            long activeCount = membershipRepository.findAllByFamilyGroupIdAndStatus(groupId, MembershipStatus.ACTIVE).size();
            if (activeCount > 1) {
                throw new ConflictException("Owner cannot leave a family group with other active members. Transfer ownership or remove members first.");
            }
        }

        membershipRepository.delete(target);
    }

    @Transactional
    public FamilyMemberResponse updateMyRecordConsent(String email, Long groupId, boolean grantRecordAccess) {
        User caller = userService.findByEmail(email);
        FamilyMembership membership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, caller.getId())
            .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this family group"));

        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            throw new ConflictException("Only active members can manage record consent");
        }

        membership.setRecordAccessGranted(grantRecordAccess);
        return toMemberResponse(membershipRepository.save(membership));
    }

    @Transactional
    public FamilyMemberResponse requestRecordAccess(String email, Long groupId, boolean requestAccess) {
        User caller = userService.findByEmail(email);
        FamilyMembership membership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, caller.getId())
            .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this family group"));

        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            throw new ConflictException("Only active members can request record access");
        }

        membership.setRequestedRecordAccess(requestAccess);
        return toMemberResponse(membershipRepository.save(membership));
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMemberRecords(String callerEmail, Long groupId, Long memberUserId) {
        User caller = userService.findByEmail(callerEmail);

        // Verify caller is active member of this group
        FamilyMembership callerMembership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, caller.getId())
            .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("You are not an active member of this family group"));

        // If caller is requesting their own records, return empty or throw (use records API)
        if (caller.getId().equals(memberUserId)) {
            throw new ConflictException("Use /api/records to view your own records");
        }

        // Verify target user is active in this group AND has explicitly granted record access
        FamilyMembership targetMembership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, memberUserId)
            .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("Target user is not an active member of this family group"));

        if (!targetMembership.isRecordAccessGranted()) {
            throw new ResourceNotFoundException("This family member has not granted consent to share their medical records");
        }

        // Load target member's records
        return userService.findById(memberUserId)
            .map(targetUser -> medicalRecordService.listForOwner(targetUser.getEmail()))
            .orElse(List.of());
    }


    private void ensureOwner(FamilyGroup group, User user) {
        if (!group.getCreatedBy().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Only the family group owner can perform this operation");
        }
    }

    private String generateSecureCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(secureRandom.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    public static String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(raw.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private FamilyGroupResponse toGroupResponse(FamilyGroup group, User caller, String activeCode, Instant codeExpiresAt) {
        boolean isOwner = group.getCreatedBy().getId().equals(caller.getId());

        List<FamilyMembership> allMemberships = membershipRepository.findAllByFamilyGroupId(group.getId());
        List<FamilyMemberResponse> members = new ArrayList<>();
        List<FamilyMemberResponse> pending = new ArrayList<>();

        for (FamilyMembership mem : allMemberships) {
            if (mem.getStatus() == MembershipStatus.ACTIVE) {
                members.add(toMemberResponse(mem));
            } else if (mem.getStatus() == MembershipStatus.PENDING) {
                pending.add(toMemberResponse(mem));
            }
        }

        String invitationCode = null;
        Instant invitationExpiry = null;

        if (isOwner) {
            if (activeCode != null) {
                invitationCode = activeCode;
                invitationExpiry = codeExpiresAt;
            } else {
                Optional<FamilyInvitation> activeInvite = invitationRepository
                    .findFirstByFamilyGroupIdAndStatusOrderByCreatedAtDesc(group.getId(), InvitationStatus.ACTIVE);
                if (activeInvite.isPresent() && activeInvite.get().isValid()) {
                    invitationExpiry = activeInvite.get().getExpiresAt();
                }
            }
        }

        return new FamilyGroupResponse(
            group.getId(),
            group.getName(),
            group.getCreatedBy().getId(),
            group.getCreatedBy().getFullName(),
            group.getCreatedAt(),
            invitationCode,
            invitationExpiry,
            members,
            isOwner ? pending : List.of()
        );
    }

    private FamilyMemberResponse toMemberResponse(FamilyMembership membership) {
        User u = membership.getUser();
        return new FamilyMemberResponse(
            membership.getId(),
            u.getId(),
            u.getFullName(),
            u.getEmail(),
            membership.getRole().name(),
            membership.getStatus().name(),
            membership.isRecordAccessGranted(),
            membership.isRequestedRecordAccess(),
            membership.getCreatedAt()
        );
    }
}
