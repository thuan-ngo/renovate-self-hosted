# Đặc tả Cấu hình Renovate

> **Ngôn ngữ:** [English](./README.md) | [Tiếng Việt](#)

## Tổng quan
Cấu hình này định nghĩa một Renovate bot self-hosted với lịch trình tùy chỉnh, quy tắc nhánh và chính sách bảo trì cho dự án Garoon.

---

## Phân tích Cấu hình

### 1. Định nghĩa Schema
```json5
$schema: "https://docs.renovatebot.com/renovate-schema.json"
```
**Mục đích:** Kích hoạt autocomplete và validation trong IDE cho file cấu hình Renovate.

---

### 2. Cấu hình Cơ bản
```json5
extends: ["config:recommended"]
```
**Hoạt động:** 
- Kế thừa các cài đặt mặc định được khuyến nghị từ Renovate
- Bao gồm các best practices cho việc cập nhật dependencies
- Cung cấp các quy tắc nhóm và versioning chuẩn

---

### 3. Cấu hình Nhánh
```json5
baseBranchPatterns: ["main"]
branchPrefix: "Garoon-renovate/"
```
**Hoạt động:**
- **Nhánh mục tiêu:** Chỉ quét và tạo PR vào nhánh `main`
- **Tên nhánh PR:** Tất cả PR từ Renovate sử dụng format: `Garoon-renovate/<tên-update>`
  - Ví dụ: `Garoon-renovate/actions-checkout-5.x`
  - Ví dụ: `Garoon-renovate/npm-eslint-9.x`

---

### 4. Cấu hình Manager
```json5
enabledManagers: []
```
**Hoạt động:** 
- ⚠️ **VẤN ĐỀ NGHIÊM TRỌNG:** Không có dependency manager nào được bật
- Renovate sẽ **KHÔNG** quét hoặc cập nhật bất kỳ dependencies nào:
  - ❌ npm packages
  - ❌ GitHub Actions
  - ❌ Docker images
  - ❌ Bất kỳ package manager nào khác

**Tác động:** Bot thực tế **KHÔNG HOẠT ĐỘNG** cho tất cả các cập nhật dependencies.

---

### 5. Cài đặt Pull Request
```json5
labels: ["renovate"]
prConcurrentLimit: 0
prHourlyLimit: 4
```
**Hoạt động:**
- **Labels:** Tất cả PR tự động được gắn label `renovate`
- **Giới hạn đồng thời:** `0` = Không giới hạn số lượng PR mở cùng lúc
- **Giới hạn theo giờ:** Tối đa 4 PR có thể được tạo mỗi giờ (rate limiting)

**Chiến lược Rate Limiting:**
- Tránh làm quá tải repository với quá nhiều PR cùng lúc
- Trong cửa sổ 12 giờ tạo PR (Thứ 3 7pm - Thứ 4 7am), tối đa 48 PR có thể được tạo

---

### 6. Cấu hình Lịch trình

#### Lịch tạo PR
```json5
schedule: ["after 7pm on Tuesday", "before 7am on Wednesday"]
```
**Hoạt động:**
- PR **CHỈ** được tạo trong khung giờ này:
  - **Thứ Ba:** 19:00 - 23:59 (giờ Tokyo)
  - **Thứ Tư:** 00:00 - 07:00 (giờ Tokyo)
- **Tổng cửa sổ:** ~12 giờ mỗi tuần
- **Lý do:** Tránh làm gián đoạn công việc trong giờ hành chính

#### Lịch Automerge
```json5
automergeSchedule: [
  "after 7pm every weekday",
  "before 9am every weekday",
  "every weekend"
]
```
**Hoạt động:**
- Automerge được phép trong:
  - **Các ngày trong tuần:** 19:00 - 09:00 (ngày hôm sau) giờ Tokyo - Cửa sổ qua đêm
  - **Cuối tuần:** Cả ngày Thứ Bảy và Chủ Nhật
- **Tổng cửa sổ:** ~14 giờ mỗi ngày trong tuần + 48 giờ cuối tuần = ~142 giờ mỗi tuần

**Ví dụ Timeline trong tuần:**
```
Thứ Hai:   19:00 → 09:00 (T3)  ✅ Cửa sổ Automerge
Thứ Ba:    09:00 → 19:00       ❌ Không automerge (giờ làm việc)
           19:00 → 23:59       ✅ Tạo PR + Automerge
Thứ Tư:    00:00 → 07:00       ✅ Tạo PR + Automerge
           07:00 → 09:00       ❌ Không automerge (giờ làm việc)
           09:00 → 19:00       ❌ Không automerge (giờ làm việc)
           19:00 → 09:00 (T5)  ✅ Cửa sổ Automerge
...
Thứ Bảy:   00:00 → 23:59       ✅ Automerge cả ngày
Chủ Nhật:  00:00 → 23:59       ✅ Automerge cả ngày
```

---

### 7. Múi giờ
```json5
timezone: "Asia/Tokyo"
```
**Hoạt động:** Tất cả thời gian lịch trình được hiểu theo giờ Tokyo (UTC+9)

---

### 8. Chính sách Tuổi Release
```json5
minimumReleaseAge: "14 days"
```
**Hoạt động:**
- Renovate đợi **14 ngày** sau khi package được release trước khi tạo PR cập nhật
- **Lý do:** Giảm rủi ro cập nhật lên các phiên bản mới có thể chứa bugs
- **Ví dụ:** Nếu package v2.0.0 được release ngày 1 tháng 1, PR sẽ được tạo ngày 15 tháng 1

---

### 9. Dependency Dashboard
```json5
dependencyDashboard: true
```
**Hoạt động:**
- Tạo và duy trì một GitHub Issue có tiêu đề "Dependency Dashboard"
- Dashboard hiển thị:
  - ✅ Các update đang chờ
  - ⏸️ Các update bị rate-limit
  - ❌ Các update thất bại/lỗi
  - ⚠️ Lỗi cấu hình

---

### 10. Cấu hình Automerge
```json5
platformAutomerge: true
automergeStrategy: "merge-commit"
```
**Hoạt động:**
- **Platform Automerge:** Bật - sử dụng GitHub native auto-merge feature
- **Chiến lược Merge:** Sử dụng merge commits (không dùng squash hoặc rebase)
- **Lợi ích:** Tuân thủ branch protection rules (require approvals, status checks)

**Docs:** [GitHub Auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

### 11. Format Commit Message
```json5
semanticCommits: "disabled"
```
**Hoạt động:**
- Commit messages sẽ **KHÔNG** tuân theo quy ước semantic commit
- Sử dụng format chuẩn thay vì các prefix `feat:`, `fix:`, `chore:`

**Ví dụ:**
- ❌ **Không:** `chore(deps): update actions/checkout action to v5`
- ✅ **Thay vào đó:** `Update actions/checkout action to v5`

---

### 12. Bảo trì Lock File
```json5
lockFileMaintenance: {
  enabled: true,
  automerge: false,
  schedule: ["every 3 months on the first day of the month"]
}
```
**Hoạt động:**
- **Tần suất:** Cập nhật lock files theo quý (package-lock.json, pnpm-lock.yaml, v.v.)
- **Lịch trình:** Ngày 1 tháng 1, ngày 1 tháng 4, ngày 1 tháng 7, ngày 1 tháng 10
- **Review:** Yêu cầu review thủ công (automerge bị tắt)
- **Mục đích:** Đảm bảo cây dependencies được làm mới mà không cần cập nhật từng package riêng lẻ

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

**Chiến lược phân loại:**

#### 1️⃣ Official GitHub Actions (`actions/*`)
- **Pattern:** `^actions/`
- **Ví dụ:** `actions/checkout`, `actions/setup-node`, `actions/cache`
- **Auto-merge:** ✅ Chỉ major updates
- **Lý do:** Actions chính thức của GitHub, được maintain tốt, có migration guide rõ ràng

#### 2️⃣ Internal Cybozu Actions (`cybozu*`)
- **Pattern:** `^cybozu`
- **Ví dụ:** `cybozu-ept/fourkeys-metrics-action`, `cybozu/js-sdk`, `cybozu-cli/*`
- **Auto-merge:** ✅ Tất cả updates (major, minor, patch, digest)
- **Lý do:** Actions nội bộ, tin cậy, kiểm soát được

#### 3️⃣ Third-party Actions (Tất cả còn lại)
- **Pattern:** `^(?!actions/|cybozu).*`
- **Ví dụ:** `aws-actions/*`, `docker/*`, `ruby/setup-ruby`
- **Auto-merge:** ❌ Yêu cầu review thủ công
- **Pin to digest:** ✅ Immutable, chống tag hijacking
- **Wait time:** 30 ngày (thay vì 14 ngày)
- **Lý do:** Rủi ro security cao, cần human review

**Branch Prefixes:**
- Official: `Garoon-renovate/official-actions/`
- Internal: `Garoon-renovate/internal-actions/`
- Third-party: `Garoon-renovate/third-party-actions/`

**Docs:**
- [Package Rules](https://docs.renovatebot.com/configuration-options/#packagerules)
- [Pin Digests](https://docs.renovatebot.com/configuration-options/#pindigests)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

## Luồng Hoạt động

### Chu kỳ Hàng tuần Điển hình:

```
Thứ Hai 19:00 giờ Tokyo:
├─ Cửa sổ Automerge mở cho các PR hiện có
└─ Không tạo PR mới (ngoài lịch tạo)

Thứ Ba 19:00 giờ Tokyo:
├─ Cửa sổ tạo PR mở
├─ Renovate quét repository
├─ ⚠️ KHÔNG TÌM THẤY UPDATE (enabledManagers: [])
├─ Không tạo PR
└─ Cửa sổ Automerge hoạt động cho PR hiện có

Thứ Tư 07:00 giờ Tokyo:
├─ Cửa sổ tạo PR đóng
└─ Automerge tiếp tục đến 09:00

Thứ Tư 09:00 - 19:00 giờ Tokyo:
└─ Không có hoạt động Renovate

Thứ Tư 19:00 giờ Tokyo:
└─ Cửa sổ Automerge mở lại

Cuối tuần:
└─ Automerge hoạt động cả ngày
```

---

## Vấn đề & Khuyến nghị

### Vấn đề cần lưu ý

#### 1. Không có Manager được Bật
```json5
enabledManagers: []
```
**Trạng thái:** ⚠️ Bot chỉ hoạt động khi apply config vào repository cụ thể

**Lý do:**
- Config này là **base template** cho self-hosted Renovate
- Khi apply vào repository, cần bật managers phù hợp với project
- Ví dụ:
  - Repository có GitHub Actions → Bật `github-actions`
  - Repository có npm → Bật `npm`
  - Repository có Docker → Bật `docker`

**Cách sử dụng:** Trong repository cụ thể, tạo file `renovate.json`:
```json5
{
  "extends": ["local>org/renovate-self-hosted"],
  "enabledManagers": ["github-actions", "npm"]
}
```

#### 2. Xung đột Cài đặt Automerge Schedule
```json5
automergeSchedule: false,  // Dòng 11
```
**Trạng thái:** ⚠️ Conflict với schedule định nghĩa ở dòng 18-22

**Ảnh hưởng:** Renovate có thể ignore schedule hoặc hoạt động không như mong đợi

**Sửa:** Xóa dòng 11 nếu muốn sử dụng automerge schedule

### Cấu hình Khuyến nghị

**Config hiện tại đã bao gồm:**
- ✅ Platform automerge với GitHub native feature
- ✅ Security strategy cho GitHub Actions (official/internal/third-party)
- ✅ Pin digests cho third-party actions
- ✅ Lịch trình tạo PR và automerge hợp lý

**Để sử dụng trong repository cụ thể:**

```json5
// renovate.json trong repository
{
  "extends": ["local>org/renovate-self-hosted"],
  "enabledManagers": ["github-actions", "npm"],  // Bật managers cần thiết
  
  // Có thể override settings nếu cần
  "packageRules": [
    // ... thêm rules riêng cho project
  ]
}
```

**Hoặc sử dụng trực tiếp (standalone):**

```json5
{
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  extends: ["config:recommended"],
  baseBranchPatterns: ["main"],
  enabledManagers: ["github-actions"],  // Bật managers
  branchPrefix: "Garoon-renovate/",
  labels: ["renovate"],
  timezone: "Asia/Tokyo",
  minimumReleaseAge: "14 days",
  dependencyDashboard: true,
  prConcurrentLimit: 0,
  prHourlyLimit: 4,
  semanticCommits: "disabled",
  automergeStrategy: "merge-commit",
  platformAutomerge: true,  // ✅ Bật platform automerge
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
    // ... GitHub Actions security strategy (xem section 13)
  ],
  customManagers: [],
}
```

---

## Tóm tắt Cấu hình

| Cài đặt | Giá trị Hiện tại | Tác động |
|---------|-----------------|----------|
| **Managers được Bật** | Không (`[]`) | ⚠️ Template - bật khi apply |
| **Platform Automerge** | Bật (`true`) | ✅ Tuân thủ branch protection |
| **Cửa sổ Tạo PR** | T3 19:00 - T4 07:00 JST | 12 giờ/tuần |
| **Cửa sổ Automerge** | Tối các ngày + Cuối tuần | ~142 giờ/tuần |
| **Giới hạn Rate** | 4 PRs/giờ | Tối đa 48 PR trong cửa sổ tạo |
| **Tuổi Release** | 14 ngày (30 cho third-party) | Chính sách cập nhật thận trọng |
| **Semantic Commits** | Tắt | Commit messages đơn giản |
| **Cập nhật Lock File** | Theo quý | Tháng 1/4/7/10 |
| **Prefix Nhánh Base** | `Garoon-renovate/` | Dễ nhận diện PR từ Renovate |
| **Package Rules** | 3 rules cho Actions | Security strategy phân loại |

### Security Strategy Summary

| Action Type | Auto-merge | Pin Digest | Wait Time | Branch Prefix |
|-------------|-----------|------------|-----------|---------------|
| **Official** (`actions/*`) | ✅ Major only | ❌ | 14 days | `official-actions/` |
| **Internal** (`cybozu*`) | ✅ All updates | ❌ | 14 days | `internal-actions/` |
| **Third-party** | ❌ Manual | ✅ Yes | 30 days | `third-party-actions/` |

---

## Tài liệu

- [Tài liệu Renovate](https://docs.renovatebot.com/)
- [Các tùy chọn cấu hình](https://docs.renovatebot.com/configuration-options/)
- [Presets lịch trình](https://docs.renovatebot.com/presets-schedule/)

## Giấy phép

Xem file [LICENSE](./LICENSE) để biết chi tiết.

