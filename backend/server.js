// ===== Server kecil FinLock (AI Pelatih pakai Google Gemini — gratis) =====
// Menyimpan GEMINI_API_KEY (rahasia) & memanggil Gemini atas nama web FinLock.
// Web (browser) tidak pernah memegang API key.

import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-2.0-flash' // model Gemini cepat & ada kuota gratis

// Memanggil Gemini, mengembalikan teks jawaban.
async function tanyaGemini(prompt, maxTokens = 200) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini error')
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
}

// ====== Endpoint 1: Pesan Pelatih AI ======
app.post('/api/coach', async (req, res) => {
  try {
    const {
      danaTerkunci = 0, danaPakai = 0, streakHari = 0,
      jatahDarurat = 3, sisaHari = 0, lewatBatas = false,
      terpakai = 0, batas = 0,
    } = req.body || {}

    const prompt =
      `Kamu "Pelatih AI FinLock" — pendamping nabung yang hangat, suportif, sedikit jenaka. ` +
      `FinLock: dompet tabungan disiplin di blockchain; sebagian uang dikunci mati sampai tanggal pilihan pengguna, ` +
      `sisanya boleh dipakai tapi ada batas bulanan, dan ada 3 jatah darurat per bulan.\n\n` +
      `Data pengguna sekarang:\n` +
      `- Dana terkunci: ${danaTerkunci} MNT\n- Dana pakai tersisa: ${danaPakai} MNT\n` +
      `- Streak bertahan: ${streakHari} hari\n- Sisa jatah darurat bulan ini: ${jatahDarurat}/3\n` +
      `- Pakai bulan ini: ${terpakai}/${batas} MNT (batas)\n- Hari menuju tanggal buka: ${sisaHari}\n` +
      `- Baru melewati batas: ${lewatBatas ? 'ya' : 'tidak'}\n\n` +
      `Tulis SATU pesan singkat (maksimal 2 kalimat, bahasa Indonesia santai) yang menyemangati & relevan dengan datanya. ` +
      `Kalau jatah darurat menipis atau melewati batas, ingatkan dengan lembut. Boleh 1 emoji. ` +
      `Jawab HANYA pesannya, tanpa tanda kutip.`

    const pesan = await tanyaGemini(prompt, 200)
    res.json({ pesan })
  } catch (err) {
    console.error('Error /api/coach:', err?.message)
    res.status(500).json({ error: 'Gagal memanggil Pelatih AI', detail: err?.message })
  }
})

// ====== Endpoint 2: Saran jumlah kunci ======
app.post('/api/suggest-lock', async (req, res) => {
  try {
    const { setoran = 0 } = req.body || {}
    const prompt =
      `Penasihat tabungan FinLock. Diberi setoran ${setoran} MNT, sarankan berapa MNT yang sebaiknya DIKUNCI MATI ` +
      `(umumnya 50-70% setoran, jangan 100%, sisakan dana pakai). Balas HANYA JSON valid tanpa markdown, ` +
      `format: {"kunci": <angka>, "alasan": "<kalimat singkat hangat bahasa Indonesia>"}.`

    let teks = await tanyaGemini(prompt, 200)
    teks = teks.replace(/```json|```/g, '').trim() // buang pagar kode kalau ada
    const data = JSON.parse(teks)
    res.json(data)
  } catch (err) {
    console.error('Error /api/suggest-lock:', err?.message)
    res.status(500).json({ error: 'Gagal meminta saran', detail: err?.message })
  }
})

app.get('/', (_req, res) => res.send('FinLock backend (Gemini) hidup ✅'))

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`FinLock backend jalan di http://localhost:${PORT}`))
