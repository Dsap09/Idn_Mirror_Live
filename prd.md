# Product Requirements Document (PRD)
## IDN Live Mirror – Clean Live Streaming Platform

---

| **Document Version** | 1.0 |
|---|---|
| **Status** | Draft |
| **Date** | 2026-07-31 |
| **Author** | [Nama Tim/Produk] |

---

## 1. Executive Summary

**IDN Live Mirror** adalah aplikasi web yang bertujuan untuk menyajikan ulang (mirroring) siaran langsung dari platform IDN Live dengan antarmuka yang lebih bersih, minimalis, dan nyaman dipandang. Berbeda dengan tampilan IDN Live yang dinilai "rame" dan mengganggu, aplikasi ini akan menampilkan video utama dengan layout 2 kolom, di mana kolom kanan khusus menampilkan komentar tanpa menutupi visual member yang sedang live.

Aplikasi ini dibangun menggunakan **JKT48Connect API** sebagai sumber data live streaming dan di-deploy di **Vercel** dengan pendekatan **monorepo** untuk kemudahan pengelolaan frontend dan backend dalam satu repository.

---

## 2. Goals & Success Criteria

### 2.1 Business Goals
| # | Goal | Success Metric |
|---|---|---|
| G1 | Menyediakan pengalaman menonton live IDN yang lebih bersih dan nyaman | Minimal 70% user menyatakan tampilan lebih enak dipandang |
| G2 | Komentar tidak mengganggu visual member yang sedang live | Layout 2 kolom (video di kiri, komentar di kanan) |
| G3 | Akses 24/7 tanpa ketergantungan pada laptop pribadi | Uptime ≥ 99% via Vercel deployment |

### 2.2 User Goals
| # | Goal | Success Metric |
|---|---|---|
| U1 | Menonton live streaming dengan player minimalis | Video play dalam < 3 detik |
| U2 | Melihat komentar secara real-time di samping video | Komentar muncul < 2 detik setelah dikirim |
| U3 | Mengetahui siapa saja member yang sedang live | Daftar live member ditampilkan dengan jelas |

---

## 3. Scope

### 3.1 In-Scope
- Mirroring live streaming dari IDN Live via JKT48Connect API
- Custom video player dengan HLS support (menggunakan `hls.js`)
- Layout 2 kolom: video (kiri, 70%) dan komentar (kanan, 30%)
- Daftar member yang sedang live (real-time)
- Deployment ke Vercel (frontend + backend dalam monorepo)
- Support mobile responsive

### 3.2 Out-of-Scope (V1)
- Fitur chat/send komentar (view-only)
- Notifikasi push saat member mulai live
- Recording / download video
- Multi-platform selain IDN Live (Showroom, YouTube) - **akan ditambahkan di V2**

---

## 4. Functional Requirements

### 4.1 Live Stream Display

| ID | Requirement | Priority |
|---|---|---|
| FR1 | Menampilkan daftar member JKT48 yang sedang live di IDN Live | P0 |
| FR2 | Menampilkan video player untuk stream yang dipilih | P0 |
| FR3 | Video player harus support format `.m3u8` (HLS) | P0 |
| FR4 | Menampilkan thumbnail, nama member, dan jumlah penonton | P1 |
| FR5 | Menampilkan komentar di panel samping (view-only) | P1 |
| FR6 | Auto-refresh daftar live setiap 30 detik | P1 |

### 4.2 Layout & UI

| ID | Requirement | Priority |
|---|---|---|
| FR7 | Layout 2 kolom: video (70%) di kiri, komentar (30%) di kanan | P0 |
| FR8 | Pada mobile, komentar berada di bawah video | P1 |
| FR9 | Tidak ada elemen UI yang menutupi area video (overlay minimal) | P0 |
| FR10 | Dark mode sebagai default (atau opsi light/dark) | P2 |

### 4.3 Backend API

| ID | Requirement | Priority |
|---|---|---|
| FR11 | Backend sebagai proxy ke JKT48Connect API (menyembunyikan API key) | P0 |
| FR12 | Endpoint: `GET /api/live` → return data live dari IDN | P0 |
| FR13 | Endpoint: `GET /api/chat/{room_id}` → return komentar | P1 |
| FR14 | Caching response selama 15 detik untuk mengurangi panggilan API | P1 |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR1 | First Contentful Paint (FCP) | < 1.5 detik |
| NFR2 | Time to Interactive (TTI) | < 3 detik |
| NFR3 | Video start time (from click) | < 3 detik |
| NFR4 | API response time (backend) | < 500 ms |

### 5.2 Availability & Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR5 | Uptime | ≥ 99% (Vercel SLA) |
| NFR6 | Concurrent users support | Minimal 100 concurrent users |
| NFR7 | Auto-scaling | Vercel serverless functions auto-scale |

### 5.3 Security

| ID | Requirement | Target |
|---|---|---|
| NFR8 | API key JKT48Connect disimpan di server-side (environment variable) | ✅ |
| NFR9 | CORS terbatas ke domain yang diizinkan | ✅ |
| NFR10 | HTTPS enforced (Vercel default) | ✅ |

### 5.4 Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR11 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR12 | Mobile support | Responsive: mobile, tablet, desktop |
| NFR13 | Python version | ≥ 3.12 |

---

## 6. Technical Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Monorepo)                        │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │   Frontend (Static) │  │   Backend (Serverless)      │  │
│  │   - HTML/CSS/JS     │  │   - Python (FastAPI)        │  │
│  │   - hls.js player   │  │   - Proxy ke JKT48Connect   │  │
│  │   - Responsive UI   │  │   - Environment variables   │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  JKT48Connect API                           │
│  - GET /api/jkt48/live/idn                     │
│  - GET /api/jkt48/chat/idn                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Vanilla JS / React (opsional) | Ringan, fleksibel |
| **Video Player** | `hls.js` | Support HLS `.m3u8` |
| **Backend** | Python + FastAPI | Ringan, async, mudah deploy di Vercel |
| **Deployment** | Vercel (monorepo) | Free tier, auto-deploy from Git |
| **Package Manager** | pnpm / npm workspaces | Monorepo support |
| **Version Control** | GitHub | Integration with Vercel |

### 6.3 Monorepo Structure

```
idn-live-mirror/
├── apps/
│   ├── frontend/          # Static frontend
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   └── package.json
│   └── backend/           # Python FastAPI
│       ├── api/
│       │   └── index.py   # FastAPI app
│       ├── requirements.txt
│       └── pyproject.toml
├── packages/              # Shared utilities (opsional)
├── pnpm-workspace.yaml
└── README.md
```

### 6.4 API Design (Backend)

| Endpoint | Method | Description | Response |
|---|---|---|---|
| `/api/live` | GET | Mendapatkan daftar member live IDN | Array of live stream objects |
| `/api/live/{room_id}` | GET | Detail satu live stream | Single live stream object |
| `/api/chat/{room_id}` | GET | Komentar dari room tertentu | Array of chat messages |
| `/health` | GET | Health check | `{"status": "ok"}` |

---

## 7. UI/UX Design

### 7.1 Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🎥 IDN Live Mirror                                    [Live: 3]    │
├──────────────────────────────────┬───────────────────────────────────┤
│                                  │  💬 Komentar                     │
│                                  │                                   │
│          VIDEO PLAYER            │  [Avatar] User1: Halo kak!       │
│          (70% width)             │  [Avatar] User2: Live banget     │
│                                  │  [Avatar] User3: Semangat!       │
│                                  │  [Avatar] User4: Muka nya        │
│                                  │                                   │
│  👤 Nama Member                   │  [Avatar] User5: Aaaaaa         │
│  👁️ 1.234 penonton               │                                   │
├──────────────────────────────────┴───────────────────────────────────┤
│  🔴 Live Now: Member A | Member B | Member C | ...                  │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Layout (Mobile)

```
┌─────────────────────┐
│ 🎥 IDN Live Mirror  │
├─────────────────────┤
│                     │
│    VIDEO PLAYER     │
│    (Full width)     │
│                     │
│ 👤 Nama Member      │
│ 👁️ 1.234 viewers   │
├─────────────────────┤
│ 💬 Komentar         │
│ [Avatar] User1: Hi  │
│ [Avatar] User2: ❤️  │
│ [Avatar] User3: ... │
├─────────────────────┤
│ 🔴 Member A | B | C │
└─────────────────────┘
```

### 7.3 Design Principles
1. **Minimalis** - Tidak ada elemen dekoratif yang tidak perlu
2. **Fokus pada Member** - Video adalah elemen utama, tidak ada overlay mengganggu
3. **Konsisten** - Warna netral (dark theme), tipografi jelas
4. **Responsif** - Adaptif ke semua ukuran layar

---

## 8. Implementation Plan

### 8.1 Phase 1: MVP (Week 1-2)

| Task | Description | Owner |
|---|---|---|
| Setup monorepo structure | pnpm workspaces, Vercel config | Dev |
| Backend: FastAPI + proxy ke JKT48Connect | Dev |
| Frontend: HTML + CSS layout 2 kolom | Dev |
| Integrasi hls.js player | Dev |
| Deploy ke Vercel (staging) | Dev |
| Testing & bug fixing | QA |

### 8.2 Phase 2: Enhancement (Week 3-4)

| Task | Description | Owner |
|---|---|---|
| Fitur komentar (view-only) via API | Dev |
| Auto-refresh daftar live | Dev |
| Mobile responsive optimization | Dev |
| Dark/Light theme toggle | Dev |
| Performance optimization | Dev |

### 8.3 Phase 3: Launch (Week 5)

| Task | Description | Owner |
|---|---|---|
| Production deployment ke Vercel | Dev |
| UAT (User Acceptance Testing) | QA/Product |
| Go-live | All |
| Monitoring & analytics setup | Dev |

---

## 9. Risks & Mitigation

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | JKT48Connect API rate limiting / downtime | High | Implement caching; fallback messaging |
| R2 | API key exposure | High | Store API key di environment variables Vercel, jangan di frontend |
| R3 | Video URL `.m3u8` expired | Medium | Auto-refresh stream URL setiap 30 detik |
| R4 | Vercel free tier limits (build time, function size) | Medium | Optimasi dependencies, minimalisasi bundle |
| R5 | IDN Live mengubah struktur/API | Medium | Gunakan JKT48Connect sebagai abstraction layer (mereka yang maintain) |
| R6 | CORS issues | Low | Configure CORS di FastAPI backend |

---

## 10. Success Metrics (KPI)

| Metric | Target | Measurement |
|---|---|---|
| **Page Load Time** | < 2 detik | Vercel Analytics / Lighthouse |
| **Video Start Time** | < 3 detik | Custom analytics |
| **Uptime** | ≥ 99% | Vercel Status / Uptime monitor |
| **Daily Active Users** | 50+ (initial) | Google Analytics |
| **User Satisfaction** | ≥ 4/5 | Feedback form / survey |
| **Bounce Rate** | < 40% | Google Analytics |

---

## 11. Dependencies & Assumptions

### 11.1 External Dependencies
- **JKT48Connect API**: Tersedia dan stabil
- **Free API Key**: Dapat digunakan dari JKT48Connect
- **Vercel Platform**: Mendukung Python runtime dan monorepo

### 11.2 Assumptions
- User memiliki koneksi internet stabil untuk streaming HLS
- Browser user support HTML5 video dan HLS
- API JKT48Connect tetap menyediakan endpoint IDN Live
- Vercel free tier cukup untuk initial traffic

---

## 12. Appendix

### 12.1 API Reference - JKT48Connect

**Endpoint**: `GET /api/jkt48/live/idn`

**Parameters**:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `apikey` | string | ✅ | API key for authentication |

**Response Structure**:
```json
{
  "name": "Member Name",
  "img": "https://...thumbnail.jpg",
  "room_id": 12345,
  "streaming_url_list": [
    { "label": "original", "quality": 1, "url": "https://...stream.m3u8" }
  ],
  "type": "idn",
  "started_at": "2026-07-31T10:00:00Z"
}
```

### 12.2 Vercel Configuration Reference

**Root Directory Setting**: Setiap project dalam monorepo perlu dikonfigurasi Root Directory-nya.

**Python Entrypoint**: Vercel akan mendeteksi `app.py` atau `api/index.py` secara otomatis.

**Environment Variables**:
| Variable | Description |
|---|---|
| `JKT48_API_KEY` | API key untuk JKT48Connect |

