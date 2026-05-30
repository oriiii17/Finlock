// ===== Jembatan antara web FinLock dan smart contract di blockchain Mantle =====
// File ini memakai pustaka "ethers" untuk bicara dengan contract.

import { ethers } from 'ethers'

// Alamat FinLock yang sudah kita deploy (Tahap 1).
export const FINLOCK_ADDRESS = '0xC327532a41157dA6B2984886D161C68295c095FB'

// Mantle Sepolia: chain id 5003 = 0x138b dalam heksadesimal.
export const MANTLE_SEPOLIA_HEX = '0x138b'

// "ABI" = daftar fungsi contract yang boleh dipanggil dari luar.
// Kita tulis dalam format mudah dibaca (human-readable) — ethers paham ini.
export const FINLOCK_ABI = [
  'function buatAkun(uint256 _danaTerkunci, uint256 _waktuBuka, uint256 _batasBulanan) payable',
  'function pakaiDana(uint256 _jumlah)',
  'function tarikDanaTerkunci()',
  'function tambahDana(uint256 _keKunci) payable',
  'function lihatAkun(address) view returns (uint256 danaTerkunci, uint256 danaPakai, uint256 waktuBuka, uint256 batasBulanan, uint256 terpakaiBulanIni, uint256 jatahDaruratTersisa, uint256 waktuMulai, bool aktif)',
  'function lihatAlokasi(address) view returns (uint256 vaultPokok, uint256 vaultNilaiSekarang, uint256 ditahan)',
  'function hariBertahan(address) view returns (uint256)',
  // event = catatan kejadian di blockchain (untuk Riwayat Transaksi)
  'event AkunDibuat(address indexed pengguna, uint256 danaTerkunci, uint256 danaPakai, uint256 waktuBuka)',
  'event DanaDipakai(address indexed pengguna, uint256 jumlah, bool pakaiJatahDarurat)',
  'event DanaTerkunciDitarik(address indexed pengguna, uint256 jumlah)',
  'event DanaDitambah(address indexed pengguna, uint256 jumlah, uint256 keKunci)',
]

// Blok saat FinLock di-deploy — batas awal pencarian riwayat (biar cepat).
const BLOK_DEPLOY = 39294787

// Wallet yang sedang aktif (EIP-1193 provider). Default: window.ethereum kalau ada.
// Bisa diganti ke wallet mana pun yang dipilih pengguna (lihat setActiveProvider).
let _provider = (typeof window !== 'undefined' && window.ethereum) ? window.ethereum : null

// Mengatur wallet aktif (dipanggil saat pengguna memilih wallet).
export function setActiveProvider(p) { _provider = p }

// Mengambil wallet aktif (EIP-1193 mentah) untuk panggilan langsung (mis. pindah jaringan).
export function getInjected() { return _provider }

// Membuat objek "provider" ethers dari wallet aktif — saluran ke blockchain.
export function getProvider() {
  if (!_provider) throw new Error('Belum ada wallet terhubung')
  return new ethers.BrowserProvider(_provider)
}

// Provider khusus BACA data — langsung ke RPC publik Mantle Sepolia.
// Lebih andal & tidak bergantung pada kondisi wallet (hindari error "invalid BytesLike value").
const RPC_MANTLE = 'https://rpc.sepolia.mantle.xyz'
const readProvider = new ethers.JsonRpcProvider(RPC_MANTLE)

// Membuat objek "contract" untuk dipanggil.
// withSigner = true -> bisa MENGUBAH data (kirim transaksi via wallet, butuh tanda tangan).
// withSigner = false -> hanya MEMBACA data (lewat RPC publik, gratis & stabil).
export async function getContract(withSigner = false) {
  if (withSigner) {
    const signer = await getProvider().getSigner()
    return new ethers.Contract(FINLOCK_ADDRESS, FINLOCK_ABI, signer)
  }
  return new ethers.Contract(FINLOCK_ADDRESS, FINLOCK_ABI, readProvider)
}

// Membaca data akun seorang pengguna dari blockchain, lalu merapikannya.
export async function bacaAkun(alamat) {
  const c = await getContract(false)
  const a = await c.lihatAkun(alamat)
  const hari = await c.hariBertahan(alamat)

  // Alokasi yield — dibungkus try/catch supaya tetap jalan kalau kontrak lama dipakai.
  let vaultPokok = 0n, vaultNilai = 0n, ditahan = 0n
  try {
    const alok = await c.lihatAlokasi(alamat)
    vaultPokok = alok.vaultPokok; vaultNilai = alok.vaultNilaiSekarang; ditahan = alok.ditahan
  } catch { /* kontrak belum punya yield vault */ }

  return {
    danaTerkunci: a.danaTerkunci,
    danaPakai: a.danaPakai,
    waktuBuka: Number(a.waktuBuka),
    batasBulanan: a.batasBulanan,
    terpakaiBulanIni: a.terpakaiBulanIni,
    jatahDarurat: Number(a.jatahDaruratTersisa),
    waktuMulai: Number(a.waktuMulai),
    aktif: a.aktif,
    hariBertahan: Number(hari),
    vaultPokok, vaultNilai, ditahan,   // bigint (wei)
  }
}

// Membaca RIWAYAT transaksi pengguna dari event blockchain, terbaru di atas.
export async function bacaRiwayat(alamat) {
  const c = await getContract(false)
  const [buat, pakai, tarik, tambah] = await Promise.all([
    c.queryFilter(c.filters.AkunDibuat(alamat), BLOK_DEPLOY),
    c.queryFilter(c.filters.DanaDipakai(alamat), BLOK_DEPLOY),
    c.queryFilter(c.filters.DanaTerkunciDitarik(alamat), BLOK_DEPLOY),
    c.queryFilter(c.filters.DanaDitambah(alamat), BLOK_DEPLOY),
  ])

  const items = []
  for (const e of buat) items.push({ jenis: 'buat', jumlah: e.args.danaTerkunci + e.args.danaPakai, blok: e.blockNumber })
  for (const e of pakai) items.push({ jenis: 'pakai', jumlah: e.args.jumlah, darurat: e.args.pakaiJatahDarurat, blok: e.blockNumber })
  for (const e of tarik) items.push({ jenis: 'tarik', jumlah: e.args.jumlah, blok: e.blockNumber })
  for (const e of tambah) items.push({ jenis: 'tambah', jumlah: e.args.jumlah, blok: e.blockNumber })

  // Ambil waktu tiap blok (sekali per blok unik).
  const blokUnik = [...new Set(items.map((i) => i.blok))]
  const waktuBlok = {}
  await Promise.all(blokUnik.map(async (b) => {
    const blk = await readProvider.getBlock(b)
    waktuBlok[b] = blk ? Number(blk.timestamp) : 0
  }))
  for (const i of items) i.waktu = waktuBlok[i.blok] || 0

  // Urutkan terbaru di atas.
  items.sort((a, b) => b.blok - a.blok)
  return items
}

// Pembantu: ubah angka MNT (string) -> wei, dan sebaliknya.
export const keWei = (mnt) => ethers.parseEther(String(mnt))
export const keMnt = (wei) => ethers.formatEther(wei)
