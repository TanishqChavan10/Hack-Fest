# Talent Matching Platform - Comprehensive Feature Analysis

> **Platform Overview**: A full-stack Next.js + TypeScript talent matching platform using PostgreSQL (Supabase) with pgvector for semantic search, integrated with GitHub API and Gemini AI.

---

## 🔐 Authentication & Authorization

### 1. **Supabase Auth Integration**
**Purpose**: User registration, login, and session management with role-based access control.

**Implementation**:
- Database: `prisma/schema.prisma` - `User` model with `Role` enum (CANDIDATE, RECRUITER, ADMIN)
- Auth Service: [lib/auth.ts](lib/auth.ts) - Session helpers (`getSession()`, `getSessionWithDbUser()`)
- Supabase Client: [lib/supabase/server.ts](lib/supabase/server.ts), [lib/supabase/client.ts](lib/supabase/client.ts)

**Key Components/Routes**:
- **Login Page**: [app/login/page.tsx](app/login/page.tsx)
- **Registration Page**: [app/register/page.tsx](app/register/page.tsx) - Separate flows for candidates & recruiters
- **API Registration**: `POST /api/auth/register` - Creates Prisma User + associated profile (CandidateProfile or RecruiterProfile)
- **NextAuth Route**: [app/api/auth/[...nextauth]/route.ts](app/api/auth/%5B...nextauth%5D/route.ts) - OAuth & session management
- **Auth Callback**: `POST /api/auth/callback` - Post-login redirect handling
- **Onboarding Route**: `POST /api/auth/onboard` - Additional profile setup after signup
- **Auth Provider**: [components/shared/AuthProvider.tsx](components/shared/AuthProvider.tsx) - React context for auth state

**Database Models Involved**:
```
User (id, email, role, name, image)
├── CandidateProfile (1:1 relation)
└── RecruiterProfile (1:1 relation)
```

---

## 💼 Job Management

### 2. **Job Creation & Publishing** (Recruiter Feature)
**Purpose**: Recruiters post job opportunities with skill requirements and weightings.

**Implementation**:
- Database Models: `Job`, `JobRequirement` 
- Frontend Form: [app/recruiter/jobs/new/page.tsx](app/recruiter/jobs/new/page.tsx) - React Hook Form with Zod validation
- API Endpoint: `POST /api/jobs` - Create job with requirements

**Key Attributes**:
- Title, description, location, remote option
- Salary range (min/max), currency
- Experience level (ENTRY, MID, SENIOR, LEAD, EXECUTIVE)
- Job status (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
- Category weights: `{ technicalSkills: 0.6, softSkills: 0.2, experience: 0.2 }`
- Requirements with: skill name, min proficiency level (1-10), weight (0.0-1.0), mandatory flag

**Key Components/Routes**:
- Job Creation Form: [app/recruiter/jobs/new/page.tsx](app/recruiter/jobs/new/page.tsx)
- Get Job: `GET /api/jobs/[id]` - Fetch single job (public if published, restricted if draft)
- Update Job: `PATCH /api/jobs/[id]` - Recruiter-only, modifies job details & requirements
- Delete Job: `DELETE /api/jobs/[id]` - Recruiter archives/deletes job
- List Jobs: `GET /api/jobs` - Paginated list of published jobs for candidates

### 3. **Job Listing for Candidates**
**Purpose**: Browse available job openings with filtering.

**Implementation**:
- API: `GET /api/jobs` with query params:
  - `search` - Full-text search in title/description (ILIKE)
  - `level` - Filter by experience level
  - `page` / `pageSize` - Pagination (default: 10 per page)

**Frontend**:
- [app/candidate/jobs/page.tsx](app/candidate/jobs/page.tsx) - Main job listing page
- [app/candidate/jobs/[id]/page.tsx](app/candidate/jobs/%5Bid%5D/page.tsx) - Single job detail view

---

## 👤 Candidate Management & Profile

### 4. **Candidate Profile Management**
**Purpose**: Candidates build comprehensive professional profiles for matching.

**Implementation**:
- Database Model: `CandidateProfile` (1:1 with User)
- API: `GET/PATCH /api/profile` - Fetch & update candidate profile

**Profile Fields**:
- Personal: headline, bio, location, phone, LinkedIn URL, portfolio URL, resume URL
- Professional: experience level, years of experience, open to work flag
- Skills:
  - `hardSkills: Record<string, number>` (1-10 proficiency levels)
  - `softSkills: Record<string, number>` (same scale)
- GitHub Integration: `githubUsername`, `githubStats`, `lastGithubSync`

**Key Components/Routes**:
- Profile Update Form: [app/candidate/profile/page.tsx](app/candidate/profile/page.tsx)
- Profile API: `GET/PATCH /api/profile`
- Profile UI Components:
  - Skill input/editing with proficiency sliders
  - GitHub sync button

### 5. **GitHub Profile Sync**
**Purpose**: Auto-populate hard skills from GitHub repository analysis.

**Implementation**:
- Service: [lib/github.ts](lib/github.ts) using Octokit API
- API: `POST /api/profile/github-sync` - Triggers sync and updates skills
- Process:
  1. Fetch top repositories for GitHub username
  2. Analyze language byte counts (normalized to 1-10 scale logarithmically)
  3. Merge with existing skills (GitHub enriches, doesn't overwrite)
  4. Store derived skills: `{ typescript: 8, python: 5, docker: 3 }`
  5. Cache GitHub stats: repo count, followers, stars, top languages

**Key Components/Routes**:
- GitHub Sync Button: [app/candidate/profile/page.tsx](app/candidate/profile/page.tsx)
- GitHub Sync Endpoint: `POST /api/profile/github-sync`
- GitHub Webhook (Phase 2): `POST /api/webhooks/github` - Listens for push events

---

## 🎯 Matching Algorithm

### 6. **Multi-Dimensional Scoring System**
**Purpose**: Rank candidates against jobs using weighted, normalized skill scoring.

**Implementation**:
- Core Logic: [lib/matching.ts](lib/matching.ts) - `calculateMatchScore()` function

**Scoring Formula**:
```
Score = Σ(clamp(candidateLevel / minLevel, 0, 1.2) × weight) / Σ(weight) × 100
```
- **Components**:
  1. **Technical Skills Score** (typically 0.6 weight)
     - Compare candidate hard skills vs job requirements
     - Clamp ratio at 1.2 to allow 20% bonus for exceeding requirements
  
  2. **Soft Skills Score** (typically 0.2 weight)
     - Similar dimensional scoring for soft skills
  
  3. **Experience Score** (typically 0.2 weight)
     - Compare candidate years of experience vs job requirement
     - Clamp at 1.2 for experience bonus
  
  4. **Overall Score**
     - Combine all dimensions using category weights
     - Cap final score at 100

**Mandatory Skills Check**:
- If candidate has 0 proficiency in any mandatory skill → `isMandatoryPass = false`
- Candidates can still appear in rankings but marked as not meeting hard requirements

**Breakdown Structure**:
```typescript
MatchBreakdown {
  technical: number,      // 0-100
  softSkills: number,     // 0-100
  experience: number,     // 0-100
  overall: number         // 0-100
}
```

**Key Components/Routes**:
- Calculate Match Score: `calculateMatchScore()` in [lib/matching.ts](lib/matching.ts)
- Rank Candidates: `rankCandidates()` in [lib/matching.ts](lib/matching.ts)
- Match Results API: `GET /api/match?jobId=xxx` - Returns ranked candidates
- Match Database Model: Stores `score`, `breakdown` (JSON), `isMandatoryPass`

### 7. **Candidate Ranking for Jobs**
**Purpose**: Return ranked list of candidates most suitable for a specific job.

**Implementation**:
- API: `GET /api/match?jobId=xxx` (Recruiter-only)
- Process:
  1. Verify recruiter owns the job
  2. Fetch job with all requirements
  3. Fetch all candidates with `isOpenToWork = true`
  4. Calculate match score for each candidate
  5. Sort by score (descending), then by experience
  6. Return detailed match data including candidate profiles

**Return Data**:
```typescript
{
  candidateId, 
  score,           // 0-100
  breakdown,       // { technical, softSkills, experience, overall }
  isMandatoryPass, // true if no mandatory skills missing
  isShortlisted,   // checked by recruiter
  candidate: {
    id, headline, location, yearsOfExp,
    hardSkills, githubUsername,
    user: { name, email, image }
  }
}
```

**Key Components/Routes**:
- Match Results Page: [app/recruiter/jobs/[id]/matches/page.tsx](app/recruiter/jobs/%5Bid%5D/matches/page.tsx)
- Match API: `GET /api/match?jobId=xxx`
- Match Card Component: [components/matching/MatchCard.tsx](components/matching/MatchCard.tsx)
- useMatches Hook: [hooks/useMatches.ts](hooks/useMatches.ts) - React hook for fetching & managing matches

### 8. **Shortlisting Candidates**
**Purpose**: Recruiters mark candidates as shortlisted for next-round interviews.

**Implementation**:
- API: `PATCH /api/match/shortlist` - Toggle shortlist status
- Database: `Match.isShortlisted` boolean field
- Storage: Query param in shortlist API to bulk-update statuses

**Key Components/Routes**:
- Shortlist Toggle: `PATCH /api/match/shortlist`
- Request body: `{ jobId, candidateId, isShortlisted }`
- Used in: [components/matching/MatchCard.tsx](components/matching/MatchCard.tsx) - Shortlist button

---

## 🔍 Search & Filtering

### 9. **Hybrid Candidate Search** (Recruiter Feature)
**Purpose**: Find candidates using keyword or semantic (AI-powered) search.

**Implementation**:
- API: `GET /api/search?q=...&mode=keyword|semantic` (Recruiter-only)
- Two modes:
  1. **Keyword Mode** (default):
     - Full-text ILIKE search on candidate skills, headline, bio
     - Fast, exact term matching
  
  2. **Semantic Mode**:
     - Generate embedding for query using Gemini AI
     - Use pgvector cosine distance for similarity search
     - Filter results by similarity threshold (0.65)
     - More intuitive natural-language queries

**Query Processing**:
- Query parameters:
  - `q` - Search query string
  - `mode` - 'keyword' or 'semantic'
  - `level` - Filter by experience level
  - `page` / `pageSize` - Pagination

**Gemini AI Integration**:
- Service: [services/gemini.ts](services/gemini.ts)
- Model: `models/gemini-embedding-001`
- Output dimensionality: 768
- Text preparation: Rich profile text (headline, bio, skills, experience)

**Supabase Vector Store**:
- Uses pgvector extension
- Database function: `semantic_search_candidates()` for cosine distance ranking
- Stored embeddings on `CandidateProfile` (extended schema expected)

**Key Components/Routes**:
- Search API: `GET /api/search?q=...&mode=semantic`
- Search Page: [app/recruiter/search/page.tsx](app/recruiter/search/page.tsx)
- generateEmbedding: [services/gemini.ts](services/gemini.ts)
- Text builders: `buildCandidateProfileText()`, `buildJobText()`

### 10. **Job & Candidate Filtering**
**Purpose**: Narrow down results by experience level, skills, salary, remote status.

**Implementation**:
- Job Listing Filters: `GET /api/jobs`
  - `search` - Title/description search
  - `level` - Experience level (ENTRY, MID, SENIOR, LEAD, EXECUTIVE)
  - `page` / `pageSize`

- Search Results Filters: `GET /api/search`
  - `level` - Experience level
  - Sorted by match score (semantic) or relevance (keyword)

**Frontend Filters**:
- Experience level select
- Salary range (if displayed)
- Remote/on-site toggle
- Skill tags

---

## 📋 Applications Management

### 11. **Job Applications (Candidate Feature)**
**Purpose**: Candidates apply to available jobs.

**Implementation**:
- Database Model: `Application` (unique constraint on jobId + candidateId)
- API: `POST /api/jobs/[id]/apply` - Submit application
- Validations:
  - Candidate must have completed profile
  - Job must be published
  - Prevent duplicate applications
  - Set initial status to PENDING

**Application Lifecycle**:
- Status transitions: PENDING → SHORTLISTED | REJECTED | HIRED

**Key Components/Routes**:
- Apply Button: [app/candidate/jobs/[id]/page.tsx](app/candidate/jobs/%5Bid%5D/page.tsx)
- Apply Endpoint: `POST /api/jobs/[id]/apply`
- Applications List: [app/candidate/applications/page.tsx](app/candidate/applications/page.tsx)
- Applications API: `GET /api/applications` (with optional `status` filter)

### 12. **Application Tracking (Candidate View)**
**Purpose**: Track application status across multiple job postings.

**Implementation**:
- API: `GET /api/applications` - List all candidate applications with filters
- Query params: `status` - Filter by PENDING, SHORTLISTED, REJECTED, HIRED
- Response includes full job details (title, company, salary, posting date)

**Key Components/Routes**:
- My Applications Page: [app/candidate/applications/page.tsx](app/candidate/applications/page.tsx)
- List API: `GET /api/applications?status=PENDING`

---

## 📊 Skill Gap Analysis

### 13. **Skill Gap Assessment**
**Purpose**: Show candidates their skill gaps relative to specific job requirements.

**Implementation**:
- API: `GET /api/gap-analysis?jobId=xxx` (Candidate-only)
- Process:
  1. Fetch candidate profile (skills, experience)
  2. Fetch job with requirements
  3. Calculate match score breakdown
  4. Generate detailed gap analysis
  5. Return recommendations

**Gap Output**:
- For each required skill:
  - Candidate level vs. required minimum
  - Proficiency gap (how much to improve)
  - Skill status: meets, exceeds, below, missing
- Overall score by category (technical, soft skills, experience)
- Recommendations for skill development

**Key Components/Routes**:
- Gap Analysis API: `GET /api/gap-analysis?jobId=xxx`
- Gap Analysis Page: [app/candidate/gap-analysis/page.tsx](app/candidate/gap-analysis/page.tsx)
- Job Detail View also shows gap info

---

## 🤖 Explainable AI (XAI) Features

### 14. **Match Score Explanation**
**Purpose**: Provide transparent, human-readable explanations for match scores.

**Implementation**:
- Component: [components/matching/XAITooltip.tsx](components/matching/XAITooltip.tsx)
- Function: `generateSkillExplanations()` - Creates detailed explanations
- UI: Hover tooltips on match scores showing:
  - Skill-by-skill breakdown
  - Status icons: exceeds ↑, meets →, below ↓, missing ✗
  - Mandatory skill warnings
  - Proficiency gap details

**Explanation Format**:
```
TypeScript: 8/10 exceeds required 6/10 (+2 bonus)
Python: 4/10 below required 5/10 (gap: 1)
Docker: Not found in profile ⚠️ MANDATORY
```

**Key Components/Routes**:
- XAI Tooltip: [components/matching/XAITooltip.tsx](components/matching/XAITooltip.tsx)
- Score Bar: [components/matching/ScoreBar.tsx](components/matching/ScoreBar.tsx)
- MatchCard: [components/matching/MatchCard.tsx](components/matching/MatchCard.tsx) - Uses XAI

---

## 👨‍💼 Admin Features

### 15. **Platform Analytics Dashboard**
**Purpose**: System-wide metrics for platform administrators.

**Implementation**:
- API: `GET /api/admin/stats` (Admin role only)
- Analytics Collected:
  - User counts: Total, candidates, recruiters
  - Job metrics: Total, published, closed
  - Application counts
  - Match statistics: Total, average score, min/max scores
  - Top 15 most common skills across platform
  - Recent user registrations (last 10)

**Key Metrics Returned**:
```json
{
  "users": { "total": 100, "candidates": 70, "recruiters": 30 },
  "jobs": { "total": 25, "published": 20 },
  "applications": 150,
  "matches": { 
    "total": 1000,
    "avgScore": 72,
    "maxScore": 100,
    "minScore": 10
  },
  "topSkills": [
    { "skill": "typescript", "avgLevel": 7.2, "candidateCount": 45 },
    { "skill": "react", "avgLevel": 6.8, "candidateCount": 42 }
  ],
  "recentUsers": [ /* array of 10 most recent users */ ]
}
```

**Key Components/Routes**:
- Admin Stats API: `GET /api/admin/stats`
- Admin Dashboard: [app/admin/page.tsx](app/admin/page.tsx)
- Charts: [components/charts/SkillChart.tsx](components/charts/SkillChart.tsx)

---

## 🔗 Integrations & External Services

### 16. **GitHub Integration**
**Purpose**: Automated skill detection from GitHub activity.

**Implementation**:
- Service: [lib/github.ts](lib/github.ts) using Octokit
- Features:
  1. **GitHub Profile Analysis**:
     - Fetch public repositories
     - Analyze primary languages used
     - Calculate language proficiency (1-10 scale)
     - Extract topics/tags from repos
     - Count stars, forks, recency
  
  2. **Skill Derivation**:
     - Map GitHub languages to skill names
       - TypeScript, Python, Java, C#, C++, Rust, Go, Kotlin, Swift, Ruby, PHP, Docker, Bash
     - Logarithmic scale: byte usage → 1-10 proficiency
     - More code in language = higher level, with diminishing returns
  
  3. **Webhook Support** (Phase 2):
     - Endpoint: `POST /api/webhooks/github`
     - Listens for push events to auto-update skills
     - Currently placeholder, full implementation pending

**Data Stored**:
```typescript
GitHubProfile {
  username,
  publicRepos,
  followers,
  following,
  topLanguages: { lang: bytes },
  derivedSkills: { skill: level },
  totalStars,
  repos: [ { name, description, language, stars, url } ],
  lastSynced
}
```

**Key Components/Routes**:
- GitHub Service: [lib/github.ts](lib/github.ts)
- Sync Endpoint: `POST /api/profile/github-sync`
- Webhook (Phase 2): `POST /api/webhooks/github`

### 17. **Google Generative AI (Gemini) Integration**
**Purpose**: Generate embeddings for semantic search and AI-assisted features.

**Implementation**:
- Service: [services/gemini.ts](services/gemini.ts)
- Model: `models/gemini-embedding-001`
- Features:
  1. **Text Embeddings**: Generate 768-dimensional vectors for semantic search
  2. **Task-Optimized Embeddings**:
     - RETRIEVAL_QUERY - For search queries
     - RETRIEVAL_DOCUMENT - For candidate profiles
     - SEMANTIC_SIMILARITY - Default for comparisons
  
  3. **Text Preparation**:
     - buildCandidateProfileText() - Combine headline, bio, skills, experience
     - buildJobText() - Combine job title, description, requirements
     - Clean: trim whitespace, remove newlines

**Used For**:
- Semantic search in recruiter candidate search
- Profile embedding storage (in pgvector)
- Semantic similarity queries

**Key Components/Routes**:
- Gemini Service: [services/gemini.ts](services/gemini.ts)
- generateEmbedding() - Main function
- Used in: `GET /api/search?mode=semantic`

---

## 🛠️ Database Schema

### Core Models Summary:

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Base auth user | id, email, role, name, image |
| **CandidateProfile** | Candidate details (1:1 with User) | userId, headline, bio, skills (hard/soft), yearsOfExp, isOpenToWork, githubStats |
| **RecruiterProfile** | Company info (1:1 with User) | userId, companyName, industry, website, logoUrl, isVerified |
| **Job** | Job posting | id, recruiterId, title, description, location, experienceLevel, status, categoryWeights |
| **JobRequirement** | Skill requirement | id, jobId, skillName, minLevel (1-10), weight, isMandatory |
| **Match** | Candidate-Job match | id, jobId, candidateId, score (0-100), breakdown (JSON), isShortlisted, isMandatoryPass |
| **Application** | Candidate application | id, jobId, candidateId, status, appliedAt, unique(jobId, candidateId) |

### Database Indexes (for performance):
- CandidateProfile: `isOpenToWork`, `experienceLevel`
- Job: `status`, `recruiterId`, `experienceLevel`
- Match: `jobId_candidateId` (unique), `score`, `jobId_score`
- Application: `jobId`, `candidateId`

---

## 🎨 UI Components

### Shared Components:
| Component | Location | Purpose |
|-----------|----------|---------|
| **AuthProvider** | [components/shared/AuthProvider.tsx](components/shared/AuthProvider.tsx) | React context for auth state |
| **Navbar** | [components/shared/Navbar.tsx](components/shared/Navbar.tsx) | Top navigation bar |
| **Badge** | [components/ui/Badge.tsx](components/ui/Badge.tsx) | Tag/label display |
| **Button** | [components/ui/Button.tsx](components/ui/Button.tsx) | CTA buttons |
| **Card** | [components/ui/Card.tsx](components/ui/Card.tsx) | Content containers |
| **Input** | [components/ui/Input.tsx](components/ui/Input.tsx) | Text inputs |
| **Label** | [components/ui/Label.tsx](components/ui/Label.tsx) | Form labels |
| **Select** | [components/ui/Select.tsx](components/ui/Select.tsx) | Dropdowns (Radix UI) |
| **Slider** | [components/ui/Slider.tsx](components/ui/Slider.tsx) | Range sliders (Radix UI) |
| **Textarea** | [components/ui/Textarea.tsx](components/ui/Textarea.tsx) | Multi-line text inputs |
| **Progress** | [components/ui/Progress.tsx](components/ui/Progress.tsx) | Progress bars (Radix UI) |

### Matching Components:
| Component | Location | Purpose |
|-----------|----------|---------|
| **MatchCard** | [components/matching/MatchCard.tsx](components/matching/MatchCard.tsx) | Display candidate match result |
| **ScoreBar** | [components/matching/ScoreBar.tsx](components/matching/ScoreBar.tsx) | Visual score representation |
| **XAITooltip** | [components/matching/XAITooltip.tsx](components/matching/XAITooltip.tsx) | Match explanation tooltip |

### Other Components:
| Component | Location | Purpose |
|-----------|----------|---------|
| **SkillChart** | [components/charts/SkillChart.tsx](components/charts/SkillChart.tsx) | Recharts visualization for admin analytics |
| **GoogleIcon** | [components/icons/GoogleIcon.tsx](components/icons/GoogleIcon.tsx) | Google branding icon |

---

## 📱 User Pages/Routes

### Candidate Pages:
| Route | File | Purpose |
|-------|------|---------|
| `/candidate/profile` | [app/candidate/profile/page.tsx](app/candidate/profile/page.tsx) | Edit profile, skills, GitHub sync |
| `/candidate/jobs` | [app/candidate/jobs/page.tsx](app/candidate/jobs/page.tsx) | Browse job listings |
| `/candidate/jobs/[id]` | [app/candidate/jobs/%5Bid%5D/page.tsx](app/candidate/jobs/%5Bid%5D/page.tsx) | View job detail & apply |
| `/candidate/applications` | [app/candidate/applications/page.tsx](app/candidate/applications/page.tsx) | Track application status |
| `/candidate/gap-analysis` | [app/candidate/gap-analysis/page.tsx](app/candidate/gap-analysis/page.tsx) | View skill gaps vs jobs |

### Recruiter Pages:
| Route | File | Purpose |
|-------|------|---------|
| `/recruiter/dashboard` | [app/recruiter/dashboard/page.tsx](app/recruiter/dashboard/page.tsx) | Recruiter home screen |
| `/recruiter/jobs/new` | [app/recruiter/jobs/new/page.tsx](app/recruiter/jobs/new/page.tsx) | Create new job posting |
| `/recruiter/jobs/[id]/edit` | [app/recruiter/jobs/%5Bid%5D/edit/page.tsx](app/recruiter/jobs/%5Bid%5D/edit/page.tsx) | Edit existing job |
| `/recruiter/jobs/[id]/matches` | [app/recruiter/jobs/%5Bid%5D/matches/page.tsx](app/recruiter/jobs/%5Bid%5D/matches/page.tsx) | View ranked candidates for job |
| `/recruiter/search` | [app/recruiter/search/page.tsx](app/recruiter/search/page.tsx) | Semantic/keyword search for candidates |

### Admin Pages:
| Route | File | Purpose |
|-------|------|---------|
| `/admin` | [app/admin/page.tsx](app/admin/page.tsx) | Platform analytics dashboard |

### Auth Pages:
| Route | File | Purpose |
|-------|------|---------|
| `/login` | [app/login/page.tsx](app/login/page.tsx) | User login |
| `/register` | [app/register/page.tsx](app/register/page.tsx) | User registration |
| `/onboarding` | [app/onboarding/page.tsx](app/onboarding/page.tsx) | Post-signup profile setup |
| `/unauthorized` | [app/unauthorized/page.tsx](app/unauthorized/page.tsx) | Access denied page |

---

## 🔄 Data Flow Diagrams

### Candidate Application Flow:
```
Candidate Profile → Search Jobs → View Job Detail → Apply
                                                      ↓
                                           Application Created (Status: PENDING)
                                                      ↓
                                           Recruiter Views Applicant
                                                      ↓
                                        (Shortlist or Reject) → Status Updated
```

### Recruiter Matching Flow:
```
Recruiter Creates Job → Sets Requirements & Weights → Publishes
                                                           ↓
                                        System Auto-Calculates Matches
                                        (For all open-to-work candidates)
                                                           ↓
                          Recruiter Views Ranked Candidates by Score
                                                           ↓
                                     Shortlist Top Candidates
                                                           ↓
                                   (Interview & Hire Flow)
```

### GitHub Sync Flow:
```
Candidate → Set GitHub Username → Manual Sync / Auto-Webhook
                                            ↓
                                  Fetch GitHub Repos
                                            ↓
                                  Analyze Languages
                                            ↓
                                  Derive Skill Levels
                                            ↓
                                  Merge with Existing Skills
                                            ↓
                                  Update CandidateProfile
```

### Semantic Search Flow:
```
Recruiter Query → Gemini Embedding → pgvector Cosine Search → Filter Results
     ↓                                                              ↓
  "Find TypeScript expert"  [768-dim vector]  → Top 50 candidates  Similarity >= 0.65
                                                        ↓
                                              Return matching candidates
                                              (sorted by score)
```

---

## 🔐 Security & Authorization

### Role-Based Access Control:
- **CANDIDATE**:
  - View profile, update skills
  - Browse published jobs
  - Apply to jobs
  - Track applications
  - View gap analysis
  - Sync GitHub profile
  
- **RECRUITER**:
  - Create/edit/publish jobs
  - Set skill requirements and weights
  - View ranked candidates for jobs
  - Search candidates (keyword/semantic)
  - Shortlist candidates
  - View candidate profiles
  
- **ADMIN**:
  - View platform analytics
  - See top skills, user counts, match statistics

### Protected Endpoints:
- All API routes check `getSession()` before processing
- Role verification on sensitive operations (e.g., recruiter job creation)
- Ownership verification (e.g., recruiter can only see their job matches)
- Candidates cannot modify recruiter data and vice versa

---

## 📦 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Radix UI components |
| **Forms** | React Hook Form, Zod validation |
| **Backend** | Next.js API routes |
| **Database** | PostgreSQL (Supabase) + pgvector |
| **ORM** | Prisma |
| **Auth** | Supabase Auth, NextAuth.js |
| **AI/ML** | Gemini (embeddings), GitHub API (Octokit) |
| **Visualization** | Recharts |
| **Icons** | Lucide React |

---

## 📋 Summary Table

| Feature Category | Features | Key APIs |
|---|---|---|
| **Auth** | Supabase Auth, NextAuth, Role-based access | `/api/auth/register`, `/api/auth/callback` |
| **Job Management** | Create/edit/publish jobs, list jobs | `POST/GET/PATCH/DELETE /api/jobs[/id]` |
| **Candidate Profile** | Skill tracking, GitHub sync, profile updates | `GET/PATCH /api/profile`, `POST /api/profile/github-sync` |
| **Matching** | Multi-dimensional scoring, ranking | `GET /api/match` |
| **Search** | Hybrid keyword + semantic search | `GET /api/search?mode=semantic` |
| **Applications** | Job applications, tracking | `POST /api/jobs/[id]/apply`, `GET /api/applications` |
| **Gap Analysis** | Skill gap assessment | `GET /api/gap-analysis` |
| **Explainability** | XAI tooltips, breakdown explanations | `generateSkillExplanations()` |
| **Admin** | Platform analytics | `GET /api/admin/stats` |
| **Integrations** | GitHub, Gemini AI | `fetchGitHubProfile()`, `generateEmbedding()` |

---

## 🚀 Future Phases (Noted in Code)

- **Phase 2**: GitHub webhook fully implemented for real-time skill updates
- **Phase 2**: More advanced matching scenarios and edge cases
- **Phase 3**: Additional AI features, notification systems, etc.

---

**Document Generated**: Analysis of Hack-Fest Talent Matching Platform  
**Last Updated**: March 2026
