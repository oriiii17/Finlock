import { useState, useEffect, useCallback } from 'react'
import './App.css'
import {
  FINLOCK_ADDRESS, MANTLE_SEPOLIA_HEX,
  getContract, bacaAkun, keWei, keMnt,
} from './finlock'

function App() {
  const [akun, setAkun] = useState(null)        // alamat wallet yang terhubung
  const [chainOk, setChainOk] = useState(true)  // apakah di jaringan Mantle Sepolia?
  const [pesan, setPesan] = useState('')        // pesan error/info
  const [data, setData] = useState(null)        // data akun dari blockchain
  const [loading, setLoading] = useState(false) // sedang memuat data?
  const [busy, setBusy] = useState('')          // teks saat transaksi diproses

  // form "buat tabungan"
  const [setoran, setSetoran] = useState('')
  const [kunci, setKunci] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [batas, setBatas] = useState('')
  // input "pakai dana"
  const [jumlahPakai, setJumlahPakai] = useState('')

  // Membaca data akun dari blockchain.
  const muatData = useCallback(async (alamat) => {
    try {
      setLoading(true)
      const d = await bacaAkun(alamat)
      setData(d)
    } catch (err) {
      setPesan('Gagal membaca data dari blockchain: ' + pesanError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // ====== Menghubungkan MetaMask ======
  async function hubungkanWallet() {
    setPesan('')
    if (!window.ethereum) {
      setPesan('MetaMask tidak ditemukan. Pasang ekstensi MetaMask dulu, ya.')
      return
    }
    try {
      const akunList = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chain = await window.ethereum.request({ method: 'eth_chainId' })
      setAkun(akunList[0])
      setChainOk(chain === MANTLE_SEPOLIA_HEX)
      if (chain === MANTLE_SEPOLIA_HEX) muatData(akunList[0])
    } catch (err) {
      setPesan('Koneksi dibatalkan atau gagal: ' + pesanError(err))
    }
  }

  async function pindahKeMantle() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_SEPOLIA_HEX }],
      })
      setChainOk(true)
      if (akun) muatData(akun)
    } catch {
      setPesan('Gagal pindah jaringan. Pastikan Mantle Sepolia sudah ditambahkan di MetaMask.')
    }
  }

  useEffect(() => {
    if (!window.ethereum) return
    const onAccounts = (a) => { setAkun(a[0] || null); if (a[0]) muatData(a[0]); else setData(null) }
    const onChain = (c) => setChainOk(c === MANTLE_SEPOLIA_HEX)
    window.ethereum.on('accountsChanged', onAccounts)
    window.ethereum.on('chainChanged', onChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts)
      window.ethereum.removeListener('chainChanged', onChain)
    }
  }, [muatData])

  // ====== Aksi yang mengubah blockchain ======

  // Buat tabungan terkunci (setor + kunci).
  async function buatTabungan() {
    setPesan('')
    const s = parseFloat(setoran), k = parseFloat(kunci), b = parseFloat(batas || '0')
    // Validasi sederhana sebelum kirim ke blockchain.
    if (!s || s <= 0) return setPesan('Isi jumlah setoran yang benar.')
    if (!k || k <= 0) return setPesan('Jumlah dikunci tidak boleh nol.')
    if (k > s) return setPesan('Jumlah dikunci tidak boleh melebihi setoran.')
    if (!tanggal) return setPesan('Pilih tanggal buka kunci.')
    const waktuBuka = Math.floor(new Date(tanggal).getTime() / 1000)
    if (waktuBuka <= Math.floor(Date.now() / 1000)) return setPesan('Tanggal buka harus di masa depan.')

    try {
      setBusy('Membuka MetaMask untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.buatAkun(keWei(k), waktuBuka, keWei(b), { value: keWei(s) })
      setBusy('Menunggu konfirmasi blockchain… (beberapa detik)')
      await tx.wait()
      setBusy('')
      setPesan('✅ Berhasil! Uangmu sudah terkunci di blockchain.')
      muatData(akun)
    } catch (err) {
      setBusy('')
      setPesan('Gagal: ' + pesanError(err))
    }
  }

  // Pakai sebagian dana pakai.
  async function pakaiDana() {
    setPesan('')
    const j = parseFloat(jumlahPakai)
    if (!j || j <= 0) return setPesan('Isi jumlah yang ingin dipakai.')
    try {
      setBusy('Membuka MetaMask untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.pakaiDana(keWei(j))
      setBusy('Menunggu konfirmasi blockchain…')
      await tx.wait()
      setBusy('')
      setJumlahPakai('')
      setPesan('✅ Dana berhasil dipakai.')
      muatData(akun)
    } catch (err) {
      setBusy('')
      setPesan('Gagal: ' + pesanError(err))
    }
  }

  // Tarik dana terkunci (hanya berhasil bila tanggal buka sudah lewat).
  async function tarikTerkunci() {
    setPesan('')
    try {
      setBusy('Membuka MetaMask untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.tarikDanaTerkunci()
      setBusy('Menunggu konfirmasi blockchain…')
      await tx.wait()
      setBusy('')
      setPesan('✅ Dana terkunci berhasil ditarik!')
      muatData(akun)
    } catch (err) {
      setBusy('')
      setPesan('Gagal: ' + pesanError(err))
    }
  }

  const alamatPendek = akun ? akun.slice(0, 6) + '…' + akun.slice(-4) : ''

  return (
    <div className="app">
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
            <button className="btn-primary" onClick={hubungkanWallet}>🦊 Mulai — Hubungkan Wallet</button>
          </div>
        )}
        <div className="feature-pills">
          <span className="feature-pill"><span className="ic">🔒</span> Tak bisa dicurangi</span>
          <span className="feature-pill"><span className="ic">🤖</span> Pelatih AI pribadi</span>
          <span className="feature-pill"><span className="ic">🔥</span> Streak harian</span>
          <span className="feature-pill"><span className="ic">⛓️</span> Di atas Mantle</span>
        </div>
      </section>

      {akun && (
        <main className="card">
          {pesan && (
            <div className="notice" style={pesan.startsWith('✅') ? { background: 'rgba(94,234,212,0.1)', borderColor: 'rgba(94,234,212,0.45)', color: '#a7f3e8' } : undefined}>
              {pesan}
            </div>
          )}
          {busy && <div className="notice" style={{ background: 'rgba(94,234,212,0.1)', borderColor: 'rgba(94,234,212,0.4)', color: '#a7f3e8' }}>⏳ {busy}</div>}

          {!chainOk && (
            <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span>⚠️ Kamu belum di jaringan Mantle Sepolia.</span>
              <button className="btn-ghost" onClick={pindahKeMantle}>Pindah ke Mantle</button>
            </div>
          )}

          {loading ? (
            <p className="subtitle">⏳ Memuat data dari blockchain…</p>
          ) : data && data.aktif ? (
            <Dashboard data={data} busy={busy}
              jumlahPakai={jumlahPakai} setJumlahPakai={setJumlahPakai}
              pakaiDana={pakaiDana} tarikTerkunci={tarikTerkunci} />
          ) : (
            <>
              <h2>Buat Tabungan Terkunci 🔒</h2>
              <p className="subtitle">Setor MNT, tentukan berapa yang dikunci & sampai kapan. Aturannya dijaga blockchain.</p>

              <div className="field">
                <label>💰 Jumlah setoran (MNT)</label>
                <input type="number" value={setoran} onChange={(e) => setSetoran(e.target.value)} placeholder="contoh: 10" />
                <div className="hint">Total uang yang kamu masukkan ke FinLock.</div>
              </div>
              <div className="field">
                <label>🔒 Jumlah dikunci mati (MNT)</label>
                <input type="number" value={kunci} onChange={(e) => setKunci(e.target.value)} placeholder="contoh: 6" />
                <div className="hint">Tidak boleh nol. Tidak bisa diambil sampai tanggal di bawah.</div>
              </div>
              <div className="field">
                <label>📅 Tanggal buka kunci</label>
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                <div className="hint">Dana terkunci baru bisa ditarik mulai tanggal ini.</div>
              </div>
              <div className="field">
                <label>💸 Batas pakai per bulan (MNT)</label>
                <input type="number" value={batas} onChange={(e) => setBatas(e.target.value)} placeholder="contoh: 2" />
                <div className="hint">Lewat batas? Kamu punya 3 jatah darurat / bulan.</div>
              </div>

              <button className="btn-primary btn-block" onClick={buatTabungan} disabled={!!busy || !chainOk}>
                {busy ? '⏳ Memproses…' : '🔒 Kunci Sekarang'}
              </button>
            </>
          )}
        </main>
      )}

      <p className="foot">
        Smart contract live di Mantle Sepolia ·{' '}
        <a href={`https://sepolia.mantlescan.xyz/address/${FINLOCK_ADDRESS}`} target="_blank" rel="noreferrer">lihat di explorer ↗</a>
      </p>
    </div>
  )
}

// Cincin progress (SVG) menuju tanggal buka.
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
      <circle cx="64" cy="64" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={keliling} strokeDashoffset={offset} transform="rotate(-90 64 64)" />
      <text className="ring-text" x="64" y="60" textAnchor="middle" fontSize="26">{persen}%</text>
      <text className="ring-sub" x="64" y="80" textAnchor="middle" fontSize="11">terkunci</text>
    </svg>
  )
}

// Dashboard dengan DATA ASLI dari blockchain.
function Dashboard({ data, busy, jumlahPakai, setJumlahPakai, pakaiDana, tarikTerkunci }) {
  const sekarang = Math.floor(Date.now() / 1000)
  const total = Math.max(1, data.waktuBuka - data.waktuMulai)
  const lewat = Math.min(total, Math.max(0, sekarang - data.waktuMulai))
  const persen = Math.round((lewat / total) * 100)
  const bisaTarik = sekarang >= data.waktuBuka
  const sisaHari = Math.max(0, Math.ceil((data.waktuBuka - sekarang) / 86400))
  const tglBuka = new Date(data.waktuBuka * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <h2>Tabunganku 🔒</h2>
      <p className="subtitle">Data ini diambil langsung dari blockchain Mantle.</p>

      <div className="lock-hero">
        <ProgressRing persen={persen} />
        <div className="info">
          <div className="label">🔒 Dana Terkunci</div>
          <div className="amount">{keMnt(data.danaTerkunci)} <small>MNT</small></div>
          <div className="meta">
            {bisaTarik ? '🎉 Sudah bisa ditarik!' : `Terbuka pada ${tglBuka} · tinggal ${sisaHari} hari lagi 💪`}
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">💸 Dana Pakai</div>
          <div className="value">{keMnt(data.danaPakai)} <small>MNT</small></div>
        </div>
        <div className="stat streak">
          <div className="label">🔥 Streak Bertahan</div>
          <div className="value">{data.hariBertahan} <small>hari</small></div>
        </div>
        <div className="stat">
          <div className="label">🆘 Jatah Darurat</div>
          <div className="value">{data.jatahDarurat}<small>/3 bulan ini</small></div>
          <div className="claims">
            {[0, 1, 2].map((i) => (
              <span key={i} className={'claim-dot' + (i < data.jatahDarurat ? ' on' : '')} />
            ))}
          </div>
        </div>
      </div>

      <div className="coach">
        <span className="avatar">🤖</span>
        <div className="bubble">
          <div className="who">Pelatih AI FinLock</div>
          <div className="msg">
            {bisaTarik
              ? `Mantap! Komitmenmu tercapai 🎉 Uangmu bertahan ${data.hariBertahan} hari. Kamu bisa tarik dana terkunci sekarang.`
              : `Uangmu sudah bertahan ${data.hariBertahan} hari! 💪 Sisa ${sisaHari} hari menuju target. Tahan, kamu pasti bisa. (Pelatih AI cerdas hadir di Tahap 4!)`}
          </div>
        </div>
      </div>

      <div className="field" style={{ marginTop: 8 }}>
        <label>💸 Pakai dana (MNT)</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="number" value={jumlahPakai} onChange={(e) => setJumlahPakai(e.target.value)} placeholder="contoh: 1" />
          <button className="btn-ghost" onClick={pakaiDana} disabled={!!busy} style={{ flexShrink: 0 }}>Pakai</button>
        </div>
        <div className="hint">Lewat batas bulanan akan memotong 1 jatah darurat.</div>
      </div>

      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn-danger" onClick={tarikTerkunci} disabled={!!busy || !bisaTarik}
          title={bisaTarik ? '' : 'Belum waktunya — masih terkunci'}>
          {bisaTarik ? '🔓 Tarik Terkunci' : '🔒 Terkunci sampai ' + tglBuka}
        </button>
      </div>
    </>
  )
}

// Mengubah error blockchain yang teknis jadi pesan yang lebih ramah.
function pesanError(err) {
  return err?.reason || err?.shortMessage || err?.info?.error?.message || err?.message || 'terjadi kesalahan'
}

export default App
