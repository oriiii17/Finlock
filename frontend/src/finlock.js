// ===== Jembatan antara web FinLock dan smart contract di blockchain Mantle =====
// File ini memakai pustaka "ethers" untuk bicara dengan contract.

import { ethers } from 'ethers'

// Alamat FinLock yang sudah kita deploy (Tahap 1).
export const FINLOCK_ADDRESS = '0xe53E3149C2F84DbB6916e8E00593E6310aeE621a'

// Mantle Sepolia: chain id 5003 = 0x138b dalam heksadesimal.
export const MANTLE_SEPOLIA_HEX = '0x138b'

// "ABI" = daftar fungsi contract yang boleh dipanggil dari luar.
// Kita tulis dalam format mudah dibaca (human-readable) — ethers paham ini.
export const FINLOCK_ABI = [
  'function buatAkun(uint256 _danaTerkunci, uint256 _waktuBuka, uint256 _batasBulanan) payable',
  'function pakaiDana(uint256 _jumlah)',
  'function tarikDanaTerkunci()',
  'function lihatAkun(address) view returns (uint256 danaTerkunci, uint256 danaPakai, uint256 waktuBuka, uint256 batasBulanan, uint256 terpakaiBulanIni, uint256 jatahDaruratTersisa, uint256 waktuMulai, bool aktif)',
  'function hariBertahan(address) view returns (uint256)',
]

// Membuat objek "provider" — saluran untuk membaca data dari blockchain.
export function getProvider() {
  return new ethers.BrowserProvider(window.ethereum)
}

// Membuat objek "contract" untuk dipanggil.
// withSigner = true -> bisa MENGUBAH data (kirim transaksi, butuh tanda tangan wallet).
// withSigner = false -> hanya MEMBACA data (gratis).
export async function getContract(withSigner = false) {
  const provider = getProvider()
  if (withSigner) {
    const signer = await provider.getSigner()
    return new ethers.Contract(FINLOCK_ADDRESS, FINLOCK_ABI, signer)
  }
  return new ethers.Contract(FINLOCK_ADDRESS, FINLOCK_ABI, provider)
}

// Membaca data akun seorang pengguna dari blockchain, lalu merapikannya.
export async function bacaAkun(alamat) {
  const c = await getContract(false)
  const a = await c.lihatAkun(alamat)
  const hari = await c.hariBertahan(alamat)
  return {
    danaTerkunci: a.danaTerkunci,       // bigint (wei)
    danaPakai: a.danaPakai,             // bigint (wei)
    waktuBuka: Number(a.waktuBuka),     // detik unix
    batasBulanan: a.batasBulanan,       // bigint (wei)
    terpakaiBulanIni: a.terpakaiBulanIni,
    jatahDarurat: Number(a.jatahDaruratTersisa),
    waktuMulai: Number(a.waktuMulai),   // detik unix
    aktif: a.aktif,                     // boolean
    hariBertahan: Number(hari),
  }
}

// Pembantu: ubah angka MNT (string) -> wei, dan sebaliknya.
export const keWei = (mnt) => ethers.parseEther(String(mnt))
export const keMnt = (wei) => ethers.formatEther(wei)
