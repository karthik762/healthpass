# Centralized Health Passport

A foundation for a patient-controlled digital health space. It combines a polished React dashboard with a Spring Boot API that supports account registration and patient-owned medical record metadata. The project deliberately keeps advanced clinical modules as clearly marked previews until their consent, privacy, and authorization requirements are ready.

> **Prototype safety note:** This project is not for emergencies and does not yet handle medical document uploads, production identity verification, account recovery, or clinical decision-making.

## Technology stack

- **Frontend:** React 18, Vite, React Router, Axios, plain CSS
- **Backend:** Java 17+, Spring Boot 3, Maven, Spring Web, Spring Data JPA, Spring Validation, Spring Security
- **Database:** MySQL 8+ (H2 is used only by the automated test suite)

## Project structure

```text
healthbro/
├── frontend/                         # React dashboard
│   └── src/
│       ├── components/                # Reusable interface elements and states
│       ├── layouts/                   # Authenticated and public shells
│       ├── pages/                     # Product module pages
│       ├── services/                  # HTTP client setup
│       └── styles/                    # Responsive global stylesheet
├── backend/                           # Spring Boot REST API
│   └── src/main/java/com/healthpassport/
│       ├── config/ controllers/ dto/ entities/
│       ├── exception/ repositories/ services/
├── .env.example                       # Root configuration reference
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Java 17+ and Maven 3.9+
- MySQL 8+

## MySQL setup

Create a database account with only the permissions needed for this development database:

```sql
CREATE DATABASE centralized_health_passport;
CREATE USER 'health_passport_user'@'localhost' IDENTIFIED BY 'use-a-unique-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON centralized_health_passport.* TO 'health_passport_user'@'localhost';
FLUSH PRIVILEGES;
```

Do not commit the password. Export the configuration before starting the backend. In PowerShell:

```powershell
$env:DB_URL='jdbc:mysql://localhost:3306/centralized_health_passport?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
$env:DB_USERNAME='health_passport_user'
$env:DB_PASSWORD='use-a-unique-local-password'
$env:FRONTEND_ORIGIN='http://localhost:5173'
```

`backend/.env.example` and the root `.env.example` document the same variables. Spring Boot does not load `.env` files itself; use your shell, IDE run configuration, or a deployment secret manager.

## Run locally

In one terminal:

```powershell
cd frontend
npm install
npm run dev
```

In another terminal, after exporting the MySQL values:

```powershell
cd backend
mvn spring-boot:run
```

Open `http://localhost:5173`. The interface is available as a demo preview even before a backend account exists. Registration calls the real API when the backend is running.

## API endpoints

All non-public endpoints require HTTP Basic authentication with the registered email and password. This is a foundation mechanism, not a final production authentication design.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health-check response |
| POST | `/api/users/register` | Public | Register a user; password is BCrypt-hashed |
| GET | `/api/users/me` | Authenticated | Current account profile |
| GET | `/api/records` | Authenticated | List only the caller’s records |
| POST | `/api/records` | Authenticated | Create record metadata |
| GET | `/api/records/{id}` | Authenticated owner | Read a single record |
| PUT | `/api/records/{id}` | Authenticated owner | Update metadata |
| DELETE | `/api/records/{id}` | Authenticated owner | Delete metadata |
| POST | `/api/family` | Authenticated | Create a family group and generate single-use invitation code |
| GET | `/api/family` | Authenticated member | List caller's family groups and membership details |
| GET | `/api/family/{id}` | Authenticated member | Retrieve family group overview and members |
| POST | `/api/family/join` | Authenticated | Request membership using an invitation code |
| POST | `/api/family/{id}/invitations/regenerate` | Authenticated owner | Revoke current code and generate a new high-entropy invitation code |
| POST | `/api/family/{id}/invitations/revoke` | Authenticated owner | Revoke active invitation code immediately |
| POST | `/api/family/{id}/members/{memId}/accept` | Authenticated owner | Approve a pending family membership request |
| POST | `/api/family/{id}/members/{memId}/reject` | Authenticated owner | Reject a pending membership request |
| DELETE | `/api/family/{id}/members/{memId}` | Owner / Self | Remove a member or leave the family group |
| PUT | `/api/family/{id}/consent` | Authenticated member | Grant or revoke consent to share own records with family circle |
| PUT | `/api/family/{id}/request-access` | Authenticated member | Request record view permission from family group |
| GET | `/api/family/{id}/members/{userId}/records` | Consented circle member | View a family member's records strictly if they have explicitly granted consent |
| POST | `/api/share/doctor/sessions` | Authenticated patient | Create a doctor sharing session with selected records and expiry duration |
| GET | `/api/share/doctor/sessions` | Authenticated patient | List caller's active and historical doctor sharing sessions |
| DELETE | `/api/share/doctor/sessions/{id}` | Authenticated patient | Revoke an active sharing session immediately |
| POST | `/api/share/doctor/access/validate` | Public (Rate-limited) | Doctor verifies sharing code and receives authorized read-only records |
| GET | `/api/share/doctor/access/records/{recordId}?code={code}` | Public (Rate-limited) | Doctor retrieves a single authorized report detail |
| GET | `/api/emergency-card` | Authenticated patient | Retrieve the current patient's private emergency health card |
| PUT | `/api/emergency-card` | Authenticated patient | Create or update the current patient's private emergency health card |
| GET | `/api/family/{groupId}/insights` | Authenticated member | Retrieve aggregated health pattern observations across consenting family members |
| GET | `/api/community/insights` | Authenticated | Retrieve privacy-preserving community-level health trends and category aggregates |
| GET | `/api/community/consent` | Authenticated | Get current authenticated user's community analysis opt-in consent status |
| PUT | `/api/community/consent` | Authenticated | Opt in or withdraw consent for community health intelligence aggregation |
| GET | `/api/ai/status` | Authenticated | Check local Ollama connection status, base URL, and configured model |
| GET | `/api/ai/records/{id}/summary` | Authenticated owner | Retrieve existing saved AI summary for owned medical record |
| POST | `/api/ai/records/{id}/summary` | Authenticated owner | Generate or refresh factual, plain-language AI summary using local Ollama |

Responses follow `{ success, message, data, timestamp }`. Example registration body:

```json
{
  "fullName": "Aarav Kumar",
  "email": "aarav@example.com",
  "password": "use-at-least-8-characters"
}
```

## What is implemented

- Responsive healthcare-themed login, registration, dashboard, records, family, sharing, insights, timeline, emergency-card, community, and settings routes.
- Patient authentication context and session synchronization with in-memory Basic Auth headers.
- User registration with validation, normalized unique email addresses, and BCrypt password hashes.
- Patient-owned record metadata CRUD with strict owner authorization boundaries.
- **Family Health Network**:
  - Secure creation of family circles.
  - High-entropy cryptographic invitation codes (stored as SHA-256 hashes, with 7-day expiration and owner revocation).
  - Join request and owner approval workflow (preventing duplicate memberships and unauthorized joins).
  - Explicit record consent boundaries: family membership *never* grants medical record access by default. Members must explicitly grant access, and revoking consent immediately cuts off record visibility.
  - Consented member record retrieval scoped strictly to active members of the same family circle.
- **Phase 3: Secure Doctor Sharing**:
  - Patient-controlled record authorization: patients select exactly which medical reports to share from their actual records.
  - Configurable expiration periods (15 minutes to 7 days).
  - High-entropy, 12-character alphanumeric sharing codes generated using `java.security.SecureRandom`.
  - Cryptographic one-way hashing: only the SHA-256 hash of the sharing code is persisted in MySQL/H2; plaintext codes are never logged or stored.
  - Strict ownership validation: server verifies that all selected record IDs belong exclusively to the authenticated patient.
  - Strict authorization boundary: unselected reports and reports owned by other patients are denied access even if requested directly.
  - Separate Doctor Portal (`/doctor-access`): independent public route allowing clinicians to enter a code without accessing patient dashboard or requiring patient credentials.
  - Read-only enforcement: sharing sessions do not permit editing, creating, or deleting records. Report text download is supported for authorized files.
  - Immediate revocation: when a patient revokes a session, subsequent doctor access requests are rejected instantly.
  - Rate limiting & isolation: doctor code verification attempts are rate-limited per IP, and family invitation codes cannot authorize doctor access.
- **Phase 4: Health Timeline & Emergency Health Card**:
  - **Health Timeline (`/timeline`)**:
    - Direct chronological display (newest first) using authenticated patient's genuine medical records.
    - Category filtering (Lab result, Clinical note, Vaccination, Imaging, Prescription, etc.) dynamically derived from records.
    - Date range filtering (From Date and To Date) with instant count and filter reset.
    - Record detail modal displaying title, category, provider, date, and complete clinical notes.
    - Genuine loading, empty (first-time vs filtered), and error states without mock/fictional records.
  - **Emergency Health Card (`/emergency-card`)**:
    - Dedicated database entity `emergency_health_cards` with a unique `@OneToOne` constraint per user.
    - Patient identity derived exclusively from the authenticated security principal (`authentication.getName()`); never accepts caller IDs from request bodies.
    - Captures blood group, known allergies, current medications, existing conditions, primary emergency contact (name, relationship, phone), and first responder notes.
    - Allows fields to remain blank or be marked unknown.
    - Input sanitization and length validation.
    - Clear patient-provided disclaimer noting that emergency data is self-reported and not a substitute for 911 / emergency dispatch.
    - Strict data privacy: private to the authenticated patient; not exposed via public URLs and never automatically shared with family circles or doctor access sessions.
- **Phase 5: Family Health Insights (`/insights`)**:
  - **Consent-Enforced Aggregation**: Analyzes only the authenticated patient's own records and approved, active family circle members who have explicitly enabled record sharing consent (`recordAccessGranted == true`).
  - **Strict Revocation**: When a family member revokes record consent, their data is instantly excluded from group insight calculations.
  - **Privacy Safeguards**: Rather than exposing another member's medical reports, insights return aggregated condition patterns (condition name, number of consenting members with matching recorded conditions, and associated record categories).
  - **Honest Data Sufficiency**: If fewer than 2 active members have consented, an honest notice explains that reliable cross-member pattern recognition requires at least two consenting members.
  - **Clinical Humility & Limitations**: Prominent notices clarify that family circle membership does not establish biological relation (groups may include in-laws, adoptive family, or guardians), and observations do not diagnose or predict genetic risk. Prompts patients to discuss recorded history with a licensed genetic counselor or physician.
- **Phase 7: Ollama AI Health Summarizer (`/ai-summary`)**:
  - **Local-Only AI Privacy Boundary**: All summarization is performed strictly on-premise using a local Ollama instance (e.g. `llama3.2:3b`). No patient records, prompts, or clinical notes are ever transmitted to third-party cloud APIs.
  - **Factual, Sectioned Clinical Breakdown**: Extracts source details into 7 clearly separated categories:
    1. *Plain-Language Overview*
    2. *Key Findings Mentioned in Document*
    3. *Measurements, Lab Values & Reference Ranges* (preserves values, units, and ranges exactly as provided)
    4. *Medications* (only medicines mentioned in the source)
    5. *Follow-up Instructions*
    6. *Suggested Questions for the Doctor* (neutral, helpful follow-up queries based on the record)
    7. *Missing Information / Not Specified* (explicitly indicates when sections are absent from source)
  - **Strict Ownership & Authorization**: Enforces that only the authenticated owner can access or request a summary for their own records. Cross-patient tampering (e.g. requesting another patient's record ID) returns a strict 404 / access denied.
  - **Safe Error & Availability Handling**: Gracefully handles Ollama service timeouts, offline status, missing local models (404), empty notes, and oversized input (>4000 characters) with friendly status codes and zero stack trace leakage.
  - **Summary Persistence (`ai_health_summaries`)**: Summaries are securely stored and associated with the owning user and source record (`@UniqueConstraint` on `record_id`), preventing redundant AI recalculations while allowing users to force a refresh on demand.
  - **Clinical Humility & AI Disclaimers**: Prominently highlights that AI summaries are for informational reference only, may contain errors, and do not replace professional clinical diagnosis or physician consultations.
- Health check, validation handling, and consistent JSON API envelopes.

## Local Ollama Setup (Phase 7)

The AI Health Summarizer uses a local instance of [Ollama](https://ollama.com).

### 1. Install Ollama
- **Windows / macOS:** Download and install from [ollama.com/download](https://ollama.com/download).
- **Linux:**
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

### 2. Start the Ollama Service
Ensure Ollama is running on your machine:
```bash
ollama serve
```
By default, Ollama listens on `http://localhost:11434`.

### 3. Pull the Model
Download the recommended 3-billion-parameter model:
```bash
ollama pull llama3.2:3b
```
*(The system does not automatically pull models at application startup to respect bandwidth and disk space).*

### 4. Configuration Properties
The backend connects to Ollama via configurable properties in `backend/src/main/resources/application.yml`:
```yaml
app:
  ollama:
    base-url: ${OLLAMA_BASE_URL:http://localhost:11434}
    model: ${OLLAMA_MODEL:llama3.2:3b}
    connect-timeout-ms: ${OLLAMA_CONNECT_TIMEOUT_MS:3000}
    read-timeout-ms: ${OLLAMA_READ_TIMEOUT_MS:45000}
```

### 5. Troubleshooting Ollama
- **Status shows "Unreachable / Offline":** Check that `ollama serve` is running and port `11434` is listening.
- **Error "Model not installed":** Run `ollama list` in your shell to verify `llama3.2:3b` is present. Run `ollama pull llama3.2:3b` if missing.
- **Timeout during generation:** If running on a CPU without hardware acceleration, first-time model loading into RAM can take up to 20-30 seconds. Click "Retry Summary".

## Manual Testing Walkthrough

### Phase 7: AI Health Summarizer
1. **Check AI Service Status**:
   - Sign in as an authenticated user.
   - Navigate to **Care tools &rarr; AI Health Summarizer** (`/ai-summary`).
   - Inspect the **Local Ollama Status** card. If Ollama is running, the status badge indicates "● Connected (Online)". If offline, helpful instructions for running `ollama serve` and `ollama pull llama3.2:3b` are shown.
2. **Select Record & Generate Summary**:
   - Select a medical record with clinical notes (e.g. from the dropdown or click "AI Summary" directly on any record card under `/records`).
   - Click **Generate AI Summary**.
   - If Ollama is online, view the generated 7-section breakdown with factual preservation of measurements, medications, follow-up instructions, and doctor questions.
   - Notice the "Saved Summary" badge on subsequent visits.
3. **Test Force Refresh**:
   - Click **Force Refresh** / **Re-run Ollama** to re-prompt Ollama and update the persisted summary timestamp.
4. **Test Graceful Handling of Empty Notes**:
   - Under `/records`, create a record with no notes (or whitespace only).
   - Attempt to summarize it on `/ai-summary`. Observe the validation message requiring clinical notes before summarization can occur.
5. **Cross-Patient Security Verification**:
   - Attempting to query `/api/ai/records/{otherUserRecordId}/summary` with another user's credentials immediately returns `404 Not Found`, verifying strict ownership isolation.

### Phase 6: Community Health Intelligence
1. **Initial Non-Consenting State**:
   - Register or sign in as User 1.
   - Navigate to **Community Health** (`/community`).
   - Notice the status indicates your consent is currently inactive (Not Opted In).
   - The aggregate overview displays honest notices if insufficient community contributions exist.
2. **Opt In to Community Insights**:
   - In the **Privacy & Consent Settings** card on `/community`, click **Opt In to Community Analytics**.
   - Confirm the success alert and observe the consent badge change to "Active Participant" with current timestamp.
3. **Add Medical Records Across Multiple Consenting Accounts**:
   - Ensure at least 3 distinct users (e.g. `user1@example.com`, `user2@example.com`, `user3@example.com`) have opted in.
   - Under `/records`, have each of the 3 users add a record in category "Prescription" and "Lab result".
4. **Observe Cohort Aggregation and Suppression**:
   - Refresh the `/community` page.
   - Observe that "Prescription" and "Lab result" show unsuppressed totals with $\ge 3$ contributing patients.
   - For any category with fewer than 3 contributing patients (e.g., 1 user with "Imaging"), observe the badge **[Suppressed: <3 unique patients]** with the event count masked to prevent individual re-identification.
5. **Withdraw Consent**:
   - In the privacy settings panel, click **Withdraw Consent**.
   - Refresh the page: the contributing patient count immediately decreases, and previously unsuppressed categories with $< 3$ remaining contributing users immediately fall into suppression.

### Phase 5: Family Health Insights
1. **Set Up a Family Group**:
   - Register or sign in as User A (e.g. `alpha@example.com`).
   - Create a Family Circle named "Alpha Family". Note the invitation code.
2. **Add Second Member with Pending Approval**:
   - In an incognito window or separate browser, register User B (`beta@example.com`).
   - Navigate to `/family` and join using User A's invitation code.
   - User B's membership is now `PENDING`.
3. **Inspect Insights as User A Before Approval**:
   - Return to User A and navigate to **Family Health Insights** (`/insights`).
   - Notice the status indicates insufficient consented data (only 1 consenting member).
4. **Approve Member and Grant Mutual Consent**:
   - As User A on `/family`, approve User B's membership request and turn on User A's record sharing consent.
   - As User B on `/family`, turn on User B's record sharing consent.
5. **Add Medical Records with Overlapping Conditions**:
   - As User A on `/records`, create a record with title "Cardiology Review" and note "Diagnosed with essential hypertension".
   - As User B on `/records`, create a record with title "Annual Physical" and note "Elevated blood pressure / hypertension detected".
6. **Review Discovered Condition Patterns**:
   - On `/insights`, select "Alpha Family".
   - Verify that "Hypertension & High Blood Pressure" appears as a detected pattern across 2 of 2 consenting members.
   - Confirm that the clinical disclaimer and biological non-assumption notices are displayed.
7. **Test Consent Revocation**:
   - As User B on `/family`, toggle off record sharing consent.
   - Return to User A on `/insights` and click **Refresh**.
   - Verify that User B's records are immediately excluded, and the view updates to indicate insufficient consented data.

## Planned placeholders

- Secure medical file storage and cloud bucket ingestion
- Production authentication (for example, OAuth/OIDC or JWT token solution), role model, and account recovery

## Tests and build checks

```powershell
cd frontend; npm run build
cd ../backend; mvn test
```

The backend test suite executes 10 comprehensive integration tests covering public endpoints, registration, record ownership scoping, family circles consent boundaries, Phase 3 doctor sharing, Phase 4 Emergency Health Card + Timeline, Phase 5 Family Health Insights, Phase 6 Community Health Intelligence, and Phase 7 Local Ollama AI Health Summarization (ownership validation, empty note rejection, timeout/unavailable service handling, factual section extraction, and persisted summary retrieval with mocked Ollama HTTP responses).

## Known limitations and recommended next phase

1. **Authentication:** HTTP Basic is appropriate only as a foundation for this academic prototype; use HTTPS and replace it with a reviewed production authentication design before any real-world protected health information is processed.
2. **Aggregation Privacy:** The community aggregation model implements minimum group-size thresholding ($k \ge 3$) and coarse temporal binning. While this prevents simple small-cell disclosure and differencing attacks, it is not $\epsilon$-differential privacy. Highly correlated background attributes could theoretically pose auxiliary reconstruction risks in sparse datasets. Future phases may evaluate adding calibrated Laplace/Gaussian noise or differential privacy mechanisms.
3. **Local AI Inference Hardware:** Generating summaries with LLMs locally depends on the host machine's CPU/GPU capabilities. If running on hardware without GPU acceleration, inference may take 15–30 seconds.



