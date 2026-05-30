// ===== Server kecil FinLock =====
// Tugasnya: jadi "penjaga pintu" yang menyimpan ANTHROPIC_API_KEY (rahasia)
// dan memanggil Claude AI atas nama web FinLock. Web (browser) TIDAK pernah
// memegang API key — ia cuma bicara ke server ini.

import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

// Membuat klien Claude. SDK otomatis membaca ANTHROPIC_API_KEY dari .env.
const client = new Anthropic()

// Model Claude terbaru & paling pintar.
const MODEL = 'claude-opus-4-8'
// 💡 Untuk respons lebih cepat & lebih murah, bisa ganti ke 'claude-haiku-4-5'.

const app = express()
app.use(cors())              // izinkan web (localhost) memanggil server ini
app.use(express.json())      // baca body JSON dari request

// ---- Kepribadian "Pelatih AI" (system prompt) ----
// cache_control menandai agar Claude menyimpan bagian ini di cache (hemat biaya
// kalau dipanggil berulang). Untuk prompt sependek ini efeknya kecil, tapi
// ini praktik yang baik & tidak ada ruginya.
const COACH_SYSTEM = [
  {
    type: 'text',
    text:
      "Kamu adalah 'Pelatih AI FinLock' — pendamping nabung yang hangat, suportif, " +
      'dan sedikit jenaka untuk aplikasi FinLock (dompet tabungan disiplin di blockchain Mantle). ' +
      'Di FinLock: sebagian uang DIKUNCI MATI sampai tanggal pilihan pengguna, sisanya boleh ' +
      'dipakai tapi ada batas bulanan, dan pengguna punya 3 jatah darurat per bulan. ' +
      'Tugasmu: beri SATU pesan singkat (maksimal 2 kalimat, bahasa Indonesia santai) yang ' +
      'menyemangati pengguna berdasarkan datanya. Kalau jatah darurat hampir habis atau ia ' +
      'melewati batas, ingatkan dengan LEMBUT tanpa menghakimi. Kalau streak-nya bagus, rayakan. ' +
      'Pakai paling banyak 1-2 emoji. Jawab HANYA dengan pesan itu — tanpa tanda kutip, tanpa ' +
      'penjelasan, tanpa menuliskan proses berpikirmu.',
    cache_control: { type: 'ephemeral' },
  },
]

// ====== Endpoint 1: Pesan Pelatih AI ======
// Web mengirim data tabungan; server membalas satu kalimat penyemangat.
app.post('/api/coach', async (req, res) => {
  try {
    const {
      danaTerkunci = 0, danaPakai = 0, streakHari = 0,
      jatahDarurat = 3, sisaHari = 0, lewatBatas = false,
    } = req.body || {}

    const dataPengguna =
      `Data tabungan pengguna saat ini:\n` +
      `- Dana terkunci: ${danaTerkunci} MNT\n` +
      `- Dana pakai tersisa: ${danaPakai} MNT\n` +
      `- Streak bertahan: ${streakHari} hari\n` +
      `- Sisa jatah darurat bulan ini: ${jatahDarurat} dari 3\n` +
      `- Hari menuju tanggal buka kunci: ${sisaHari} hari\n` +
      `- Baru saja melewati batas pemakaian: ${lewatBatas ? 'ya' : 'tidak'}\n\n` +
      `Beri satu pesan penyemangat yang pas untuk situasi ini.`

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      thinking: { type: 'disabled' }, // tugas ringan -> matikan untuk respons cepat
      system: COACH_SYSTEM,
      messages: [{ role: 'user', content: dataPengguna }],
    })

    const pesan = msg.content.find((b) => b.type === 'text')?.text?.trim() || ''
    res.json({ pesan })
  } catch (err) {
    console.error('Error /api/coach:', err?.status, err?.message)
    res.status(500).json({ error: 'Gagal memanggil Pelatih AI', detail: err?.message, status: err?.status })
  }
})

// ====== Endpoint 2: Saran jumlah kunci ======
// Web mengirim jumlah setoran; server menyarankan berapa yang sebaiknya dikunci.
const SARAN_SYSTEM =
  'Kamu penasihat tabungan FinLock. Diberi jumlah setoran (MNT), sarankan berapa MNT ' +
  'yang sebaiknya DIKUNCI MATI. Aturan: kunci cukup besar untuk komitmen nyata (umumnya ' +
  '50-70% dari setoran), tapi sisakan dana pakai yang cukup. JANGAN pernah menyarankan ' +
  'mengunci 100% setoran. Alasan singkat, hangat, bahasa Indonesia. Balas sesuai skema JSON.'

app.post('/api/suggest-lock', async (req, res) => {
  try {
    const { setoran = 0 } = req.body || {}

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 250,
      thinking: { type: 'disabled' },
      system: SARAN_SYSTEM,
      messages: [{ role: 'user', content: `Setoran pengguna: ${setoran} MNT. Berapa sebaiknya dikunci?` }],
      // Paksa jawaban berbentuk JSON yang rapi & mudah dipakai web.
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              kunci: { type: 'number' },
              alasan: { type: 'string' },
            },
            required: ['kunci', 'alasan'],
            additionalProperties: false,
          },
        },
      },
    })

    const text = msg.content.find((b) => b.type === 'text')?.text || '{}'
    res.json(JSON.parse(text))
  } catch (err) {
    console.error('Error /api/suggest-lock:', err?.message)
    res.status(500).json({ error: 'Gagal meminta saran' })
  }
})

// Cek kesehatan server (buka http://localhost:8787/ di browser untuk tes).
app.get('/', (_req, res) => res.send('FinLock backend hidup ✅'))

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`FinLock backend jalan di http://localhost:${PORT}`))
