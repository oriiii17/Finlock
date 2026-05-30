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
 * Membuat pesan Pelatih berdasarkan data tabungan.
 * @param {object} d - { streakHari, jatahDarurat, sisaHari, lewatBatas, bisaTarik }
 */
export function pesanPelatih(d) {
  const { streakHari = 0, jatahDarurat = 3, sisaHari = 0, lewatBatas = false, bisaTarik = false } = d

  // 1) Target sudah tercapai → rayakan.
  if (bisaTarik) {
    return pilih([
      `Komitmenmu tercapai! 🎉 Uangmu bertahan ${streakHari} hari penuh. Kamu baru saja membuktikan kamu bisa — tarik dana terkuncimu dengan bangga!`,
      `Kerja bagus! 🏆 ${streakHari} hari kamu tahan godaan. Dana terkuncimu sudah bisa dibuka. Ini bukti disiplinmu nyata.`,
    ])
  }

  // 2) Baru saja melewati batas → ingatkan lembut.
  if (lewatBatas) {
    if (jatahDarurat <= 0)
      return `Jatah daruratmu habis bulan ini 😬 Tapi tenang — dana terkuncimu tetap aman, dan bulan depan jatahmu penuh lagi. Tahan dulu, ya. 💪`
    return pilih([
      `Hati-hati ya 👀 Kamu baru pakai jatah darurat — sisa ${jatahDarurat} lagi bulan ini. Yakin pengeluaran tadi penting? Kamu masih on track kok. 💪`,
      `Eits, itu tadi pakai jatah darurat 😅 Sisa ${jatahDarurat}. Tidak apa-apa sesekali, tapi simpan buat yang benar-benar mendesak, ya.`,
    ])
  }

  // 3) Bagian semangat berdasarkan streak.
  let semangat
  if (streakHari >= 30) semangat = `Luar biasa! 🔥 Uangmu sudah bertahan ${streakHari} hari — kamu konsisten banget.`
  else if (streakHari >= 7) semangat = `Mantap, sudah ${streakHari} hari bertahan! 💪 Kebiasaan baikmu mulai terbentuk.`
  else if (streakHari >= 1) semangat = `Awal yang bagus — ${streakHari} hari berjalan! 🌱 Pelan-pelan tapi pasti.`
  else semangat = `Selamat memulai perjalanan nabungmu! 🌱 Hari pertama adalah langkah tersulit, dan kamu sudah melewatinya.`

  // 4) Bagian dorongan berdasarkan sisa hari menuju target.
  let dorongan
  if (sisaHari <= 0) dorongan = ''
  else if (sisaHari <= 7) dorongan = ` Tinggal ${sisaHari} hari lagi menuju target — sedikit lagi, jangan menyerah!`
  else if (sisaHari <= 30) dorongan = ` ${sisaHari} hari menuju target. Kamu pasti bisa.`
  else dorongan = ` Target masih ${sisaHari} hari lagi — santai, fokus satu hari demi satu hari.`

  // 5) Bonus pengingat jatah darurat kalau menipis.
  let pengingat = ''
  if (jatahDarurat === 1) pengingat = ' (Catatan: jatah daruratmu tinggal 1 — pakai hanya kalau mendesak ya.)'

  return semangat + dorongan + pengingat
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
