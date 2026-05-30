// ===== "Otak" Pelatih FinLock (versi pintar tanpa biaya) =====
// Membuat pesan penyemangat yang personal berdasarkan data tabungan pengguna.
// Jalan langsung di browser — tanpa server, tanpa API key, instan & gratis.
//
// Catatan: kalau mau pakai AI LLM asli (Claude) nanti, ganti pemanggilan
// fungsi ini dengan fetch ke backend/server.js (sudah disiapkan).

// Memilih satu kalimat acak dari beberapa variasi, biar tidak monoton.
function pilih(daftar) {
  return daftar[Math.floor(Math.random() * daftar.length)]
}

/**
 * Membuat pesan Pelatih, DIPISAH per "intent" (tujuan).
 * Mengembalikan array { ikon, teks } — tiap item ditampilkan sebagai bubble terpisah.
 * @param {object} d - { streakHari, jatahDarurat, sisaHari, lewatBatas, bisaTarik }
 */
export function pesanPelatih(d) {
  const { streakHari = 0, jatahDarurat = 3, sisaHari = 0, lewatBatas = false, bisaTarik = false } = d
  const pesan = []

  // INTENT: pencapaian (target tercapai)
  if (bisaTarik) {
    pesan.push({ ikon: 'party', teks: pilih([
      `Komitmenmu tercapai! Uangmu bertahan ${streakHari} hari penuh — tarik dana terkuncimu dengan bangga.`,
      `Kerja bagus! ${streakHari} hari kamu tahan godaan. Dana terkuncimu sudah bisa dibuka.`,
    ]) })
  } else {
    // INTENT: semangat (berdasarkan streak)
    if (streakHari >= 30) pesan.push({ ikon: 'flame', teks: `Luar biasa! Uangmu sudah bertahan ${streakHari} hari — kamu konsisten banget.` })
    else if (streakHari >= 7) pesan.push({ ikon: 'flame', teks: `Mantap, sudah ${streakHari} hari bertahan! Kebiasaan baikmu mulai terbentuk.` })
    else if (streakHari >= 1) pesan.push({ ikon: 'sprout', teks: `Awal yang bagus — ${streakHari} hari berjalan! Pelan-pelan tapi pasti.` })
    else pesan.push({ ikon: 'sprout', teks: `Selamat memulai perjalanan nabungmu! Hari pertama adalah langkah tersulit, dan kamu sudah melewatinya.` })

    // INTENT: dorongan menuju target
    if (sisaHari <= 7) pesan.push({ ikon: 'target', teks: `Tinggal ${sisaHari} hari lagi menuju target — sedikit lagi, jangan menyerah!` })
    else if (sisaHari <= 30) pesan.push({ ikon: 'target', teks: `${sisaHari} hari menuju target. Kamu pasti bisa.` })
    else pesan.push({ ikon: 'calendar', teks: `Target masih ${sisaHari} hari lagi — santai, fokus satu hari demi satu hari.` })
  }

  // INTENT: peringatan (lewat batas / jatah darurat menipis)
  if (lewatBatas) {
    if (jatahDarurat <= 0) pesan.push({ ikon: 'alert', teks: `Jatah daruratmu habis bulan ini. Tapi dana terkuncimu tetap aman — bulan depan jatahmu penuh lagi.` })
    else pesan.push({ ikon: 'eye', teks: `Hati-hati, kamu baru pakai jatah darurat — sisa ${jatahDarurat} bulan ini. Simpan untuk yang benar-benar mendesak.` })
  } else if (jatahDarurat === 1 && !bisaTarik) {
    pesan.push({ ikon: 'sos', teks: `Jatah daruratmu tinggal 1 — pakai hanya kalau mendesak, ya.` })
  }

  return pesan
}

/**
 * Menyarankan jumlah yang sebaiknya dikunci dari sebuah setoran.
 * @param {number} setoran - jumlah setoran dalam MNT
 * @returns {{kunci:number, alasan:string}}
 */
export function saranKunci(setoran) {
  const s = Number(setoran)
  if (!s || s <= 0) return { kunci: 0, alasan: 'Isi jumlah setoran dulu, ya.' }

  // Kunci 60% dari setoran — cukup besar untuk komitmen, tapi sisakan dana pakai.
  let kunci = Math.round(s * 0.6 * 100) / 100
  const sisa = Math.round((s - kunci) * 100) / 100

  const alasan =
    `Saran: kunci ${kunci} MNT (60% dari setoran). Cukup besar untuk komitmen nyata, ` +
    `tapi masih menyisakan ${sisa} MNT sebagai dana pakai. Disiplin yang sehat itu menantang tapi tidak mencekik. 💪`

  return { kunci, alasan }
}
