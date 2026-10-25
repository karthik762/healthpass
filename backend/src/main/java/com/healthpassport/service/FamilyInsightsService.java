package com.healthpassport.service;

import com.healthpassport.dto.ConditionPatternItem;
import com.healthpassport.dto.FamilyHealthInsightsResponse;
import com.healthpassport.dto.MedicalRecordResponse;
import com.healthpassport.entity.FamilyGroup;
import com.healthpassport.entity.FamilyMembership;
import com.healthpassport.entity.FamilyMembership.MembershipStatus;
import com.healthpassport.entity.User;
import com.healthpassport.exception.ResourceNotFoundException;
import com.healthpassport.repository.FamilyGroupRepository;
import com.healthpassport.repository.FamilyMembershipRepository;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FamilyInsightsService {

    private static final String CLINICAL_DISCLAIMER =
        "Informational observations only. Recorded health history in a family group does not establish biological relation, " +
        "genetic inheritance, diagnostic certainty, or clinical risk. Consult a qualified healthcare professional for genetic counseling and medical evaluation.";

    // Clinically relevant condition keywords/categories to identify patterns across records
    private static final Map<String, List<String>> CANONICAL_CONDITIONS = new LinkedHashMap<>();

    static {
        CANONICAL_CONDITIONS.put("Hypertension & High Blood Pressure", List.of("hypertension", "high blood pressure", "blood pressure", "bp", "cardiovascular"));
        CANONICAL_CONDITIONS.put("Type 2 Diabetes & Glucose Intolerance", List.of("diabetes", "diabetic", "blood sugar", "glucose", "hba1c", "metformin"));
        CANONICAL_CONDITIONS.put("Asthma & Respiratory Allergies", List.of("asthma", "inhaler", "wheezing", "respiratory", "bronchitis"));
        CANONICAL_CONDITIONS.put("Dyslipidemia & Cholesterol", List.of("cholesterol", "lipid", "triglycerides", "hyperlipidemia", "statin"));
        CANONICAL_CONDITIONS.put("Thyroid Disorder", List.of("thyroid", "hypothyroidism", "hyperthyroidism", "tsh", "levothyroxine"));
        CANONICAL_CONDITIONS.put("Allergies & Sensitivities", List.of("allergy", "allergic", "penicillin", "peanut", "anaphylaxis", "atopic"));
        CANONICAL_CONDITIONS.put("Migraine & Chronic Headache", List.of("migraine", "headache", "cluster headache"));
        CANONICAL_CONDITIONS.put("Arthritis & Joint Inflammation", List.of("arthritis", "osteoarthritis", "rheumatoid", "joint pain"));
    }

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyMembershipRepository membershipRepository;
    private final UserService userService;
    private final MedicalRecordService medicalRecordService;

    public FamilyInsightsService(
        FamilyGroupRepository familyGroupRepository,
        FamilyMembershipRepository membershipRepository,
        UserService userService,
        MedicalRecordService medicalRecordService
    ) {
        this.familyGroupRepository = familyGroupRepository;
        this.membershipRepository = membershipRepository;
        this.userService = userService;
        this.medicalRecordService = medicalRecordService;
    }

    @Transactional(readOnly = true)
    public FamilyHealthInsightsResponse generateGroupInsights(String callerEmail, Long groupId) {
        User caller = userService.findByEmail(callerEmail);

        // 1. Verify group exists
        FamilyGroup group = familyGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Family group not found"));

        // 2. Verify caller is an ACTIVE approved member of this family group
        FamilyMembership callerMembership = membershipRepository.findByFamilyGroupIdAndUserId(groupId, caller.getId())
            .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("You are not an active member of this family group"));

        // 3. Find all ACTIVE members in this group
        List<FamilyMembership> allActiveMemberships = membershipRepository.findAllByFamilyGroupIdAndStatus(groupId, MembershipStatus.ACTIVE);
        int totalActiveMembers = allActiveMemberships.size();

        // 4. Identify who is eligible for analysis:
        // - The caller is always eligible (their own records are analyzed)
        // - Other members MUST have explicitly granted recordAccessGranted == true
        Map<Long, List<MedicalRecordResponse>> recordsByMember = new HashMap<>();

        // Add caller's own records
        recordsByMember.put(caller.getId(), medicalRecordService.listForOwner(caller.getEmail()));

        // Add consenting members' records
        int consentingCount = 1; // caller counts as consenting for self
        for (FamilyMembership membership : allActiveMemberships) {
            if (membership.getUser().getId().equals(caller.getId())) {
                continue;
            }
            // Strict consent boundary: membership status is ACTIVE and recordAccessGranted is true
            if (membership.isRecordAccessGranted()) {
                recordsByMember.put(membership.getUser().getId(), medicalRecordService.listForOwner(membership.getUser().getEmail()));
                consentingCount++;
            }
        }

        // 5. If fewer than 2 total consenting members (e.g. only caller or no one else consented),
        // we display an honest notice explaining that reliable multi-member pattern analysis requires at least 2 consenting members.
        if (consentingCount < 2) {
            return new FamilyHealthInsightsResponse(
                group.getId(),
                group.getName(),
                totalActiveMembers,
                consentingCount,
                true,
                Collections.emptyList(),
                "Insufficient consented data. Cross-member health insights require at least two active family members with explicit record sharing consent enabled.",
                CLINICAL_DISCLAIMER
            );
        }

        // 6. Aggregate patterns across consenting members without exposing individual identities
        // Map: Condition Name -> Set of member IDs having matching records
        Map<String, Set<Long>> membersByCondition = new LinkedHashMap<>();
        Map<String, Set<String>> categoriesByCondition = new LinkedHashMap<>();

        for (Map.Entry<Long, List<MedicalRecordResponse>> entry : recordsByMember.entrySet()) {
            Long memberId = entry.getKey();
            List<MedicalRecordResponse> records = entry.getValue();

            for (MedicalRecordResponse record : records) {
                String searchHaystack = buildSearchText(record);

                for (Map.Entry<String, List<String>> condEntry : CANONICAL_CONDITIONS.entrySet()) {
                    String canonicalName = condEntry.getKey();
                    List<String> keywords = condEntry.getValue();

                    boolean matches = keywords.stream().anyMatch(kw -> containsWord(searchHaystack, kw));
                    if (matches) {
                        membersByCondition.computeIfAbsent(canonicalName, k -> new HashSet<>()).add(memberId);
                        categoriesByCondition.computeIfAbsent(canonicalName, k -> new HashSet<>()).add(record.recordType());
                    }
                }
            }
        }

        // 7. Filter to conditions appearing in multiple (>= 2) consenting family members
        List<ConditionPatternItem> observedPatterns = new ArrayList<>();
        for (Map.Entry<String, Set<Long>> entry : membersByCondition.entrySet()) {
            String condition = entry.getKey();
            Set<Long> affectedMembers = entry.getValue();

            if (affectedMembers.size() >= 2) {
                List<String> categories = new ArrayList<>(categoriesByCondition.getOrDefault(condition, Collections.emptySet()));
                Collections.sort(categories);

                String summary = String.format("Recorded across %d consenting family members in categories: %s.",
                    affectedMembers.size(), String.join(", ", categories));

                observedPatterns.add(new ConditionPatternItem(
                    condition,
                    affectedMembers.size(),
                    categories,
                    summary
                ));
            }
        }

        // Sort patterns with highest affected member count first
        observedPatterns.sort(Comparator.comparingInt(ConditionPatternItem::affectedMembersCount).reversed());

        String sufficiencyNotice = observedPatterns.isEmpty()
            ? "No recurring conditions or shared health patterns were detected among current consenting family records."
            : String.format("Identified %d condition pattern(s) appearing in 2 or more consenting family members.", observedPatterns.size());

        return new FamilyHealthInsightsResponse(
            group.getId(),
            group.getName(),
            totalActiveMembers,
            consentingCount,
            true,
            observedPatterns,
            sufficiencyNotice,
            CLINICAL_DISCLAIMER
        );
    }

    private String buildSearchText(MedicalRecordResponse record) {
        StringBuilder sb = new StringBuilder();
        if (record.title() != null) sb.append(record.title()).append(" ");
        if (record.recordType() != null) sb.append(record.recordType()).append(" ");
        if (record.notes() != null) sb.append(record.notes()).append(" ");
        return sb.toString().toLowerCase(Locale.ROOT);
    }

    private boolean containsWord(String text, String keyword) {
        // Regex word boundary matching or substring matching for multi-word phrases
        if (keyword.contains(" ")) {
            return text.contains(keyword.toLowerCase(Locale.ROOT));
        }
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(keyword.toLowerCase(Locale.ROOT)) + "\\b");
        return pattern.matcher(text).find();
    }
}
