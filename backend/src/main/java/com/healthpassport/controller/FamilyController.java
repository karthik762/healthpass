package com.healthpassport.controller;

import com.healthpassport.dto.*;
import com.healthpassport.service.FamilyService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/family")
public class FamilyController {
    private final FamilyService familyService;
    private final com.healthpassport.service.FamilyInsightsService familyInsightsService;

    public FamilyController(FamilyService familyService, com.healthpassport.service.FamilyInsightsService familyInsightsService) {
        this.familyService = familyService;
        this.familyInsightsService = familyInsightsService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FamilyGroupResponse>> create(
        Authentication authentication,
        @Valid @RequestBody CreateFamilyGroupRequest request
    ) {
        FamilyGroupResponse response = familyService.createFamilyGroup(authentication.getName(), request);
        return ResponseEntity.created(URI.create("/api/family/" + response.id()))
            .body(ApiResponse.success("Family group created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FamilyGroupResponse>>> getMyGroups(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Family groups retrieved", familyService.getMyFamilyGroups(authentication.getName())));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<FamilyGroupResponse>> getGroup(
        Authentication authentication,
        @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Family group retrieved", familyService.getFamilyGroup(authentication.getName(), groupId)));
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> join(
        Authentication authentication,
        @Valid @RequestBody JoinFamilyRequest request
    ) {
        FamilyMemberResponse response = familyService.joinFamilyWithCode(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Membership request submitted", response));
    }

    @PostMapping("/{groupId}/invitations/regenerate")
    public ResponseEntity<ApiResponse<FamilyInvitationResponse>> regenerateCode(
        Authentication authentication,
        @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Invitation code regenerated", familyService.regenerateInvitationCode(authentication.getName(), groupId)));
    }

    @PostMapping("/{groupId}/invitations/revoke")
    public ResponseEntity<ApiResponse<Void>> revokeCode(
        Authentication authentication,
        @PathVariable Long groupId
    ) {
        familyService.revokeInvitation(authentication.getName(), groupId);
        return ResponseEntity.ok(ApiResponse.success("Active invitation code revoked"));
    }

    @PostMapping("/{groupId}/members/{membershipId}/accept")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> acceptMember(
        Authentication authentication,
        @PathVariable Long groupId,
        @PathVariable Long membershipId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Membership request accepted", familyService.acceptMembershipRequest(authentication.getName(), groupId, membershipId)));
    }

    @PostMapping("/{groupId}/members/{membershipId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectMember(
        Authentication authentication,
        @PathVariable Long groupId,
        @PathVariable Long membershipId
    ) {
        familyService.rejectMembershipRequest(authentication.getName(), groupId, membershipId);
        return ResponseEntity.ok(ApiResponse.success("Membership request rejected"));
    }

    @DeleteMapping("/{groupId}/members/{membershipId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
        Authentication authentication,
        @PathVariable Long groupId,
        @PathVariable Long membershipId
    ) {
        familyService.removeMemberOrLeave(authentication.getName(), groupId, membershipId);
        return ResponseEntity.ok(ApiResponse.success("Member removed or left successfully"));
    }

    @PutMapping("/{groupId}/consent")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> updateConsent(
        Authentication authentication,
        @PathVariable Long groupId,
        @RequestBody Map<String, Boolean> body
    ) {
        boolean grant = body != null && Boolean.TRUE.equals(body.get("grantRecordAccess"));
        return ResponseEntity.ok(ApiResponse.success("Record consent updated", familyService.updateMyRecordConsent(authentication.getName(), groupId, grant)));
    }

    @PutMapping("/{groupId}/request-access")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> requestAccess(
        Authentication authentication,
        @PathVariable Long groupId,
        @RequestBody Map<String, Boolean> body
    ) {
        boolean requestAccess = body != null && Boolean.TRUE.equals(body.get("requestAccess"));
        return ResponseEntity.ok(ApiResponse.success("Record access request updated", familyService.requestRecordAccess(authentication.getName(), groupId, requestAccess)));
    }

    @GetMapping("/{groupId}/members/{memberUserId}/records")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getMemberRecords(
        Authentication authentication,
        @PathVariable Long groupId,
        @PathVariable Long memberUserId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Consented member medical records retrieved", familyService.getMemberRecords(authentication.getName(), groupId, memberUserId)));
    }

    @GetMapping("/{groupId}/insights")
    public ResponseEntity<ApiResponse<com.healthpassport.dto.FamilyHealthInsightsResponse>> getFamilyInsights(
        Authentication authentication,
        @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Family health insights generated", familyInsightsService.generateGroupInsights(authentication.getName(), groupId)));
    }
}
