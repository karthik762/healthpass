package com.healthpassport.service;

import com.healthpassport.dto.*;
import com.healthpassport.entity.CommunityHealthConsent;
import com.healthpassport.entity.MedicalRecord;
import com.healthpassport.entity.User;
import com.healthpassport.repository.CommunityHealthConsentRepository;
import com.healthpassport.repository.MedicalRecordRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunityHealthService {

    // Configurable minimum group size threshold: aggregates with fewer than 3 unique patients are suppressed
    public static final int MIN_GROUP_SIZE_THRESHOLD = 3;

    private static final String PRIVACY_NOTICE =
        "Privacy Safeguards: Aggregates are computed strictly from users who have explicitly opted in. " +
        "Small groups with fewer than " + MIN_GROUP_SIZE_THRESHOLD + " contributing patients are suppressed to prevent re-identification. " +
        "Simple aggregation does not guarantee differential privacy. Data is coarse-grained and does not imply diagnostic causation.";

    private final CommunityHealthConsentRepository consentRepository;
    private final MedicalRecordRepository recordRepository;
    private final UserService userService;

    public CommunityHealthService(
        CommunityHealthConsentRepository consentRepository,
        MedicalRecordRepository recordRepository,
        UserService userService
    ) {
        this.consentRepository = consentRepository;
        this.recordRepository = recordRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public CommunityConsentResponse getConsentStatus(String email) {
        User user = userService.findByEmail(email);
        return consentRepository.findByUserId(user.getId())
            .map(this::toConsentResponse)
            .orElseGet(() -> new CommunityConsentResponse(false, null, null,
                "You have not opted into community health intelligence. None of your records are used in community statistics."));
    }

    @Transactional
    public CommunityConsentResponse updateConsent(String email, boolean optIn) {
        User user = userService.findByEmail(email);
        CommunityHealthConsent consent = consentRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                CommunityHealthConsent c = new CommunityHealthConsent();
                c.setUser(user);
                return c;
            });

        consent.setOptedIn(optIn);
        Instant now = Instant.now();
        if (optIn) {
            consent.setConsentedAt(now);
        } else {
            consent.setRevokedAt(now);
        }

        CommunityHealthConsent saved = consentRepository.save(consent);
        return toConsentResponse(saved);
    }

    @Transactional(readOnly = true)
    public CommunityIntelligenceResponse getAggregatedIntelligence() {
        // 1. Retrieve all active consenting user IDs
        List<Long> consentingUserIds = consentRepository.findConsentingUserIds();
        long totalConsentingPatients = consentingUserIds.size();

        if (totalConsentingPatients == 0) {
            return new CommunityIntelligenceResponse(
                MIN_GROUP_SIZE_THRESHOLD,
                0,
                0,
                Collections.emptyList(),
                Collections.emptyList(),
                "No community records available. Currently 0 patients have opted in to share records for community health intelligence.",
                PRIVACY_NOTICE,
                Instant.now()
            );
        }

        // 2. Fetch all medical records contributed by active consenting users only
        List<MedicalRecord> eligibleRecords = recordRepository.findAllByUserIdInOrderByRecordDateDesc(consentingUserIds);

        // 3. Aggregate by Category / Record Type
        Map<String, Set<Long>> patientsByCategory = new LinkedHashMap<>();
        Map<String, Integer> eventCountByCategory = new LinkedHashMap<>();

        for (MedicalRecord record : eligibleRecords) {
            String category = normalizeCategory(record.getRecordType());
            Long patientId = record.getUser().getId();

            patientsByCategory.computeIfAbsent(category, k -> new HashSet<>()).add(patientId);
            eventCountByCategory.put(category, eventCountByCategory.getOrDefault(category, 0) + 1);
        }

        List<CategoryAggregateItem> categoryAggregates = new ArrayList<>();
        for (Map.Entry<String, Set<Long>> entry : patientsByCategory.entrySet()) {
            String category = entry.getKey();
            int uniquePatients = entry.getValue().size();
            int totalEvents = eventCountByCategory.getOrDefault(category, 0);

            // Apply minimum group-size threshold suppression
            if (uniquePatients < MIN_GROUP_SIZE_THRESHOLD) {
                categoryAggregates.add(new CategoryAggregateItem(
                    category,
                    0,
                    0,
                    true,
                    "Suppressed: fewer than " + MIN_GROUP_SIZE_THRESHOLD + " contributing patients."
                ));
            } else {
                categoryAggregates.add(new CategoryAggregateItem(
                    category,
                    totalEvents,
                    uniquePatients,
                    false,
                    null
                ));
            }
        }

        // Sort by totalEvents descending
        categoryAggregates.sort(Comparator.comparingInt(CategoryAggregateItem::totalEvents).reversed());

        // 4. Predefined coarse-grained time window trends (Quarterly periods)
        // Group by year and quarter to prevent arbitrary narrow-window querying
        Map<String, Set<Long>> patientsByQuarter = new TreeMap<>();
        Map<String, Integer> eventsByQuarter = new TreeMap<>();

        for (MedicalRecord record : eligibleRecords) {
            String quarterKey = toQuarterLabel(record.getRecordDate());
            Long patientId = record.getUser().getId();

            patientsByQuarter.computeIfAbsent(quarterKey, k -> new HashSet<>()).add(patientId);
            eventsByQuarter.put(quarterKey, eventsByQuarter.getOrDefault(quarterKey, 0) + 1);
        }

        List<TimeWindowTrendItem> timeWindowTrends = new ArrayList<>();
        for (Map.Entry<String, Set<Long>> entry : patientsByQuarter.entrySet()) {
            String quarter = entry.getKey();
            int uniquePatients = entry.getValue().size();
            int events = eventsByQuarter.getOrDefault(quarter, 0);

            if (uniquePatients < MIN_GROUP_SIZE_THRESHOLD) {
                timeWindowTrends.add(new TimeWindowTrendItem(quarter, 0, 0, true));
            } else {
                timeWindowTrends.add(new TimeWindowTrendItem(quarter, events, uniquePatients, false));
            }
        }

        String sufficiencyNotice;
        long unsuppressedCategories = categoryAggregates.stream().filter(c -> !c.suppressed()).count();
        if (unsuppressedCategories == 0) {
            sufficiencyNotice = "Community data is currently below the privacy threshold (" +
                MIN_GROUP_SIZE_THRESHOLD + " consenting patients per category). Categories with fewer than " +
                MIN_GROUP_SIZE_THRESHOLD + " contributors have been suppressed to protect privacy.";
        } else {
            sufficiencyNotice = "Displaying aggregated health signals across " + totalConsentingPatients +
                " consenting community member(s). Categories with fewer than " + MIN_GROUP_SIZE_THRESHOLD +
                " contributors are masked for anonymity.";
        }

        return new CommunityIntelligenceResponse(
            MIN_GROUP_SIZE_THRESHOLD,
            totalConsentingPatients,
            eligibleRecords.size(),
            categoryAggregates,
            timeWindowTrends,
            sufficiencyNotice,
            PRIVACY_NOTICE,
            Instant.now()
        );
    }

    private String normalizeCategory(String rawType) {
        if (rawType == null || rawType.isBlank()) return "Other Medical Record";
        return rawType.trim();
    }

    private String toQuarterLabel(LocalDate date) {
        if (date == null) return "Unknown Period";
        int quarter = (date.getMonthValue() - 1) / 3 + 1;
        return date.getYear() + " Q" + quarter;
    }

    private CommunityConsentResponse toConsentResponse(CommunityHealthConsent consent) {
        String notice = consent.isOptedIn()
            ? "Your records are currently contributing to privacy-preserving community statistics. You can withdraw consent at any time."
            : "You are not contributing to community health statistics. Your records are completely excluded from community intelligence calculations.";
        return new CommunityConsentResponse(consent.isOptedIn(), consent.getConsentedAt(), consent.getRevokedAt(), notice);
    }
}
