import { useState, useEffect } from 'react'
import './App.css'

// Alamat FinLock yang sudah kita deploy di Mantle Sepolia (Tahap 1).
const FINLOCK_ADDRESS = '0xe53E3149C2F84DbB6916e8E00593E6310aeE621a'
// Mantle Sepolia: chain id 5003 = 0x138b dalam heksadesimal.
const MANTLE_SEPOLIA_HEX = '0x138b'

function App() {
  const [akun, setAkun] = useState(null)        // alamat wallet yang terhubung
  const [chainOk, setChainOk] = useState(true)  // apakah di jaringan Mantle Sepolia?
  const [pesan, setPesan] = useState('')        // pesan error/info
  const [preview, setPreview] = useState(false) // pratinjau tampilan dashboard (contoh)

  // ====== Menghubungkan MetaMask ======
  async function hubungkanWallet() {
    setPesan('')
    if (!window.ethereum) {
      setPesan('MetaMask tidak ditemukan. Pasang ekstensi MetaMask dulu, ya.')
      return
    }
    try {
      const akunList = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAkun(akunList[0])
      const chain = await window.ethereum.request({ method: 'eth_chainId' })
      setChainOk(chain === MANTLE_SEPOLIA_HEX)
    } catch (err) {
      setPesan('Koneksi dibatalkan atau gagal: ' + (err?.message || ''))
    }
  }

  async function pindahKeMantle() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_SEPOLIA_HEX }],
      })
      setChainOk(true)
    } catch (err) {
      setPesan('Gagal pindah jaringan. Pastikan Mantle Sepolia sudah ditambahkan di MetaMask.')
    }
  }

  useEffect(() => {
    if (!window.ethereum) return
    const onAccounts = (a) => setAkun(a[0] || null)
    const onChain = (c) => setChainOk(c === MANTLE_SEPOLIA_HEX)
    window.ethereum.on('accountsChanged', onAccounts)
    window.ethereum.on('chainChanged', onChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts)
      window.ethereum.removeListener('chainChanged', onChain)
    }
  }, [])

  const alamatPendek = akun ? akun.slice(0, 6) + '…' + akun.slice(-4) : ''

  return (
    <div className="app">
      {/* ===== Header ===== */}
      <header className="header">
        <div className="logo">
          <span className="mark">🔒</span>
          <span className="brand">Fin<b>Lock</b></span>
        </div>
        {akun ? (
          <span className="wallet-chip"><span className="dot" /> {alamatPendek}</span>
        ) : (
          <button className="btn-primary" onClick={hubungkanWallet}>Connect Wallet</button>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="hero-badge">🏆 Mantle Turing Test Hackathon 2026</div>
        <h1>Kunci uangmu.<br /><span className="grad">Lindungi dirimu sendiri.</span></h1>
        <p>
          FinLock mengunci sebagian tabunganmu di blockchain sampai tanggal yang
          kamu pilih — tak bisa diganggu gugat, bahkan olehmu sendiri. Sisanya boleh
          dipakai, tapi dibatasi, dengan hanya 3 jatah darurat per bulan.
        </p>
        {!akun && (
          <div className="cta-row">
            <button className="btn-primary" onClick={hubungkanWallet}>
              🦊 Mulai — Hubungkan Wallet
            </button>
          </div>
        )}

        <div className="feature-pills">
          <span className="feature-pill"><span className="ic">🔒</span> Tak bisa dicurangi</span>
          <span className="feature-pill"><span className="ic">🤖</span> Pelatih AI pribadi</span>
          <span className="feature-pill"><span className="ic">🔥</span> Streak harian</span>
          <span className="feature-pill"><span className="ic">⛓️</span> Di atas Mantle</span>
        </div>
      </section>

      {/* ===== Isi utama ===== */}
      {akun && (
        <main className="card">
          {pesan && <div className="notice">{pesan}</div>}

          {!chainOk && (
            <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span>⚠️ Kamu belum di jaringan Mantle Sepolia.</span>
              <button className="btn-ghost" onClick={pindahKeMantle}>Pindah ke Mantle</button>
            </div>
          )}

          {!preview ? (
            <>
              <h2>Buat Tabungan Terkunci 🔒</h2>
              <p className="subtitle">
                Setor MNT, tentukan berapa yang dikunci & sampai kapan. (Pengiriman ke
                blockchain akan diaktifkan di tahap berikutnya.)
              </p>

              <div className="field">
                <label>💰 Jumlah setoran (MNT)</label>
                <input type="number" placeholder="contoh: 10" />
                <div className="hint">Total uang yang kamu masukkan ke FinLock.</div>
              </div>

              <div className="field">
                <label>🔒 Jumlah dikunci mati (MNT)</label>
                <input type="number" placeholder="contoh: 6" />
                <div className="hint">Tidak boleh nol. Tidak bisa diambil sampai tanggal di bawah.</div>
              </div>

              <div className="field">
                <label>📅 Tanggal buka kunci</label>
                <input type="date" />
                <div className="hint">Dana terkunci baru bisa ditarik mulai tanggal ini.</div>
              </div>

              <div className="field">
                <label>💸 Batas pakai per bulan (MNT)</label>
                <input type="number" placeholder="contoh: 2" />
                <div className="hint">Lewat batas? Kamu punya 3 jatah darurat / bulan.</div>
              </div>

              <button className="btn-primary btn-block" disabled title="Aktif di Tahap 3">
                Kunci Sekarang (segera aktif)
              </button>

              <p className="foot">
                Mau lihat tampilan dashboard-nya?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setPreview(true) }}>
                  Lihat pratinjau (contoh) →
                </a>
              </p>
            </>
          ) : (
            <DashboardPratinjau kembali={() => setPreview(false)} />
          )}
        </main>
      )}

      <p className="foot">
        Smart contract live di Mantle Sepolia ·{' '}
        <a href={`https://sepolia.mantlescan.xyz/address/${FINLOCK_ADDRESS}`} target="_blank" rel="noreferrer">
          lihat di explorer ↗
        </a>
      </p>
    </div>
  )
}

// Cincin progress (SVG) — menunjukkan seberapa jauh menuju tanggal buka.
function ProgressRing({ persen }) {
  const r = 52
  const keliling = 2 * Math.PI * r
  const offset = keliling * (1 - persen / 100)
  return (
    <svg className="ring" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(120,140,170,0.15)" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={keliling} strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
      />
      <text className="ring-text" x="64" y="60" textAnchor="middle" fontSize="26">{persen}%</text>
      <text className="ring-sub" x="64" y="80" textAnchor="middle" fontSize="11">terkunci</text>
    </svg>
  )
}

// Tampilan dashboard CONTOH (data dummy). Data asli disambung dari contract di Tahap 3.
function DashboardPratinjau({ kembali }) {
  const jatahTersisa = 2 // contoh
  return (
    <>
      <h2>Tabunganku 🔒</h2>
      <p className="subtitle">Ini contoh tampilan (data dummy) — bukan data asli.</p>

      {/* Hero stat: Dana Terkunci + cincin progress menuju tanggal buka */}
      <div className="lock-hero">
        <ProgressRing persen={70} />
        <div className="info">
          <div className="label">🔒 Dana Terkunci</div>
          <div className="amount">6.0 <small>MNT</small></div>
          <div className="meta">Terbuka pada 5 Jul 2026 · tinggal 7 hari lagi 💪</div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">💸 Dana Pakai</div>
          <div className="value">3.5 <small>MNT</small></div>
        </div>
        <div className="stat streak">
          <div className="label">🔥 Streak Bertahan</div>
          <div className="value">23 <small>hari</small></div>
        </div>
        <div className="stat">
          <div className="label">🆘 Jatah Darurat</div>
          <div className="value">{jatahTersisa}<small>/3 bulan ini</small></div>
          <div className="claims">
            {[0, 1, 2].map((i) => (
              <span key={i} className={'claim-dot' + (i < jatahTersisa ? ' on' : '')} />
            ))}
          </div>
        </div>
      </div>

      <div className="coach">
        <span className="avatar">🤖</span>
        <div className="bubble">
          <div className="who">Pelatih AI FinLock</div>
          <div className="msg">
            "Wow, uangmu sudah bertahan 23 hari! 💪 Kamu masih punya 2 jatah darurat —
            tahan sedikit lagi, target bukamu tinggal 7 hari lagi."
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn-ghost" disabled>💸 Pakai Dana</button>
        <button className="btn-danger" disabled>🔓 Tarik Terkunci</button>
      </div>

      <p className="foot">
        <a href="#" onClick={(e) => { e.preventDefault(); kembali() }}>← kembali ke form</a>
      </p>
    </>
  )
}

export default App
