# Design Document – IDN Live Mirror

## 1. Design Philosophy

**"Less is more, focus on the talent."**

Tujuan desain adalah **mengalihkan fokus ke member yang sedang live**, bukan ke elemen UI. Semua keputusan visual diambil untuk:
- **Meminimalkan gangguan** – tidak ada animasi berlebihan, tidak ada elemen mengambang yang mengganggu.
- **Meningkatkan keterbacaan** – tipografi jelas, kontras cukup, spacing lega.
- **Memberikan kontrol penuh kepada pengguna** – dark/light mode, ukuran player proporsional.

Desain ini **tidak** mengikuti tren "cyber" atau "futuristik" dengan neon, glitch, atau elemen sci-fi. Sebaliknya, kami mengadopsi pendekatan **material design yang diredam** dan **Swiss-style typography** yang bersih, terstruktur, dan abadi.

---

## 2. Color Palette

### 2.1 Dark Mode (Default)
| Role | Hex | Usage |
|------|-----|-------|
| Background utama | `#0D0D0D` | Latar belakang halaman |
| Background card/panel | `#1A1A1A` | Panel komentar, daftar live |
| Surface elevated | `#242424` | Hover state, input, border |
| Teks primer | `#F0F0F0` | Judul, nama member |
| Teks sekunder | `#A0A0A0` | Jumlah penonton, timestamp, info tambahan |
| Aksen utama | `#E85D3A` | Tombol live, indikator aktif, link (warna hangat, tidak menyilaukan) |
| Aksen sekunder | `#3A8FE0` | Border focus, highlight interaksi |
| Border | `#2C2C2C` | Pemisah antar elemen |
| Shadow | `rgba(0,0,0,0.6)` | Untuk memberikan kedalaman tanpa berlebihan |

### 2.2 Light Mode
| Role | Hex | Usage |
|------|-----|-------|
| Background utama | `#F8F9FA` | Latar belakang halaman |
| Background card/panel | `#FFFFFF` | Panel komentar, daftar live |
| Surface elevated | `#F1F3F5` | Hover state, input |
| Teks primer | `#1A1A1A` | Judul, nama member |
| Teks sekunder | `#6C757D` | Jumlah penonton, timestamp |
| Aksen utama | `#D94A2A` | Tombol live, indikator aktif |
| Aksen sekunder | `#2B7BC9` | Border focus, highlight |
| Border | `#DEE2E6` | Pemisah antar elemen |
| Shadow | `rgba(0,0,0,0.08)` | Memberikan kedalaman halus |

> **Catatan:** Kedua mode menggunakan **kontras yang cukup** untuk memenuhi standar aksesibilitas WCAG AA (rasio kontras minimal 4.5:1 untuk teks normal).

---

## 3. Typography

| Role | Font | Weight | Size (Desktop) | Size (Mobile) | Line-height |
|------|------|--------|----------------|---------------|-------------|
| Judul halaman | Inter / system-ui | 700 | 24px | 20px | 1.3 |
| Nama member (di atas player) | Inter / system-ui | 600 | 18px | 16px | 1.4 |
| Jumlah penonton | Inter / system-ui | 400 | 14px | 12px | 1.5 |
| Nama komentator | Inter / system-ui | 500 | 13px | 12px | 1.4 |
| Isi komentar | Inter / system-ui | 400 | 14px | 13px | 1.6 |
| Tombol / label | Inter / system-ui | 500 | 13px | 12px | 1.2 |
| Daftar member live | Inter / system-ui | 500 | 14px | 13px | 1.3 |

**Font fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

---

## 4. Layout Structure

### 4.1 Desktop (≥1024px)
```
+------------------------------------------------------------------+
|  [Logo] IDN Live Mirror         [Dark/Light toggle] [Live: 3]    |
+----------------------------------+-------------------------------+
|                                  |  💬 Komentar (panel scroll)   |
|                                  |                               |
|          VIDEO PLAYER            |  [Avatar] User1: Halo kak!   |
|          (70% width)             |  [Avatar] User2: Live banget |
|                                  |  [Avatar] User3: Semangat!   |
|                                  |  [Avatar] User4: Muka nya    |
|                                  |                               |
|  👤 Nama Member                  |  [Avatar] User5: Aaaaaa      |
|  👁️ 1.234 penonton              |                               |
+----------------------------------+-------------------------------+
|  🔴 Live Now: Member A | Member B | Member C | ... (scroll)     |
+------------------------------------------------------------------+
```

- **Header:** sticky di atas, background transparan dengan blur (glassmorphism ringan) saat discroll.
- **Player:** rasio 16:9, tidak ada border atau bayangan berlebihan.
- **Panel komentar:** background solid dengan sedikit shadow, scroll internal.
- **Bar live:** di bawah, scroll horizontal jika banyak member.

### 4.2 Mobile (<1024px)
```
+----------------------------------+
|  [Logo] IDN Live Mirror  [🌙]    |
+----------------------------------+
|                                  |
|         VIDEO PLAYER             |
|         (full width)             |
|                                  |
|  👤 Nama Member                  |
|  👁️ 1.234 penonton              |
+----------------------------------+
|  💬 Komentar (scroll)           |
|  [Avatar] User1: Halo kak!      |
|  [Avatar] User2: Live banget    |
|  [Avatar] User3: Semangat!      |
+----------------------------------+
|  🔴 Member A | B | C (scroll)   |
+----------------------------------+
```

- **Stack vertikal:** video di atas, komentar di bawah.
- **Header:** lebih compact, logo kecil.
- **Player:** tetap 16:9, tapi mengikuti lebar layar.

---

## 5. Component Design

### 5.1 Video Player
- **Tidak ada overlay** kontrol bawaan dari `hls.js` (kecuali play/pause dan volume).
- **Control bar** muncul saat hover (di desktop) atau tap (di mobile) – transisi halus 0.2s.
- **Indikator live:** lingkaran merah berdenyut (pulsing) di pojok kiri atas.
- **Tombol fullscreen** di pojok kanan bawah (ikon sederhana).

### 5.2 Komentar Panel
- **Avatar:** bulat, ukuran 28px, menggunakan inisial nama user jika tidak ada foto.
- **Nama user:** bold, dengan waktu relatif (misal "2m lalu") dalam warna sekunder.
- **Isi komentar:** wrap, tidak ada emoticon besar, tetap dalam satu baris jika pendek.
- **Scroll:** custom scrollbar tipis (6px) dengan warna yang menyatu dengan background.

### 5.3 Daftar Live Member
- **Card kecil:** gambar thumbnail bulat (40px) + nama member.
- **Status:** dot hijau kecil di pojok kanan bawah avatar.
- **Saat dipilih:** card diberi border aksen atau background sedikit lebih terang.
- **Scroll horizontal:** pada desktop, bar di bawah; pada mobile, bisa di-swipe.

### 5.4 Toggle Dark/Light
- **Ikon:** bulan (🌙) / matahari (☀️) – minimalis, tanpa teks.
- **Transisi:** perubahan warna background dan teks berlangsung 0.3s dengan easing.
- **Posisi:** di pojok kanan header.

---

## 6. Interaction & Micro-interactions

| Action | Feedback |
|--------|----------|
| Hover tombol | Background berubah 10% lebih terang/gelap, cursor pointer |
| Klik member live | Player langsung mengganti stream, panel komentar refresh otomatis |
| Scroll komentar | Scrollbar muncul hanya saat di-scroll (custom) |
| Ganti tema | Transisi warna halus 0.3s, ikon berganti |
| Player dimuat | Animasi loading spinner kecil (putih transparan) selama buffering |
| Stream sedang live | Dot merah berdenyut (keyframe pulse) |

---

## 7. Responsive Breakpoints

| Breakpoint | Layout | Player width | Komentar |
|------------|--------|--------------|----------|
| ≥1024px | 2 kolom | 70% | di samping |
| 768–1023px | 2 kolom (komentar lebih kecil) | 65% | di samping, lebar 35% |
| <768px | 1 kolom | 100% | di bawah |

---

## 8. Accessibility Considerations

- **Kontras warna:** semua kombinasi teks-background memenuhi WCAG AA.
- **Fokus outline:** outline 2px dengan warna aksen untuk navigasi keyboard.
- **Label aria:** semua ikon dan tombol memiliki `aria-label` deskriptif.
- **Font size:** relatif (rem), bisa di-zoom tanpa merusak layout.
- **Reduce motion:** jika user mengaktifkan preferensi `prefers-reduced-motion`, semua animasi (pulse, transisi) dinonaktifkan.

---

## 9. Assets & Icons

- **Ikon:** menggunakan **Lucide Icons** (open source, konsisten) – atau **Font Awesome** versi free.
- **Logo:** teks "IDN Live Mirror" dengan font yang sama, tanpa gambar.
- **Avatar placeholder:** inisial user dengan background gradien lembut (dari palet warna).

---

## 10. Sample CSS Variables

```css
:root {
  --bg-primary: #0D0D0D;
  --bg-card: #1A1A1A;
  --bg-surface: #242424;
  --text-primary: #F0F0F0;
  --text-secondary: #A0A0A0;
  --accent: #E85D3A;
  --accent-hover: #D94A2A;
  --border: #2C2C2C;
  --shadow: rgba(0,0,0,0.6);
}

[data-theme="light"] {
  --bg-primary: #F8F9FA;
  --bg-card: #FFFFFF;
  --bg-surface: #F1F3F5;
  --text-primary: #1A1A1A;
  --text-secondary: #6C757D;
  --accent: #D94A2A;
  --accent-hover: #C13B1E;
  --border: #DEE2E6;
  --shadow: rgba(0,0,0,0.08);
}
```

---

## 11. Final Notes

- Desain ini **tidak** menggunakan efek glassmorphism berlebihan, gradien neon, atau latar belakang abstrak.
- Tujuan akhir: **pengguna lupa bahwa mereka sedang melihat "web", yang mereka lihat hanya member dan interaksi di sekitar mereka.**
- Semua keputusan desain dapat diubah berdasarkan hasil user testing, tetapi filosofi utama (clean, fokus, nyaman) tetap dipegang.
