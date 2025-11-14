# Renovate Configuration Specification

> **Language:** [English](#) | [Tiếng Việt](./README_vi.md)

## Overview
This configuration defines a self-hosted Renovate bot setup with custom scheduling, branch patterns, and maintenance policies for the Garoon project.

---

## Configuration Analysis

### 1. Schema Definition
```json5
$schema: "https://docs.renovatebot.com/renovate-schema.json"
```
**Purpose:** Enables IDE autocomplete and validation for Renovate configuration files.

---

### 2. Base Configuration
```json5
extends: ["config:recommended"]
```
**Behavior:** 
- Inherits Renovate's recommended defaults
- Includes best practices for dependency updates
- Provides standard grouping and versioning rules

---

### 3. Branch Configuration
```json5
baseBranchPatterns: ["main"]
branchPrefix: "Garoon-renovate/"
```
**Behavior:**
- **Target Branch:** Only scan and create PRs targeting the `main` branch
- **PR Branch Naming:** All Renovate PRs use the format: `Garoon-renovate/<update-name>`
  - Example: `Garoon-renovate/actions-checkout-5.x`
  - Example: `Garoon-renovate/npm-eslint-9.x`

---

### 4. Manager Configuration
```json5
enabledManagers: []
```
**Behavior:** 
- ⚠️ **CRITICAL ISSUE:** No dependency managers are enabled
- Renovate will **NOT** scan or update any dependencies:
  - ❌ npm packages
  - ❌ GitHub Actions
  - ❌ Docker images
  - ❌ Any other package managers

**Impact:** The bot is effectively **INACTIVE** for all dependency updates.

---

### 5. Pull Request Settings
```json5
labels: ["renovate"]
prConcurrentLimit: 0
prHourlyLimit: 4
```
**Behavior:**
- **Labels:** All PRs are automatically tagged with the `renovate` label
- **Concurrent Limit:** `0` = No limit on the number of simultaneous open PRs
- **Hourly Limit:** Maximum 4 PRs can be created per hour (rate limiting)

**Rate Limiting Strategy:**
- Prevents overwhelming the repository with too many PRs at once
- During the 12-hour PR creation window (Tue 7pm - Wed 7am), maximum 48 PRs can be created

---

### 6. Scheduling Configuration

#### PR Creation Schedule
```json5
schedule: ["after 7pm on Tuesday", "before 7am on Wednesday"]
```
**Behavior:**
- PRs are **ONLY** created during this time window:
  - **Tuesday:** 19:00 - 23:59 (JST)
  - **Wednesday:** 00:00 - 07:00 (JST)
- **Total window:** ~12 hours per week
- **Rationale:** Avoids disrupting work during business hours

#### Automerge Schedule
```json5
automergeSchedule: [
  "after 7pm every weekday",
  "before 9am every weekday",
  "every weekend"
]
```
**Behavior:**
- Automerge is allowed during:
  - **Weekdays:** 19:00 - 09:00 (next day) JST - Overnight window
  - **Weekends:** All day Saturday and Sunday
- **Total window:** ~14 hours per weekday + 48 hours per weekend = ~142 hours per week

**Weekly Timeline Example:**
```
Monday:    19:00 → 09:00 (Tue) ✅ Automerge window
Tuesday:   09:00 → 19:00       ❌ No automerge (business hours)
           19:00 → 23:59       ✅ Create PRs + Automerge
Wednesday: 00:00 → 07:00       ✅ Create PRs + Automerge
           07:00 → 09:00       ❌ No automerge (business hours)
           09:00 → 19:00       ❌ No automerge (business hours)
           19:00 → 09:00 (Thu) ✅ Automerge window
...
Saturday:  00:00 → 23:59       ✅ Automerge all day
Sunday:    00:00 → 23:59       ✅ Automerge all day
```

---

### 7. Timezone
```json5
timezone: "Asia/Tokyo"
```
**Behavior:** All schedule times are interpreted as Japan Standard Time (UTC+9)

---

### 8. Release Age Policy
```json5
minimumReleaseAge: "14 days"
```
**Behavior:**
- Renovate waits **14 days** after a package is released before creating an update PR
- **Rationale:** Reduces risk of updating to newly released versions that may contain bugs
- **Example:** If package v2.0.0 is released on January 1st, PR will be created on January 15th

---

### 9. Dependency Dashboard
```json5
dependencyDashboard: true
```
**Behavior:**
- Creates and maintains a GitHub Issue titled "Dependency Dashboard"
- Dashboard displays:
  - ✅ Pending updates
  - ⏸️ Rate-limited updates
  - ❌ Failed/errored updates
  - ⚠️ Configuration errors

---

### 10. Automerge Configuration
```json5
platformAutomerge: true
automergeStrategy: "merge-commit"
```
**Behavior:**
- **Platform Automerge:** Enabled - uses GitHub native auto-merge feature
- **Merge Strategy:** Use merge commits (not squash or rebase)
- **Benefits:** Respects branch protection rules (require approvals, status checks)

**Docs:** [GitHub Auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

### 11. Commit Message Format
```json5
semanticCommits: "disabled"
```
**Behavior:**
- Commit messages will **NOT** follow semantic commit conventions
- Standard format is used instead of `feat:`, `fix:`, `chore:` prefixes

**Examples:**
- ❌ **Not:** `chore(deps): update actions/checkout action to v5`
- ✅ **Instead:** `Update actions/checkout action to v5`

---

### 12. Lock File Maintenance
```json5
lockFileMaintenance: {
  enabled: true,
  automerge: false,
  schedule: ["every 3 months on the first day of the month"]
}
```
**Behavior:**
- **Frequency:** Quarterly updates to lock files (package-lock.json, pnpm-lock.yaml, etc.)
- **Schedule:** January 1, April 1, July 1, October 1
- **Review:** Manual review required (automerge disabled)
- **Purpose:** Ensures the dependency tree stays fresh without requiring individual package updates

---

### 13. Package Rules - GitHub Actions Security Strategy
```json5
packageRules: [
  {
    description: "Official GitHub Actions",
    matchManagers: ["github-actions"],
    matchPackagePatterns: ["^actions/"],
    matchUpdateTypes: ["major"],
    branchPrefix: "Garoon-renovate/official-actions/",
    automerge: true
  },
  {
    description: "Internal Organization Actions",
    matchManagers: ["github-actions"],
    matchPackagePatterns: ["^cybozu"],
    matchUpdateTypes: ["major", "minor", "patch", "digest"],
    branchPrefix: "Garoon-renovate/internal-actions/",
    automerge: true
  },
  {
    description: "Third-party Actions - manual review required",
    matchManagers: ["github-actions"],
    matchPackagePatterns: ["^(?!actions/|cybozu).*"],
    branchPrefix: "Garoon-renovate/third-party-actions/",
    automerge: false,
    pinDigests: true,
    minimumReleaseAge: "30 days"
  }
]
```

**Classification Strategy:**

#### 1️⃣ Official GitHub Actions (`actions/*`)
- **Pattern:** `^actions/`
- **Examples:** `actions/checkout`, `actions/setup-node`, `actions/cache`
- **Auto-merge:** ✅ Major updates only
- **Rationale:** Official GitHub Actions, well-maintained, clear migration guides

#### 2️⃣ Internal Cybozu Actions (`cybozu*`)
- **Pattern:** `^cybozu`
- **Examples:** `cybozu-ept/fourkeys-metrics-action`, `cybozu/js-sdk`, `cybozu-cli/*`
- **Auto-merge:** ✅ All updates (major, minor, patch, digest)
- **Rationale:** Internal actions, trusted, under our control

#### 3️⃣ Third-party Actions (Everything else)
- **Pattern:** `^(?!actions/|cybozu).*`
- **Examples:** `aws-actions/*`, `docker/*`, `ruby/setup-ruby`
- **Auto-merge:** ❌ Requires manual review
- **Pin to digest:** ✅ Immutable, prevents tag hijacking
- **Wait time:** 30 days (instead of 14 days)
- **Rationale:** Higher security risk, requires human review

**Branch Prefixes:**
- Official: `Garoon-renovate/official-actions/`
- Internal: `Garoon-renovate/internal-actions/`
- Third-party: `Garoon-renovate/third-party-actions/`

**Docs:**
- [Package Rules](https://docs.renovatebot.com/configuration-options/#packagerules)
- [Pin Digests](https://docs.renovatebot.com/configuration-options/#pindigests)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

## Operational Flow

### Typical Weekly Cycle:

```
Monday 19:00 JST:
├─ Automerge window opens for existing PRs
└─ No new PRs created (outside creation schedule)

Tuesday 19:00 JST:
├─ PR creation window opens
├─ Renovate scans repository
├─ ⚠️ NO UPDATES FOUND (enabledManagers: [])
├─ No PRs created
└─ Automerge window active for any existing PRs

Wednesday 07:00 JST:
├─ PR creation window closes
└─ Automerge continues until 09:00

Wednesday 09:00 - 19:00 JST:
└─ No Renovate activity

Wednesday 19:00 JST:
└─ Automerge window reopens

Weekend:
└─ Automerge active all day
```

---

## Issues & Recommendations

### Issues to Note

#### 1. No Managers Enabled
```json5
enabledManagers: []
```
**Status:** ⚠️ Bot only works when config is applied to specific repositories

**Reason:**
- This config is a **base template** for self-hosted Renovate
- When applying to a repository, enable appropriate managers for the project
- Examples:
  - Repository with GitHub Actions → Enable `github-actions`
  - Repository with npm → Enable `npm`
  - Repository with Docker → Enable `docker`

**Usage:** In specific repository, create `renovate.json`:
```json5
{
  "extends": ["local>org/renovate-self-hosted"],
  "enabledManagers": ["github-actions", "npm"]
}
```

#### 2. Automerge Schedule Conflict
```json5
automergeSchedule: false,  // Line 11
```
**Status:** ⚠️ Conflicts with schedule defined at lines 18-22

**Impact:** Renovate may ignore the schedule or behave unexpectedly

**Fix:** Remove line 11 if you want to use automerge schedule

### Recommended Configuration

**Current config already includes:**
- ✅ Platform automerge with GitHub native feature
- ✅ Security strategy for GitHub Actions (official/internal/third-party)
- ✅ Pin digests for third-party actions
- ✅ Reasonable PR creation and automerge schedules

**To use in specific repository:**

```json5
// renovate.json in repository
{
  "extends": ["local>org/renovate-self-hosted"],
  "enabledManagers": ["github-actions", "npm"],  // Enable needed managers
  
  // Can override settings if needed
  "packageRules": [
    // ... add project-specific rules
  ]
}
```

**Or use directly (standalone):**

```json5
{
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  extends: ["config:recommended"],
  baseBranchPatterns: ["main"],
  enabledManagers: ["github-actions"],  // Enable managers
  branchPrefix: "Garoon-renovate/",
  labels: ["renovate"],
  timezone: "Asia/Tokyo",
  minimumReleaseAge: "14 days",
  dependencyDashboard: true,
  prConcurrentLimit: 0,
  prHourlyLimit: 4,
  semanticCommits: "disabled",
  automergeStrategy: "merge-commit",
  platformAutomerge: true,  // ✅ Enable platform automerge
  schedule: ["after 7pm on Tuesday", "before 7am on Wednesday"],
  automergeSchedule: [
    "after 7pm every weekday",
    "before 9am every weekday",
    "every weekend",
  ],
  lockFileMaintenance: {
    enabled: true,
    automerge: false,
    schedule: ["every 3 months on the first day of the month"],
  },
  packageRules: [
    // ... GitHub Actions security strategy (see section 13)
  ],
  customManagers: [],
}
```

---

## Configuration Summary

| Setting | Current Value | Impact |
|---------|--------------|--------|
| **Enabled Managers** | None (`[]`) | ⚠️ Template - enable when applied |
| **Platform Automerge** | Enabled (`true`) | ✅ Respects branch protection |
| **PR Creation Window** | Tue 19:00 - Wed 07:00 JST | 12 hours/week |
| **Automerge Window** | Weeknights + Weekends | ~142 hours/week |
| **Rate Limit** | 4 PRs/hour | Max 48 PRs during creation window |
| **Release Age** | 14 days (30 for third-party) | Conservative update policy |
| **Semantic Commits** | Disabled | Plain commit messages |
| **Lock File Updates** | Quarterly | Jan/Apr/Jul/Oct |
| **Base Branch Prefix** | `Garoon-renovate/` | Easy to identify Renovate PRs |
| **Package Rules** | 3 rules for Actions | Security strategy classification |

### Security Strategy Summary

| Action Type | Auto-merge | Pin Digest | Wait Time | Branch Prefix |
|-------------|-----------|------------|-----------|---------------|
| **Official** (`actions/*`) | ✅ Major only | ❌ | 14 days | `official-actions/` |
| **Internal** (`cybozu*`) | ✅ All updates | ❌ | 14 days | `internal-actions/` |
| **Third-party** | ❌ Manual | ✅ Yes | 30 days | `third-party-actions/` |

---

## Documentation

- [Renovate Documentation](https://docs.renovatebot.com/)
- [Configuration Options](https://docs.renovatebot.com/configuration-options/)
- [Schedule Presets](https://docs.renovatebot.com/presets-schedule/)

## License

See [LICENSE](./LICENSE) file for details.
