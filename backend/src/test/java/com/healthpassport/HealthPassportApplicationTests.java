package com.healthpassport;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthpassport.config.OllamaProperties;
import com.healthpassport.exception.AiServiceUnavailableException;
import com.healthpassport.service.OllamaClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class HealthPassportApplicationTests {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private OllamaClient ollamaClient;

    @Test void healthEndpointIsPublicAndUsesStandardResponse() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.status", is("UP")));
    }

    @Test void registrationHashesPasswordAndReturnsCreated() throws Exception {
        String request = "{\"fullName\":\"Test Patient\",\"email\":\"test.patient@example.com\",\"password\":\"sufficientPassword9\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.email", is("test.patient@example.com")));
    }

    @Test void authenticatedPatientCanCreateAndListTheirOwnRecordMetadata() throws Exception {
        String registration = "{\"fullName\":\"Record Owner\",\"email\":\"record.owner@example.com\",\"password\":\"sufficientPassword9\"}";
        String record = "{\"title\":\"Demo blood result\",\"recordType\":\"Lab result\",\"providerName\":\"Demo Lab\",\"recordDate\":\"2026-04-18\",\"notes\":\"Metadata only\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(registration)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("record.owner@example.com", "sufficientPassword9")).contentType(MediaType.APPLICATION_JSON).content(record))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.data.title", is("Demo blood result")));
        mockMvc.perform(get("/api/records").with(httpBasic("record.owner@example.com", "sufficientPassword9")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()", is(1)));
    }

    @Test void recordsAreStrictlyScopedToOwnerAndNotAccessibleByOtherUsers() throws Exception {
        // Register User A
        String userA = "{\"fullName\":\"User Alice\",\"email\":\"alice@example.com\",\"password\":\"passwordAlice1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userA))
            .andExpect(status().isCreated());

        // Register User B
        String userB = "{\"fullName\":\"User Bob\",\"email\":\"bob@example.com\",\"password\":\"passwordBob1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userB))
            .andExpect(status().isCreated());

        // Alice creates a record
        String aliceRecord = "{\"title\":\"Alice Blood Test\",\"recordType\":\"Lab result\",\"providerName\":\"Alice Clinic\",\"recordDate\":\"2026-04-10\",\"notes\":\"Private notes\"}";
        MvcResult createResult = mockMvc.perform(post("/api/records").with(httpBasic("alice@example.com", "passwordAlice1"))
            .contentType(MediaType.APPLICATION_JSON).content(aliceRecord))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode responseNode = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long recordId = responseNode.get("data").get("id").asLong();

        // Bob queries his own records -> should be 0
        mockMvc.perform(get("/api/records").with(httpBasic("bob@example.com", "passwordBob1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(0)));

        // Bob attempts to read Alice's record by ID -> 404 Not Found
        mockMvc.perform(get("/api/records/" + recordId).with(httpBasic("bob@example.com", "passwordBob1")))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success", is(false)));

        // Bob attempts to edit Alice's record -> 404 Not Found
        String updatePayload = "{\"title\":\"Hacked Record\",\"recordType\":\"Lab result\",\"recordDate\":\"2026-04-10\"}";
        mockMvc.perform(put("/api/records/" + recordId).with(httpBasic("bob@example.com", "passwordBob1"))
            .contentType(MediaType.APPLICATION_JSON).content(updatePayload))
            .andExpect(status().isNotFound());

        // Bob attempts to delete Alice's record -> 404 Not Found
        mockMvc.perform(delete("/api/records/" + recordId).with(httpBasic("bob@example.com", "passwordBob1")))
            .andExpect(status().isNotFound());

        // Unauthenticated access -> 401 Unauthorized
        mockMvc.perform(get("/api/records/" + recordId))
            .andExpect(status().isUnauthorized());

        // Alice can access her record
        mockMvc.perform(get("/api/records/" + recordId).with(httpBasic("alice@example.com", "passwordAlice1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title", is("Alice Blood Test")));

        // Alice can delete her record
        mockMvc.perform(delete("/api/records/" + recordId).with(httpBasic("alice@example.com", "passwordAlice1")))
            .andExpect(status().isNoContent());

        // Alice list is now empty
        mockMvc.perform(get("/api/records").with(httpBasic("alice@example.com", "passwordAlice1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(0)));
    }

    @Test void familyNetworkWorkflowAndPermissionsEnforced() throws Exception {
        // Register Parent User
        String parentUser = "{\"fullName\":\"Parent User\",\"email\":\"parent@example.com\",\"password\":\"parentPass123\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(parentUser))
            .andExpect(status().isCreated());

        // Register Child User
        String childUser = "{\"fullName\":\"Child User\",\"email\":\"child@example.com\",\"password\":\"childPass123\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(childUser))
            .andExpect(status().isCreated());

        // Register Outside User
        String outsideUser = "{\"fullName\":\"Outside User\",\"email\":\"outside@example.com\",\"password\":\"outsidePass123\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(outsideUser))
            .andExpect(status().isCreated());

        // 1. Parent creates a family group
        String createGroup = "{\"name\":\"Kumar Family Circle\"}";
        MvcResult groupResult = mockMvc.perform(post("/api/family").with(httpBasic("parent@example.com", "parentPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(createGroup))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name", is("Kumar Family Circle")))
            .andExpect(jsonPath("$.data.activeInvitationCode").exists())
            .andReturn();

        JsonNode groupNode = objectMapper.readTree(groupResult.getResponse().getContentAsString());
        long groupId = groupNode.get("data").get("id").asLong();
        String inviteCode = groupNode.get("data").get("activeInvitationCode").asText();

        // 2. Child joins using the invitation code
        String joinPayload = "{\"invitationCode\":\"" + inviteCode + "\"}";
        MvcResult joinResult = mockMvc.perform(post("/api/family/join").with(httpBasic("child@example.com", "childPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(joinPayload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status", is("PENDING")))
            .andReturn();

        JsonNode joinNode = objectMapper.readTree(joinResult.getResponse().getContentAsString());
        long childMembershipId = joinNode.get("data").get("membershipId").asLong();

        // Duplicate membership request should be rejected
        mockMvc.perform(post("/api/family/join").with(httpBasic("child@example.com", "childPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(joinPayload))
            .andExpect(status().isConflict());

        // 3. Unauthorized user (outside user) cannot accept child membership
        mockMvc.perform(post("/api/family/" + groupId + "/members/" + childMembershipId + "/accept")
            .with(httpBasic("outside@example.com", "outsidePass123")))
            .andExpect(status().isNotFound());

        // Parent accepts the child's membership
        mockMvc.perform(post("/api/family/" + groupId + "/members/" + childMembershipId + "/accept")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        // 4. Test code revocation and rejection of revoked code
        mockMvc.perform(post("/api/family/" + groupId + "/invitations/revoke")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isOk());

        // Outside user tries to join using revoked code -> should be rejected
        mockMvc.perform(post("/api/family/join").with(httpBasic("outside@example.com", "outsidePass123"))
            .contentType(MediaType.APPLICATION_JSON).content(joinPayload))
            .andExpect(status().isConflict());

        // 5. Test regenerate code
        MvcResult regenResult = mockMvc.perform(post("/api/family/" + groupId + "/invitations/regenerate")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.invitationCode").exists())
            .andReturn();

        JsonNode regenNode = objectMapper.readTree(regenResult.getResponse().getContentAsString());
        String newCode = regenNode.get("data").get("invitationCode").asText();

        // 6. Medical record privacy & consent check:
        // Child creates a private record
        String childRecord = "{\"title\":\"Child Vaccination\",\"recordType\":\"Vaccination\",\"providerName\":\"Pediatric Care\",\"recordDate\":\"2026-04-01\",\"notes\":\"Private vaccine\"}";
        mockMvc.perform(post("/api/records").with(httpBasic("child@example.com", "childPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(childRecord))
            .andExpect(status().isCreated());

        // Child's user ID
        MvcResult childMeResult = mockMvc.perform(get("/api/users/me").with(httpBasic("child@example.com", "childPass123")))
            .andExpect(status().isOk())
            .andReturn();
        long childUserId = objectMapper.readTree(childMeResult.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Parent attempts to read Child's records before consent is granted -> should fail (404/not allowed)
        mockMvc.perform(get("/api/family/" + groupId + "/members/" + childUserId + "/records")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isNotFound());

        // Child explicitly grants record consent
        String grantConsent = "{\"grantRecordAccess\": true}";
        mockMvc.perform(put("/api/family/" + groupId + "/consent")
            .with(httpBasic("child@example.com", "childPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(grantConsent))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recordAccessGranted", is(true)));

        // Parent can now view consented records
        mockMvc.perform(get("/api/family/" + groupId + "/members/" + childUserId + "/records")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(1)))
            .andExpect(jsonPath("$.data[0].title", is("Child Vaccination")));

        // Child revokes consent
        String revokeConsent = "{\"grantRecordAccess\": false}";
        mockMvc.perform(put("/api/family/" + groupId + "/consent")
            .with(httpBasic("child@example.com", "childPass123"))
            .contentType(MediaType.APPLICATION_JSON).content(revokeConsent))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recordAccessGranted", is(false)));

        // Parent reading Child's records again -> rejected immediately
        mockMvc.perform(get("/api/family/" + groupId + "/members/" + childUserId + "/records")
            .with(httpBasic("parent@example.com", "parentPass123")))
            .andExpect(status().isNotFound());
    }

    @Test void doctorSharingCreationAccessExpiryRevocationAndIsolationTests() throws Exception {
        // Register Patient 1
        String patient1 = "{\"fullName\":\"Patient One\",\"email\":\"patient1@example.com\",\"password\":\"passwordPat1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(patient1))
            .andExpect(status().isCreated());

        // Register Patient 2
        String patient2 = "{\"fullName\":\"Patient Two\",\"email\":\"patient2@example.com\",\"password\":\"passwordPat2\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(patient2))
            .andExpect(status().isCreated());

        // Patient 1 creates two medical records
        String p1Record1 = "{\"title\":\"P1 Blood Report\",\"recordType\":\"Lab result\",\"providerName\":\"City Lab\",\"recordDate\":\"2026-04-10\",\"notes\":\"Normal CBC\"}";
        MvcResult r1Res = mockMvc.perform(post("/api/records").with(httpBasic("patient1@example.com", "passwordPat1"))
            .contentType(MediaType.APPLICATION_JSON).content(p1Record1)).andExpect(status().isCreated()).andReturn();
        long p1Record1Id = objectMapper.readTree(r1Res.getResponse().getContentAsString()).get("data").get("id").asLong();

        String p1Record2 = "{\"title\":\"P1 X-Ray Chest\",\"recordType\":\"Imaging\",\"providerName\":\"Radiology Center\",\"recordDate\":\"2026-04-11\",\"notes\":\"Clear lungs\"}";
        MvcResult r2Res = mockMvc.perform(post("/api/records").with(httpBasic("patient1@example.com", "passwordPat1"))
            .contentType(MediaType.APPLICATION_JSON).content(p1Record2)).andExpect(status().isCreated()).andReturn();
        long p1Record2Id = objectMapper.readTree(r2Res.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Patient 2 creates a private medical record
        String p2Record = "{\"title\":\"P2 Sensitive Prescription\",\"recordType\":\"Prescription\",\"providerName\":\"Private Clinic\",\"recordDate\":\"2026-04-12\",\"notes\":\"Confidential\"}";
        MvcResult r3Res = mockMvc.perform(post("/api/records").with(httpBasic("patient2@example.com", "passwordPat2"))
            .contentType(MediaType.APPLICATION_JSON).content(p2Record)).andExpect(status().isCreated()).andReturn();
        long p2RecordId = objectMapper.readTree(r3Res.getResponse().getContentAsString()).get("data").get("id").asLong();

        // 1. Rejection of reports owned by another patient
        String crossPatientShareReq = "{\"recordIds\":[" + p1Record1Id + "," + p2RecordId + "],\"expiryMinutes\":60}";
        mockMvc.perform(post("/api/share/doctor/sessions")
            .with(httpBasic("patient1@example.com", "passwordPat1"))
            .contentType(MediaType.APPLICATION_JSON).content(crossPatientShareReq))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success", is(false)));

        // 2. Successful creation of a session with multiple selected reports (P1 selects ONLY p1Record1Id)
        String validShareReq = "{\"recordIds\":[" + p1Record1Id + "],\"expiryMinutes\":60}";
        MvcResult shareCreateRes = mockMvc.perform(post("/api/share/doctor/sessions")
            .with(httpBasic("patient1@example.com", "passwordPat1"))
            .contentType(MediaType.APPLICATION_JSON).content(validShareReq))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.sharingCode").isString())
            .andExpect(jsonPath("$.data.active", is(true)))
            .andReturn();

        JsonNode shareNode = objectMapper.readTree(shareCreateRes.getResponse().getContentAsString()).get("data");
        long sessionId = shareNode.get("id").asLong();
        String sharingCode = shareNode.get("sharingCode").asText();

        // 3. Doctor access to selected reports only (without patient authentication)
        String doctorAccessReq = "{\"code\":\"" + sharingCode + "\"}";
        mockMvc.perform(post("/api/share/doctor/access/validate")
            .header("X-Forwarded-For", "198.51.100.1")
            .contentType(MediaType.APPLICATION_JSON).content(doctorAccessReq))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.patientName", is("Patient One")))
            .andExpect(jsonPath("$.data.readOnly", is(true)))
            .andExpect(jsonPath("$.data.records.length()", is(1)))
            .andExpect(jsonPath("$.data.records[0].id", is((int) p1Record1Id)))
            .andExpect(jsonPath("$.data.records[0].title", is("P1 Blood Report")));

        // Doctor can view authorized single record detail
        mockMvc.perform(get("/api/share/doctor/access/records/" + p1Record1Id + "?code=" + sharingCode)
            .header("X-Forwarded-For", "198.51.100.1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.id", is((int) p1Record1Id)));

        // 4. Denial of access to unselected reports
        mockMvc.perform(get("/api/share/doctor/access/records/" + p1Record2Id + "?code=" + sharingCode)
            .header("X-Forwarded-For", "198.51.100.1"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success", is(false)));

        // Denial of access to another patient's report
        mockMvc.perform(get("/api/share/doctor/access/records/" + p2RecordId + "?code=" + sharingCode)
            .header("X-Forwarded-For", "198.51.100.1"))
            .andExpect(status().isForbidden());

        // 5. Invalid code
        mockMvc.perform(post("/api/share/doctor/access/validate")
            .header("X-Forwarded-For", "198.51.100.2")
            .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"INVALIDCODE99\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success", is(false)));

        // 6. Family invitation codes being rejected by doctor-sharing endpoints
        // Create a family group with Patient 1
        MvcResult famGroupRes = mockMvc.perform(post("/api/family").with(httpBasic("patient1@example.com", "passwordPat1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Test Family Group\"}"))
            .andExpect(status().isCreated()).andReturn();
        String famInviteCode = objectMapper.readTree(famGroupRes.getResponse().getContentAsString()).get("data").get("activeInvitationCode").asText();

        mockMvc.perform(post("/api/share/doctor/access/validate")
            .header("X-Forwarded-For", "198.51.100.3")
            .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"" + famInviteCode + "\"}"))
            .andExpect(status().isForbidden());

        // 7. Patient reviews active and expired sessions
        mockMvc.perform(get("/api/share/doctor/sessions").with(httpBasic("patient1@example.com", "passwordPat1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(1)))
            .andExpect(jsonPath("$.data[0].id", is((int) sessionId)));

        // 8. Patient revokes an active session immediately
        mockMvc.perform(delete("/api/share/doctor/sessions/" + sessionId).with(httpBasic("patient1@example.com", "passwordPat1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)));

        // Doctor attempting to access after revocation is immediately rejected (403)
        mockMvc.perform(post("/api/share/doctor/access/validate")
            .header("X-Forwarded-For", "198.51.100.4")
            .contentType(MediaType.APPLICATION_JSON).content(doctorAccessReq))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("revoked")));
    }

    @Test void emergencyCardAndTimelineOwnershipTests() throws Exception {
        // Register User Carlos
        String userCarlos = "{\"fullName\":\"Carlos Silva\",\"email\":\"carlos@example.com\",\"password\":\"passwordCarlos1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userCarlos))
            .andExpect(status().isCreated());

        // Register User Diana
        String userDiana = "{\"fullName\":\"Diana Prince\",\"email\":\"diana@example.com\",\"password\":\"passwordDiana1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userDiana))
            .andExpect(status().isCreated());

        // 1. Unauthenticated access to emergency card is rejected (401)
        mockMvc.perform(get("/api/emergency-card"))
            .andExpect(status().isUnauthorized());

        // 2. Carlos initially has no emergency card -> returns null data
        mockMvc.perform(get("/api/emergency-card").with(httpBasic("carlos@example.com", "passwordCarlos1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data").doesNotExist());

        // 3. Carlos creates an emergency health card
        String cardPayload = "{"
            + "\"bloodGroup\":\"O+\","
            + "\"allergies\":\"Penicillin, Peanuts\","
            + "\"currentMedications\":\"Lisinopril 10mg daily\","
            + "\"medicalConditions\":\"Mild Hypertension\","
            + "\"emergencyContactName\":\"Elena Silva\","
            + "\"emergencyContactRelationship\":\"Spouse\","
            + "\"emergencyContactPhone\":\"+1 555-0199\","
            + "\"additionalNotes\":\"Carries EpiPen in backpack.\""
            + "}";

        mockMvc.perform(put("/api/emergency-card")
            .with(httpBasic("carlos@example.com", "passwordCarlos1"))
            .contentType(MediaType.APPLICATION_JSON).content(cardPayload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.patientName", is("Carlos Silva")))
            .andExpect(jsonPath("$.data.bloodGroup", is("O+")))
            .andExpect(jsonPath("$.data.emergencyContactName", is("Elena Silva")));

        // 4. Carlos retrieves his created emergency card
        mockMvc.perform(get("/api/emergency-card").with(httpBasic("carlos@example.com", "passwordCarlos1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.bloodGroup", is("O+")))
            .andExpect(jsonPath("$.data.allergies", is("Penicillin, Peanuts")));

        // 5. Diana inspects her own emergency card -> separate, empty initially
        mockMvc.perform(get("/api/emergency-card").with(httpBasic("diana@example.com", "passwordDiana1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").doesNotExist());

        // 6. Diana creates her own distinct card
        String dianaCard = "{"
            + "\"bloodGroup\":\"A-\","
            + "\"allergies\":\"None known\","
            + "\"emergencyContactName\":\"Bruce Wayne\","
            + "\"emergencyContactPhone\":\"+1 555-0122\""
            + "}";

        mockMvc.perform(put("/api/emergency-card")
            .with(httpBasic("diana@example.com", "passwordDiana1"))
            .contentType(MediaType.APPLICATION_JSON).content(dianaCard))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.patientName", is("Diana Prince")))
            .andExpect(jsonPath("$.data.bloodGroup", is("A-")));

        // 7. Verify Carlos's card was unaffected by Diana's updates (strict isolation)
        mockMvc.perform(get("/api/emergency-card").with(httpBasic("carlos@example.com", "passwordCarlos1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.bloodGroup", is("O+")))
            .andExpect(jsonPath("$.data.patientName", is("Carlos Silva")));

        // 8. Carlos updates his card with partial fields / blank notes
        String updatedCarlosCard = "{"
            + "\"bloodGroup\":\"O+\","
            + "\"allergies\":\"Penicillin\","
            + "\"currentMedications\":\"Lisinopril 20mg\","
            + "\"emergencyContactName\":\"Elena Silva\","
            + "\"emergencyContactPhone\":\"+1 555-0199\""
            + "}";

        mockMvc.perform(put("/api/emergency-card")
            .with(httpBasic("carlos@example.com", "passwordCarlos1"))
            .contentType(MediaType.APPLICATION_JSON).content(updatedCarlosCard))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.currentMedications", is("Lisinopril 20mg")))
            .andExpect(jsonPath("$.data.allergies", is("Penicillin")));

        // 9. Validation: Blood group exceeds max length
        String invalidBloodGroup = "{\"bloodGroup\":\"VERYLONGBSTR\"}";
        mockMvc.perform(put("/api/emergency-card")
            .with(httpBasic("carlos@example.com", "passwordCarlos1"))
            .contentType(MediaType.APPLICATION_JSON).content(invalidBloodGroup))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success", is(false)));

        // 10. Timeline record ownership scoping: Carlos queries records for his timeline
        mockMvc.perform(get("/api/records").with(httpBasic("carlos@example.com", "passwordCarlos1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(0)));

        // Carlos adds 2 records with different dates
        String recordOlder = "{\"title\":\"Annual Physical 2025\",\"recordType\":\"Clinical note\",\"recordDate\":\"2025-05-10\",\"notes\":\"Baseline physical examination\"}";
        String recordNewer = "{\"title\":\"Lipid Panel 2026\",\"recordType\":\"Lab result\",\"recordDate\":\"2026-03-15\",\"notes\":\"Cholesterol normal\"}";

        mockMvc.perform(post("/api/records").with(httpBasic("carlos@example.com", "passwordCarlos1"))
            .contentType(MediaType.APPLICATION_JSON).content(recordOlder)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("carlos@example.com", "passwordCarlos1"))
            .contentType(MediaType.APPLICATION_JSON).content(recordNewer)).andExpect(status().isCreated());

        // Verify Carlos receives exactly his 2 records, chronologically ordered (newest first)
        mockMvc.perform(get("/api/records").with(httpBasic("carlos@example.com", "passwordCarlos1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(2)))
            .andExpect(jsonPath("$.data[0].title", is("Lipid Panel 2026")))
            .andExpect(jsonPath("$.data[1].title", is("Annual Physical 2025")));

        // Diana still sees 0 records
        mockMvc.perform(get("/api/records").with(httpBasic("diana@example.com", "passwordDiana1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", is(0)));
    }

    @Test void familyHealthInsightsConsentAndPatternAggregationTests() throws Exception {
        // 1. Register Member A (Owner) and Member B (Family Member)
        String userA = "{\"fullName\":\"Family Alpha\",\"email\":\"alpha@example.com\",\"password\":\"passwordAlpha1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userA))
            .andExpect(status().isCreated());

        String userB = "{\"fullName\":\"Family Beta\",\"email\":\"beta@example.com\",\"password\":\"passwordBeta1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userB))
            .andExpect(status().isCreated());

        String userC = "{\"fullName\":\"Family Gamma\",\"email\":\"gamma@example.com\",\"password\":\"passwordGamma1\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(userC))
            .andExpect(status().isCreated());

        // Alpha creates a Family Group
        MvcResult groupRes = mockMvc.perform(post("/api/family").with(httpBasic("alpha@example.com", "passwordAlpha1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Alpha Genetic Circle\"}"))
            .andExpect(status().isCreated()).andReturn();
        long groupId = objectMapper.readTree(groupRes.getResponse().getContentAsString()).get("data").get("id").asLong();
        String inviteCode = objectMapper.readTree(groupRes.getResponse().getContentAsString()).get("data").get("activeInvitationCode").asText();

        // 2. Unauthenticated access to insights is denied (401)
        mockMvc.perform(get("/api/family/" + groupId + "/insights"))
            .andExpect(status().isUnauthorized());

        // 3. Non-member (Gamma) access to insights is rejected (404)
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("gamma@example.com", "passwordGamma1")))
            .andExpect(status().isNotFound());

        // 4. Alpha initially has no other consenting members -> Insufficient data notice returned
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.consentingMembersCount", is(1)))
            .andExpect(jsonPath("$.data.observedPatterns.length()", is(0)))
            .andExpect(jsonPath("$.data.dataSufficiencyNotice", org.hamcrest.Matchers.containsString("Insufficient consented data")));

        // 5. Beta joins using invitation code -> Status is PENDING
        MvcResult joinRes = mockMvc.perform(post("/api/family/join").with(httpBasic("beta@example.com", "passwordBeta1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"invitationCode\":\"" + inviteCode + "\"}"))
            .andExpect(status().isOk()).andReturn();
        long betaMembershipId = objectMapper.readTree(joinRes.getResponse().getContentAsString()).get("data").get("membershipId").asLong();

        // Pending member does NOT contribute to insights or consenting count
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.consentingMembersCount", is(1)));

        // Alpha approves Beta
        mockMvc.perform(post("/api/family/" + groupId + "/members/" + betaMembershipId + "/accept")
            .with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk());

        // Beta is now ACTIVE, but has NOT granted record access consent
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalActiveMembers", is(2)))
            .andExpect(jsonPath("$.data.consentingMembersCount", is(1))) // Still 1 because Beta hasn't consented
            .andExpect(jsonPath("$.data.observedPatterns.length()", is(0)));

        // 6. Alpha and Beta add medical records
        // Alpha adds Hypertension & Diabetes
        mockMvc.perform(post("/api/records").with(httpBasic("alpha@example.com", "passwordAlpha1"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Routine Checkup\",\"recordType\":\"Clinical note\",\"recordDate\":\"2026-04-01\",\"notes\":\"Diagnosed with essential hypertension, advised low sodium.\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/records").with(httpBasic("alpha@example.com", "passwordAlpha1"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Endocrine Review\",\"recordType\":\"Lab result\",\"recordDate\":\"2026-04-05\",\"notes\":\"HbA1c test for type 2 diabetes management.\"}"))
            .andExpect(status().isCreated());

        // Beta adds Hypertension (matching Alpha) and Asthma (unique to Beta)
        mockMvc.perform(post("/api/records").with(httpBasic("beta@example.com", "passwordBeta1"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Cardiology Consultation\",\"recordType\":\"Clinical note\",\"recordDate\":\"2026-04-02\",\"notes\":\"Patient has elevated blood pressure / hypertension.\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/records").with(httpBasic("beta@example.com", "passwordBeta1"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Pulmonology Followup\",\"recordType\":\"Prescription\",\"recordDate\":\"2026-04-03\",\"notes\":\"Albuterol inhaler prescribed for mild asthma.\"}"))
            .andExpect(status().isCreated());

        // 7. Alpha and Beta explicitly grant record-sharing consent in the group
        mockMvc.perform(put("/api/family/" + groupId + "/consent").with(httpBasic("alpha@example.com", "passwordAlpha1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"grantRecordAccess\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recordAccessGranted", is(true)));

        mockMvc.perform(put("/api/family/" + groupId + "/consent").with(httpBasic("beta@example.com", "passwordBeta1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"grantRecordAccess\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recordAccessGranted", is(true)));

        // 8. Now Alpha views insights:
        // - Hypertension is shared by both Alpha & Beta (2 members) -> Pattern observed!
        // - Diabetes is only in Alpha (1 member) -> NOT in aggregated patterns
        // - Asthma is only in Beta (1 member) -> NOT in aggregated patterns
        MvcResult insightsRes = mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.consentingMembersCount", is(2)))
            .andExpect(jsonPath("$.data.observedPatterns.length()", is(1)))
            .andExpect(jsonPath("$.data.observedPatterns[0].condition", org.hamcrest.Matchers.containsString("Hypertension")))
            .andExpect(jsonPath("$.data.observedPatterns[0].affectedMembersCount", is(2)))
            .andExpect(jsonPath("$.data.clinicalDisclaimer", org.hamcrest.Matchers.containsString("Informational observations only")))
            .andReturn();

        // Beta also views the same consented group insights (since Alpha also consented!)
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("beta@example.com", "passwordBeta1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.consentingMembersCount", is(2)))
            .andExpect(jsonPath("$.data.observedPatterns.length()", is(1)))
            .andExpect(jsonPath("$.data.observedPatterns[0].affectedMembersCount", is(2)));

        // 9. Immediate consent revocation: Beta revokes record consent
        mockMvc.perform(put("/api/family/" + groupId + "/consent").with(httpBasic("beta@example.com", "passwordBeta1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"grantRecordAccess\": false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recordAccessGranted", is(false)));

        // 10. Alpha immediately loses Beta's data in insights -> back to insufficient notice
        mockMvc.perform(get("/api/family/" + groupId + "/insights").with(httpBasic("alpha@example.com", "passwordAlpha1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.consentingMembersCount", is(1)))
            .andExpect(jsonPath("$.data.observedPatterns.length()", is(0)))
            .andExpect(jsonPath("$.data.dataSufficiencyNotice", org.hamcrest.Matchers.containsString("Insufficient consented data")));
    }

    @Test void communityHealthIntelligenceConsentAndAggregationTests() throws Exception {
        // Register 4 distinct users: Comm1, Comm2, Comm3, and Comm4
        String user1 = "{\"fullName\":\"Comm Patient One\",\"email\":\"comm1@example.com\",\"password\":\"passwordComm1\"}";
        String user2 = "{\"fullName\":\"Comm Patient Two\",\"email\":\"comm2@example.com\",\"password\":\"passwordComm2\"}";
        String user3 = "{\"fullName\":\"Comm Patient Three\",\"email\":\"comm3@example.com\",\"password\":\"passwordComm3\"}";
        String user4 = "{\"fullName\":\"Comm Patient Four\",\"email\":\"comm4@example.com\",\"password\":\"passwordComm4\"}";

        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(user1)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(user2)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(user3)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(user4)).andExpect(status().isCreated());

        // 1. Unauthenticated access to consent settings is rejected (401)
        mockMvc.perform(get("/api/community/consent"))
            .andExpect(status().isUnauthorized());

        // 2. Default consent state: Comm1 has not opted in
        mockMvc.perform(get("/api/community/consent").with(httpBasic("comm1@example.com", "passwordComm1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.optedIn", is(false)));

        // 3. Add medical records
        // Comm1, Comm2, and Comm3 add "Vaccination" records
        // Comm4 adds "Vaccination" and "Imaging" records
        String vaxRecord = "{\"title\":\"Annual Influenza Vaccine\",\"recordType\":\"Vaccination\",\"recordDate\":\"2026-04-10\"}";
        String imgRecord = "{\"title\":\"Chest CT Scan\",\"recordType\":\"Imaging\",\"recordDate\":\"2026-04-11\"}";

        mockMvc.perform(post("/api/records").with(httpBasic("comm1@example.com", "passwordComm1")).contentType(MediaType.APPLICATION_JSON).content(vaxRecord)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("comm2@example.com", "passwordComm2")).contentType(MediaType.APPLICATION_JSON).content(vaxRecord)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("comm3@example.com", "passwordComm3")).contentType(MediaType.APPLICATION_JSON).content(vaxRecord)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("comm4@example.com", "passwordComm4")).contentType(MediaType.APPLICATION_JSON).content(vaxRecord)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/records").with(httpBasic("comm4@example.com", "passwordComm4")).contentType(MediaType.APPLICATION_JSON).content(imgRecord)).andExpect(status().isCreated());

        // 4. Initially, 0 users have opted in -> Community Intelligence returns 0 eligible records
        mockMvc.perform(get("/api/community/insights").with(httpBasic("comm1@example.com", "passwordComm1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.totalConsentingPatients", is(0)))
            .andExpect(jsonPath("$.data.eligibleRecordsAnalyzed", is(0)))
            .andExpect(jsonPath("$.data.categoryAggregates.length()", is(0)));

        // 5. Comm1 and Comm2 opt in (only 2 patients opted in)
        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm1@example.com", "passwordComm1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.optedIn", is(true)));

        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm2@example.com", "passwordComm2"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.optedIn", is(true)));

        // With only 2 contributing patients, MIN_GROUP_SIZE_THRESHOLD (3) suppresses the category
        mockMvc.perform(get("/api/community/insights").with(httpBasic("comm1@example.com", "passwordComm1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalConsentingPatients", is(2)))
            .andExpect(jsonPath("$.data.categoryAggregates.length()", is(1)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].categoryOrCondition", is("Vaccination")))
            .andExpect(jsonPath("$.data.categoryAggregates[0].suppressed", is(true)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].totalEvents", is(0))); // Suppressed data masks counts

        // 6. Comm3 and Comm4 also opt in -> Now 4 consenting patients
        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm3@example.com", "passwordComm3"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": true}"))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm4@example.com", "passwordComm4"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": true}"))
            .andExpect(status().isOk());

        // 7. Verify aggregated results:
        // - "Vaccination" has 4 unique patients (Comm1, Comm2, Comm3, Comm4) >= 3 -> NOT suppressed, count=4
        // - "Imaging" has only 1 patient (Comm4) < 3 -> SUPPRESSED
        mockMvc.perform(get("/api/community/insights").with(httpBasic("comm1@example.com", "passwordComm1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalConsentingPatients", is(4)))
            .andExpect(jsonPath("$.data.eligibleRecordsAnalyzed", is(5)))
            .andExpect(jsonPath("$.data.categoryAggregates.length()", is(2)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].categoryOrCondition", is("Vaccination")))
            .andExpect(jsonPath("$.data.categoryAggregates[0].suppressed", is(false)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].totalEvents", is(4)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].uniqueContributingPatients", is(4)))
            .andExpect(jsonPath("$.data.categoryAggregates[1].categoryOrCondition", is("Imaging")))
            .andExpect(jsonPath("$.data.categoryAggregates[1].suppressed", is(true)))
            .andExpect(jsonPath("$.data.categoryAggregates[1].totalEvents", is(0)));

        // 8. Immediate exclusion upon consent withdrawal: Comm1 and Comm2 withdraw consent
        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm1@example.com", "passwordComm1"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.optedIn", is(false)));

        mockMvc.perform(put("/api/community/consent").with(httpBasic("comm2@example.com", "passwordComm2"))
            .contentType(MediaType.APPLICATION_JSON).content("{\"optIn\": false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.optedIn", is(false)));

        // Now only 2 consenting patients remain (Comm3 and Comm4) -> Vaccination falls below 3 and becomes suppressed
        mockMvc.perform(get("/api/community/insights").with(httpBasic("comm3@example.com", "passwordComm3")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalConsentingPatients", is(2)))
            .andExpect(jsonPath("$.data.categoryAggregates[0].suppressed", is(true)));
    }

    @Test
    void aiHealthSummarizerOwnershipValidationAndMockedOllamaTests() throws Exception {
        OllamaProperties props = new OllamaProperties();
        props.setModel("llama3.2:3b");
        props.setBaseUrl("http://localhost:11434");
        when(ollamaClient.getProperties()).thenReturn(props);
        when(ollamaClient.isAvailable()).thenReturn(true);

        // 1. Status endpoint is accessible for authenticated users
        mockMvc.perform(get("/api/ai/status").with(httpBasic("alice@example.com", "passwordAlice1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.ollamaAvailable", is(true)))
            .andExpect(jsonPath("$.data.configuredModel", is("llama3.2:3b")));

        // 2. Unauthenticated access is rejected
        mockMvc.perform(get("/api/ai/status"))
            .andExpect(status().isUnauthorized());

        // 3. Register Patient AI-1 and create a medical record with notes
        String patientAi1 = "{\"fullName\":\"AI Patient 1\",\"email\":\"patient.ai1@example.com\",\"password\":\"passwordAi123\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(patientAi1))
            .andExpect(status().isCreated());

        String recordPayload = "{\"title\":\"Comprehensive Metabolic Panel\","
            + "\"recordType\":\"Lab result\","
            + "\"providerName\":\"General Diagnostics\","
            + "\"recordDate\":\"2026-05-10\","
            + "\"notes\":\"Patient fasting. Glucose 102 mg/dL (ref: 70-99, slightly elevated). Hemoglobin A1C: 5.8% (prediabetes range). Blood pressure 128/82 mmHg. Prescribed Metformin 500mg daily. Follow-up in 3 months.\"}";

        MvcResult recRes = mockMvc.perform(post("/api/records").with(httpBasic("patient.ai1@example.com", "passwordAi123"))
            .contentType(MediaType.APPLICATION_JSON).content(recordPayload))
            .andExpect(status().isCreated())
            .andReturn();
        Long ai1RecordId = objectMapper.readTree(recRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Register Patient AI-2 (Attacker attempting cross-patient summary)
        String patientAi2 = "{\"fullName\":\"AI Patient 2\",\"email\":\"patient.ai2@example.com\",\"password\":\"passwordAi234\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(patientAi2))
            .andExpect(status().isCreated());

        // 4. Verify rejection when AI-2 tries to access or summarize AI-1's record
        mockMvc.perform(get("/api/ai/records/" + ai1RecordId + "/summary").with(httpBasic("patient.ai2@example.com", "passwordAi234")))
            .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/ai/records/" + ai1RecordId + "/summary").with(httpBasic("patient.ai2@example.com", "passwordAi234")))
            .andExpect(status().isNotFound());

        // 5. Test empty clinical notes rejection
        String emptyNoteRecord = "{\"title\":\"Empty X-Ray\",\"recordType\":\"Imaging\",\"recordDate\":\"2026-05-12\",\"notes\":\"   \"}";
        MvcResult emptyRecRes = mockMvc.perform(post("/api/records").with(httpBasic("patient.ai1@example.com", "passwordAi123"))
            .contentType(MediaType.APPLICATION_JSON).content(emptyNoteRecord))
            .andExpect(status().isCreated())
            .andReturn();
        Long emptyRecordId = objectMapper.readTree(emptyRecRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        mockMvc.perform(post("/api/ai/records/" + emptyRecordId + "/summary").with(httpBasic("patient.ai1@example.com", "passwordAi123")))
            .andExpect(status().isConflict());

        // 6. Test Ollama timeout / service unavailable handling
        doThrow(new AiServiceUnavailableException("Unable to connect to local Ollama service at http://localhost:11434."))
            .when(ollamaClient).generateSummary(anyString(), anyString());

        mockMvc.perform(post("/api/ai/records/" + ai1RecordId + "/summary").with(httpBasic("patient.ai1@example.com", "passwordAi123")))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.success", is(false)))
            .andExpect(jsonPath("$.message", is("Unable to connect to local Ollama service at http://localhost:11434.")));

        // 7. Successful factual summary generation with mock Ollama response
        String mockOllamaResponse =
            "### Overview\n"
            + "This is a comprehensive metabolic lab report evaluating glucose, HbA1c, and vitals.\n\n"
            + "### Key Findings\n"
            + "Fasting blood sugar is slightly elevated with an A1C in the prediabetes category.\n\n"
            + "### Measurements and Results\n"
            + "- Glucose: 102 mg/dL (ref: 70-99)\n- Hemoglobin A1C: 5.8%\n- Blood pressure: 128/82 mmHg\n\n"
            + "### Medications\n"
            + "- Metformin 500mg daily\n\n"
            + "### Follow-up Instructions\n"
            + "Return for a follow-up consultation in 3 months.\n\n"
            + "### Questions for the Doctor\n"
            + "1. What lifestyle modifications are recommended alongside Metformin?\n2. Should a home glucose monitor be used?\n\n"
            + "### Missing Information\n"
            + "Lipid panel (cholesterol, triglycerides) and renal function tests are not specified in this record.";

        doReturn(mockOllamaResponse).when(ollamaClient).generateSummary(anyString(), anyString());

        MvcResult summaryResult = mockMvc.perform(post("/api/ai/records/" + ai1RecordId + "/summary")
            .with(httpBasic("patient.ai1@example.com", "passwordAi123")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.recordId", is(ai1RecordId.intValue())))
            .andExpect(jsonPath("$.data.modelName", is("llama3.2:3b")))
            .andExpect(jsonPath("$.data.cached", is(false)))
            .andReturn();

        JsonNode summaryNode = objectMapper.readTree(summaryResult.getResponse().getContentAsString()).get("data");
        org.junit.jupiter.api.Assertions.assertTrue(summaryNode.get("overview").asText().contains("metabolic lab report"));
        org.junit.jupiter.api.Assertions.assertTrue(summaryNode.get("measurements").asText().contains("102 mg/dL"));
        org.junit.jupiter.api.Assertions.assertTrue(summaryNode.get("medications").asText().contains("Metformin 500mg"));
        org.junit.jupiter.api.Assertions.assertTrue(summaryNode.get("followUpInstructions").asText().contains("3 months"));
        org.junit.jupiter.api.Assertions.assertTrue(summaryNode.get("disclaimer").asText().contains("informational purposes only"));

        // 8. Subsequent retrieval returns saved summary (cached: true)
        mockMvc.perform(get("/api/ai/records/" + ai1RecordId + "/summary")
            .with(httpBasic("patient.ai1@example.com", "passwordAi123")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.recordId", is(ai1RecordId.intValue())))
            .andExpect(jsonPath("$.data.cached", is(true)));
    }

    @Test void doctorRegistrationStartsPendingAndEnforcesRoleBoundaries() throws Exception {
        // 1. Doctor Registration
        String doctorReg = "{\n" +
            "  \"fullName\": \"Dr. Vikram Seth\",\n" +
            "  \"email\": \"dr.vikram.seth@metrohealth.org\",\n" +
            "  \"password\": \"Password123!\",\n" +
            "  \"confirmPassword\": \"Password123!\",\n" +
            "  \"medicalRegistrationNumber\": \"MCI-2019-91823\",\n" +
            "  \"licensingAuthority\": \"Delhi Medical Council\",\n" +
            "  \"professionalQualification\": \"MBBS, MD (General Medicine)\",\n" +
            "  \"specialization\": \"Internal Medicine & Cardiology\",\n" +
            "  \"clinicOrHospitalName\": \"Metro Health Multi-Specialty Hospital\",\n" +
            "  \"contactNumber\": \"+91-98765-43210\",\n" +
            "  \"termsAccepted\": true\n" +
            "}";

        mockMvc.perform(post("/api/doctor/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(doctorReg))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.email", is("dr.vikram.seth@metrohealth.org")))
            .andExpect(jsonPath("$.data.verificationStatus", is("PENDING_VERIFICATION")));

        // 2. Doctor logs in / fetches profile -> status is PENDING_VERIFICATION
        mockMvc.perform(get("/api/doctor/profile")
            .with(httpBasic("dr.vikram.seth@metrohealth.org", "Password123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.verificationStatus", is("PENDING_VERIFICATION")))
            .andExpect(jsonPath("$.data.medicalRegistrationNumber", is("MCI-2019-91823")));

        // 3. Pending doctor cannot access clinical dashboard features -> Forbidden (403)
        mockMvc.perform(get("/api/doctor/dashboard")
            .with(httpBasic("dr.vikram.seth@metrohealth.org", "Password123!")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("requires an approved medical license verification")));

        // 4. Regular patient cannot access doctor endpoints -> Forbidden (403)
        String patientReg = "{\"fullName\":\"Ordinary Patient\",\"email\":\"ordinary.patient@example.com\",\"password\":\"PatientPass123!\"}";
        mockMvc.perform(post("/api/users/register").contentType(MediaType.APPLICATION_JSON).content(patientReg))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/doctor/profile")
            .with(httpBasic("ordinary.patient@example.com", "PatientPass123!")))
            .andExpect(status().isForbidden());

        // 5. Duplicate medical registration number is rejected (Conflict 409)
        String duplicateDoctor = "{\n" +
            "  \"fullName\": \"Dr. Duplicate\",\n" +
            "  \"email\": \"dr.duplicate@metrohealth.org\",\n" +
            "  \"password\": \"Password123!\",\n" +
            "  \"confirmPassword\": \"Password123!\",\n" +
            "  \"medicalRegistrationNumber\": \"MCI-2019-91823\",\n" +
            "  \"licensingAuthority\": \"Delhi Medical Council\",\n" +
            "  \"professionalQualification\": \"MBBS\",\n" +
            "  \"specialization\": \"General Medicine\",\n" +
            "  \"termsAccepted\": true\n" +
            "}";

        mockMvc.perform(post("/api/doctor/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(duplicateDoctor))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("is already registered with medical registration number")));
    }
}


