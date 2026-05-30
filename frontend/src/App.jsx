import { useState, useEffect, useCallback } from 'react'
import './App.css'
import {
  FINLOCK_ADDRESS, MANTLE_SEPOLIA_HEX,
  getContract, bacaAkun, bacaRiwayat, keWei, keMnt,
  setActiveProvider, getInjected,
} from './finlock'
import { pesanPelatih, saranKunci } from './coach'
import {
  Lock, LockOpen, Wallet, TrendingUp, Flame, ShieldAlert, Sparkles,
  Target, PartyPopper, Eye, AlertTriangle, Calendar, Sprout, LogOut,
  Coins, History, PlusCircle, MinusCircle, Sparkle, Landmark, ShieldCheck, Bitcoin,
} from 'lucide-react'

// Logo FinLock (gembok + panah ke atas = "kunci + tumbuh").
function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="flg" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#5eead4" /><stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#flg)" />
      <path d="M16.5 21.5 V17.5 a7.5 7.5 0 0 1 15 0 V21.5" fill="none" stroke="#04201c" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="12.5" y="21" width="23" height="16" rx="4.5" fill="#04201c" />
      <path d="M24 26.5 v6.4 M24 26.5 l-3 3 M24 26.5 l3 3" fill="none" stroke="#5eead4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Logo X (Twitter) yang benar — bukan burung.
function XLogo({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const COACH_ICON = { party: PartyPopper, flame: Flame, sprout: Sprout, target: Target, calendar: Calendar, alert: AlertTriangle, eye: Eye, sos: ShieldAlert }

function App() {
  const [akun, setAkun] = useState(null)
  const [chainOk, setChainOk] = useState(true)
  const [pesan, setPesan] = useState('')
  const [data, setData] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')

  const [setoran, setSetoran] = useState('')
  const [kunci, setKunci] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [batas, setBatas] = useState('')
  const [saran, setSaran] = useState('')
  const [jumlahPakai, setJumlahPakai] = useState('')

  const [wallets, setWallets] = useState([])
  const [pilihWallet, setPilihWallet] = useState(false)

  const muatData = useCallback(async (alamat) => {
    try {
      setLoading(true)
      const d = await bacaAkun(alamat)
      setData(d)
      if (d.aktif) bacaRiwayat(alamat).then(setRiwayat).catch(() => setRiwayat([]))
    } catch (err) {
      setPesan('Gagal membaca data dari blockchain: ' + pesanError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const found = []
    const onAnnounce = (e) => {
      const d = e.detail
      if (!found.some((w) => w.info.uuid === d.info.uuid)) {
        found.push({ info: d.info, provider: d.provider })
        setWallets([...found])
      }
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    return () => window.removeEventListener('eip6963:announceProvider', onAnnounce)
  }, [])

  function hubungkanWallet() {
    setPesan('')
    if (wallets.length > 1) return setPilihWallet(true)
    if (wallets.length === 1) return konekDengan(wallets[0].provider)
    if (window.ethereum) return konekDengan(window.ethereum)
    setPesan('Tidak ada wallet terpasang. Install wallet seperti MetaMask, Rabby, atau OKX dulu, ya.')
  }

  async function konekDengan(provider) {
    setPilihWallet(false)
    setPesan('')
    try {
      setActiveProvider(provider)
      const akunList = await provider.request({ method: 'eth_requestAccounts' })
      const chain = await provider.request({ method: 'eth_chainId' })
      setAkun(akunList[0])
      setChainOk(chain === MANTLE_SEPOLIA_HEX)
      provider.on?.('accountsChanged', (a) => { setAkun(a[0] || null); if (a[0]) muatData(a[0]); else setData(null) })
      provider.on?.('chainChanged', (c) => setChainOk(c === MANTLE_SEPOLIA_HEX))
      if (chain === MANTLE_SEPOLIA_HEX) muatData(akunList[0])
    } catch (err) {
      setPesan('Koneksi dibatalkan atau gagal: ' + pesanError(err))
    }
  }

  async function pindahKeMantle() {
    try {
      await getInjected().request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MANTLE_SEPOLIA_HEX }] })
      setChainOk(true)
      if (akun) muatData(akun)
    } catch {
      setPesan('Gagal pindah jaringan. Pastikan Mantle Sepolia sudah ditambahkan di wallet-mu.')
    }
  }

  function sarankanKunci() {
    const s = parseFloat(setoran)
    if (!s || s <= 0) return setPesan('Isi jumlah setoran dulu untuk dapat saran.')
    const { kunci: k, alasan } = saranKunci(s)
    setKunci(String(k))
    setSaran(alasan)
  }

  async function buatTabungan() {
    setPesan('')
    const s = parseFloat(setoran), k = parseFloat(kunci), b = parseFloat(batas || '0')
    if (!s || s <= 0) return setPesan('Isi jumlah setoran yang benar.')
    if (!k || k <= 0) return setPesan('Jumlah dikunci tidak boleh nol.')
    if (k > s) return setPesan('Jumlah dikunci tidak boleh melebihi setoran.')
    if (!tanggal) return setPesan('Pilih tanggal buka kunci.')
    const waktuBuka = Math.floor(new Date(tanggal).getTime() / 1000)
    if (waktuBuka <= Math.floor(Date.now() / 1000)) return setPesan('Tanggal buka harus di masa depan.')
    try {
      setBusy('Membuka wallet untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.buatAkun(keWei(k), waktuBuka, keWei(b), { value: keWei(s) })
      setBusy('Menunggu konfirmasi blockchain… (beberapa detik)')
      await tx.wait()
      setBusy('')
      setData(null); setAkun(null)
      setPesan('✅ Registrasi berhasil! Silakan login untuk masuk ke dashboard.')
    } catch (err) { setBusy(''); setPesan('Gagal: ' + pesanError(err)) }
  }

  async function pakaiDana() {
    setPesan('')
    const j = parseFloat(jumlahPakai)
    if (!j || j <= 0) return setPesan('Isi jumlah yang ingin dipakai.')
    try {
      setBusy('Membuka wallet untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.pakaiDana(keWei(j))
      setBusy('Menunggu konfirmasi blockchain…')
      await tx.wait()
      setBusy(''); setJumlahPakai(''); setPesan('✅ Dana berhasil dipakai.')
      muatData(akun)
    } catch (err) { setBusy(''); setPesan('Gagal: ' + pesanError(err)) }
  }

  async function tambahDana(setoranStr, keKunciStr) {
    setPesan('')
    const s = parseFloat(setoranStr), k = parseFloat(keKunciStr || '0')
    if (!s || s <= 0) return setPesan('Isi jumlah setoran.')
    if (k > s) return setPesan('Porsi kunci tidak boleh melebihi setoran.')
    try {
      setBusy('Membuka wallet untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.tambahDana(keWei(k), { value: keWei(s) })
      setBusy('Menunggu konfirmasi blockchain…')
      await tx.wait()
      setBusy(''); setPesan('✅ Dana berhasil ditambahkan.')
      muatData(akun)
    } catch (err) { setBusy(''); setPesan('Gagal: ' + pesanError(err)) }
  }

  async function tarikTerkunci() {
    setPesan('')
    try {
      setBusy('Membuka wallet untuk tanda tangan…')
      const c = await getContract(true)
      const tx = await c.tarikDanaTerkunci()
      setBusy('Menunggu konfirmasi blockchain…')
      await tx.wait()
      setBusy(''); setPesan('✅ Dana terkunci berhasil ditarik!')
      muatData(akun)
    } catch (err) { setBusy(''); setPesan('Gagal: ' + pesanError(err)) }
  }

  function bagikanKeX(hari) {
    let pembuka
    if (hari >= 30) pembuka = `🔥 ${hari} hari uangku terkunci & utuh di FinLock — disiplin level dewa!`
    else if (hari >= 7) pembuka = `💪 Sudah ${hari} hari aku tahan godaan, uangku terkunci aman di FinLock.`
    else pembuka = `🔒 Aku mulai mengunci tabunganku di FinLock — dompet yang melindungiku dari diriku sendiri.`
    const teks = `${pembuka}\n\nDi atas blockchain @0xMantle, gak bisa dicurangi bahkan oleh diriku sendiri. Berani coba & tahan lebih lama dariku? 👀`
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(teks + '\n\n#MantleAIHackathon'), '_blank', 'noopener')
  }

  function keluar() { setAkun(null); setData(null); setRiwayat([]); setPesan('') }

  const alamatPendek = akun ? akun.slice(0, 6) + '…' + akun.slice(-4) : ''

  // ===== LAYAR LOGIN =====
  if (!akun) {
    return (
      <div className="landing">
        <div className="landing-inner">
          <div className="landing-logo"><Logo size={76} /></div>
          <h1>Fin<b>Lock</b></h1>
          <p className="tagline">Kunci uangmu.<br />Lindungi dirimu sendiri.</p>
          {pesan && <div className={'notice' + (pesan.startsWith('✅') ? ' ok' : '')}>{pesan}</div>}
          <button className="btn-primary btn-block" onClick={hubungkanWallet}><Wallet size={18} /> Login dengan Wallet</button>
        </div>

        {pilihWallet && (
          <div className="picker-overlay" onClick={() => setPilihWallet(false)}>
            <div className="picker" onClick={(e) => e.stopPropagation()}>
              <h3>Pilih Wallet</h3>
              {wallets.map((w) => (
                <button key={w.info.uuid} className="picker-item" onClick={() => konekDengan(w.provider)}>
                  <img src={w.info.icon} alt="" width="28" height="28" />
                  <span>{w.info.name}</span>
                </button>
              ))}
              <button className="picker-cancel" onClick={() => setPilihWallet(false)}>Batal</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===== APP =====
  return (
    <div className="app-wrap">
      <header className="topbar">
        <div className="bank-brand"><Logo size={34} /><span>Fin<b>Lock</b></span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wallet-chip"><span className="dot" /> {alamatPendek}</span>
          <button className="btn-icon" onClick={keluar} title="Keluar"><LogOut size={16} /> Keluar</button>
        </div>
      </header>
      <main className="content">
        {pesan && <div className={'notice' + (pesan.startsWith('✅') ? ' ok' : '')}>{pesan}</div>}
        {busy && <div className="notice ok">⏳ {busy}</div>}
        {!chainOk && (
          <div className="notice row">
            <span>Belum di jaringan Mantle Sepolia.</span>
            <button className="btn-ghost" onClick={pindahKeMantle}>Pindah</button>
          </div>
        )}

        {loading ? (
          <SkeletonDash />
        ) : data && data.aktif ? (
          <Dashboard data={data} riwayat={riwayat} busy={busy}
            jumlahPakai={jumlahPakai} setJumlahPakai={setJumlahPakai}
            pakaiDana={pakaiDana} tambahDana={tambahDana} tarikTerkunci={tarikTerkunci} bagikanKeX={bagikanKeX} />
        ) : (
          <div className="form-narrow">
            <h2 className="section-title">Daftar Akun FinLock</h2>
            <p className="section-sub">Akun barumu = tabungan terkunci pertamamu. Atur lalu daftar.</p>
            <div className="field">
              <label>Jumlah setoran (MNT)</label>
              <input type="number" value={setoran} onChange={(e) => setSetoran(e.target.value)} placeholder="contoh: 10" />
            </div>
            <div className="field">
              <label>Jumlah dikunci mati (MNT)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" value={kunci} onChange={(e) => setKunci(e.target.value)} placeholder="contoh: 6" />
                <button type="button" className="btn-ghost" onClick={sarankanKunci} style={{ flexShrink: 0 }}><Sparkle size={16} /> Saran</button>
              </div>
              <div className="hint">{saran || 'Tidak boleh nol. Tak bisa diambil sampai tanggal di bawah.'}</div>
            </div>
            <div className="field">
              <label>Tanggal buka kunci</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="field">
              <label>Batas pakai per bulan (MNT)</label>
              <input type="number" value={batas} onChange={(e) => setBatas(e.target.value)} placeholder="contoh: 2" />
              <div className="hint">Lewat batas? Kamu punya 3 jatah darurat / bulan.</div>
            </div>
            <button className="btn-primary btn-block" onClick={buatTabungan} disabled={!!busy || !chainOk}>
              {busy ? 'Memproses…' : 'Daftar Sekarang'}
            </button>
            <p className="foot"><a href="#" onClick={(e) => { e.preventDefault(); keluar() }}>← Kembali ke login</a></p>
          </div>
        )}

        <p className="foot">
          <a href={`https://sepolia.mantlescan.xyz/address/${FINLOCK_ADDRESS}`} target="_blank" rel="noreferrer">Lihat kontrak di explorer ↗</a>
        </p>
      </main>
    </div>
  )
}

// ===== Dashboard =====
function Dashboard({ data, riwayat, busy, jumlahPakai, setJumlahPakai, pakaiDana, tambahDana, tarikTerkunci, bagikanKeX }) {
  const [panel, setPanel] = useState(null) // 'pakai' | 'tambah' | null
  const [tSetor, setTSetor] = useState('')
  const [tKunci, setTKunci] = useState('')

  const sekarang = Math.floor(Date.now() / 1000)
  const lockedN = parseFloat(keMnt(data.danaTerkunci))
  const spendN = parseFloat(keMnt(data.danaPakai))
  const totalN = Math.round((lockedN + spendN) * 1e6) / 1e6
  const total = Math.max(1, data.waktuBuka - data.waktuMulai)
  const lewat = Math.min(total, Math.max(0, sekarang - data.waktuMulai))
  const persen = Math.round((lewat / total) * 100)
  const bisaTarik = sekarang >= data.waktuBuka
  const sisaHari = Math.max(0, Math.ceil((data.waktuBuka - sekarang) / 86400))
  const tglBuka = new Date(data.waktuBuka * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  const coach = pesanPelatih({ streakHari: data.hariBertahan, jatahDarurat: data.jatahDarurat, sisaHari, lewatBatas: false, bisaTarik })
  const terpakaiN = parseFloat(keMnt(data.terpakaiBulanIni))
  const batasN = parseFloat(keMnt(data.batasBulanan))
  const milestone = [7, 14, 30, 60, 100, 365].includes(data.hariBertahan)

  // Alokasi strategi (yield): 70% lending (nilai live dari vault), 20% cadangan, 10% BTC (simulasi).
  const lendPokok = parseFloat(keMnt(data.vaultPokok || 0n))
  const lendNilai = parseFloat(keMnt(data.vaultNilai || 0n))
  const lendYield = Math.max(0, lendNilai - lendPokok)
  const ditahanN = parseFloat(keMnt(data.ditahan || 0n))
  const reserveN = Math.round((ditahanN * 2 / 3) * 1e6) / 1e6
  const btcN = Math.round((ditahanN - reserveN) * 1e6) / 1e6

  // Harga BTC live dari CoinGecko (untuk bagian simulasi BTC).
  const [btcUsd, setBtcUsd] = useState(null)
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then((r) => r.json()).then((d) => setBtcUsd(d?.bitcoin?.usd)).catch(() => {})
  }, [])

  // Pesan AI asli dari Gemini (lewat backend). Backend mati -> pakai rule-based.
  const [aiPesan, setAiPesan] = useState('')
  useEffect(() => {
    let batal = false
    fetch('/api/coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        danaTerkunci: lockedN, danaPakai: spendN, streakHari: data.hariBertahan,
        jatahDarurat: data.jatahDarurat, sisaHari, lewatBatas: false,
        terpakai: terpakaiN, batas: batasN,
      }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!batal && d?.pesan) setAiPesan(d.pesan) }).catch(() => {})
    return () => { batal = true }
  }, [data, sisaHari, lockedN, spendN, terpakaiN, batasN])

  return (
    <div className="dash">
      {milestone && (
        <div className="milestone">
          <span>🎉 Milestone {data.hariBertahan} hari! Pamerkan pencapaianmu.</span>
          <button className="btn-ghost" onClick={() => bagikanKeX(data.hariBertahan)}>Bagikan ke X</button>
        </div>
      )}
      {/* Kartu saldo */}
      <div className="balance-card">
        <Lock className="bc-watermark" size={150} strokeWidth={1} />
        <div className="bc-label">Total Tabungan</div>
        <div className="bc-amount">{totalN} <span>MNT</span></div>
        <div className="bc-split">
          <div className="item"><Lock size={14} /> Terkunci <b>{lockedN} MNT</b></div>
          <div className="item"><Coins size={14} /> Bisa dipakai <b>{spendN} MNT</b></div>
        </div>
        <div className="bc-bar"><span style={{ width: persen + '%' }} /></div>
        <div className="bc-foot">
          {bisaTarik ? 'Dana terkunci sudah bisa ditarik!' : `Terbuka ${tglBuka} · ${sisaHari} hari lagi · ${persen}% masa kunci`}
        </div>
      </div>

      {/* Strategi Pertumbuhan: dana terkunci tidak diam, tapi bekerja */}
      <div className="strategy-card">
        <div className="hist-head"><TrendingUp size={17} /> Strategi Pertumbuhan <span className="ai-tag">dana bekerja</span></div>
        <div className="strat-grid">
          <div className="strat lend">
            <div className="strat-top"><Landmark size={16} /> Lending <span>70%</span></div>
            <div className="strat-val">{lendNilai.toFixed(4)} <small>MNT</small></div>
            <div className="strat-grow">+{lendYield.toFixed(6)} bunga · 8% APR</div>
            <div className="strat-sub">pokok {lendPokok.toFixed(4)} · di YieldVault (on-chain)</div>
          </div>
          <div className="strat">
            <div className="strat-top"><ShieldCheck size={16} /> Cadangan <span>20%</span></div>
            <div className="strat-val">{reserveN.toFixed(4)} <small>MNT</small></div>
            <div className="strat-sub">aman & likuid</div>
          </div>
          <div className="strat btc">
            <div className="strat-top"><Bitcoin size={16} /> BTC <span>10% · simulasi</span></div>
            <div className="strat-val">{btcN.toFixed(4)} <small>MNT</small></div>
            <div className="strat-sub">{btcUsd ? `BTC $${btcUsd.toLocaleString()}` : 'harga BTC…'} · buyback saat turun</div>
          </div>
        </div>
      </div>

      {/* Aksi cepat */}
      <div className="quick-actions">
        <button className="qa" onClick={() => setPanel((p) => (p === 'tambah' ? null : 'tambah'))} disabled={!!busy}>
          <span className="ic"><PlusCircle size={19} /></span> Tambah
        </button>
        <button className="qa" onClick={() => setPanel((p) => (p === 'pakai' ? null : 'pakai'))} disabled={!!busy}>
          <span className="ic"><Coins size={19} /></span> Pakai
        </button>
        <button className="qa danger" onClick={tarikTerkunci} disabled={!!busy || !bisaTarik} title={bisaTarik ? '' : 'Masih terkunci'}>
          <span className="ic">{bisaTarik ? <LockOpen size={19} /> : <Lock size={19} />}</span> Tarik
        </button>
        <button className="qa" onClick={() => bagikanKeX(data.hariBertahan)}>
          <span className="ic"><XLogo size={17} /></span> Bagikan
        </button>
      </div>

      {/* Panel tambah dana (top-up) */}
      {panel === 'tambah' && (
        <div className="sheet">
          <h3>Tambah Dana (Top-Up)</h3>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Jumlah setoran (MNT)</label>
            <input type="number" value={tSetor} onChange={(e) => setTSetor(e.target.value)} placeholder="contoh: 5" />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Tambahkan ke kunci (MNT, boleh 0)</label>
            <input type="number" value={tKunci} onChange={(e) => setTKunci(e.target.value)} placeholder="contoh: 2" />
            <div className="hint">Sisanya masuk ke Dana Pakai. Tanggal buka tidak berubah.</div>
          </div>
          <button className="btn-primary btn-block" onClick={() => tambahDana(tSetor, tKunci)} disabled={!!busy}>Setor Sekarang</button>
        </div>
      )}

      {/* Panel pakai dana */}
      {panel === 'pakai' && (
        <div className="sheet">
          <h3>Pakai Dana</h3>
          <div className="row">
            <input type="number" value={jumlahPakai} onChange={(e) => setJumlahPakai(e.target.value)} placeholder="Jumlah MNT, contoh: 1" />
            <button className="btn-primary" onClick={pakaiDana} disabled={!!busy} style={{ flexShrink: 0 }}>Konfirmasi</button>
          </div>
          <div className="hint" style={{ marginTop: 8 }}>Lewat batas bulanan akan memotong 1 jatah darurat.</div>
        </div>
      )}

      {/* Pelatih AI — tiap intent kotak terpisah */}
      <div className="coach">
        <div className="coach-head">
          <span className="avatar"><Sparkles size={18} /></span>
          <span className="who">Pelatih AI FinLock</span>
          {aiPesan && <span className="ai-tag">Gemini</span>}
        </div>
        <div className="coach-msgs">
          {aiPesan ? (
            <div className="coach-bubble"><span className="cb-ic"><Sparkles size={17} /></span><span>{aiPesan}</span></div>
          ) : (
            coach.map((m, i) => {
              const Ic = COACH_ICON[m.ikon] || Sparkles
              return (
                <div className="coach-bubble" key={i}>
                  <span className="cb-ic"><Ic size={17} /></span>
                  <span>{m.teks}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Daftar info */}
      <div className="info-card">
        <div className="info-row">
          <span className="l"><Flame size={17} className="em" /> Streak bertahan</span>
          <span className="v streak">{data.hariBertahan} hari</span>
        </div>
        <div className="info-row">
          <span className="l"><ShieldAlert size={17} className="em" /> Jatah darurat</span>
          <span className="claims">
            {[0, 1, 2].map((i) => <span key={i} className={'claim-dot' + (i < data.jatahDarurat ? ' on' : '')} />)}
          </span>
        </div>
        <div className="info-row">
          <span className="l"><Wallet size={17} className="em" /> Pakai bulan ini</span>
          <span className={'v' + (terpakaiN > batasN ? ' over' : '')}>{terpakaiN} / {batasN} MNT</span>
        </div>
        <div className="info-row">
          <span className="l"><TrendingUp size={17} className="em" /> Progress kunci</span>
          <span className="v">{persen}%</span>
        </div>
      </div>

      {/* Riwayat transaksi */}
      <div className="history-card">
        <div className="hist-head"><History size={17} /> Riwayat Transaksi</div>
        {riwayat.length === 0 ? (
          <div className="hist-empty">Belum ada transaksi.</div>
        ) : (
          riwayat.map((r, i) => <RiwayatRow key={i} r={r} />)
        )}
      </div>
    </div>
  )
}

function RiwayatRow({ r }) {
  const tgl = r.waktu ? new Date(r.waktu * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const map = {
    buat: { Ic: Wallet, label: 'Buat tabungan', cls: 'in' },
    tambah: { Ic: PlusCircle, label: 'Tambah dana', cls: 'in' },
    pakai: { Ic: MinusCircle, label: 'Pakai dana', cls: 'out' },
    tarik: { Ic: LockOpen, label: 'Tarik terkunci', cls: 'out' },
  }
  const m = map[r.jenis] || map.pakai
  const jumlah = keMnt(r.jumlah)
  return (
    <div className="hist-row">
      <span className={'hist-ic ' + m.cls}><m.Ic size={17} /></span>
      <div className="hist-mid">
        <div className="hist-label">{m.label}{r.jenis === 'pakai' && r.darurat ? ' (jatah darurat)' : ''}</div>
        <div className="hist-date">{tgl}</div>
      </div>
      <span className={'hist-amt ' + m.cls}>{m.cls === 'in' ? '+' : '−'}{jumlah} MNT</span>
    </div>
  )
}

// Skeleton saat memuat data
function SkeletonDash() {
  return (
    <div className="dash">
      <div className="skel skel-hero" />
      <div className="skel skel-actions" />
      <div className="skel skel-coach" />
      <div className="skel skel-info" />
      <div className="skel skel-hist" />
    </div>
  )
}

function pesanError(err) {
  return err?.reason || err?.shortMessage || err?.info?.error?.message || err?.message || 'terjadi kesalahan'
}

export default App
