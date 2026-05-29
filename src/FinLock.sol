// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FinLock
 * @notice Dompet tabungan disiplin di blockchain Mantle.
 *
 * Ide inti (dari pengguna):
 *  - Uang pengguna dibagi 2: "Dana Terkunci" (Bagian A) & "Dana Pakai" (Bagian B).
 *  - Dana Terkunci tidak boleh nol, dan HANYA bisa ditarik pada satu tanggal
 *    yang dipilih pengguna sendiri di awal (tidak bisa lebih cepat, oleh siapa pun).
 *  - Dana Pakai boleh digunakan, tapi ada BATAS pemakaian per bulan.
 *  - Kalau ingin pakai melebihi batas, pengguna punya jatah darurat 3x per bulan.
 *  - Tiap bulan, jatah darurat & pemakaian di-reset.
 *
 * Catatan: "uang" di sini adalah MNT (koin asli Mantle). Pengguna menyetor MNT
 * saat membuat akun. Semua angka uang dalam satuan "wei" (1 MNT = 10^18 wei).
 */
contract FinLock {
    // ============ KONSTANTA ============

    /// @notice Maksimal jatah darurat per bulan (sesuai aturan: 3 kali).
    uint256 public constant MAX_JATAH_DARURAT = 3;

    /// @notice Panjang satu "bulan" untuk reset. Disederhanakan jadi 30 hari.
    uint256 public constant PERIODE_BULAN = 30 days;

    // ============ STRUKTUR DATA ============

    /// @notice Data tabungan milik satu pengguna.
    struct Akun {
        uint256 danaTerkunci;       // Bagian A: terkunci sampai `waktuBuka`
        uint256 danaPakai;          // Bagian B: boleh dipakai (dengan batas)
        uint256 waktuBuka;          // kapan Dana Terkunci boleh ditarik (timestamp)
        uint256 batasBulanan;       // batas pemakaian Dana Pakai per bulan
        uint256 terpakaiBulanIni;   // sudah dipakai berapa bulan ini
        uint256 jatahDaruratTersisa;// sisa jatah darurat bulan ini (mulai dari 3)
        uint256 indeksPeriode;      // penanda "bulan ke-berapa" (untuk reset)
        uint256 waktuMulai;         // kapan akun dibuat (untuk hitung streak)
        bool aktif;                 // apakah pengguna sudah punya akun
    }

    /// @notice Memetakan alamat pengguna ke datanya. Ini "buku besar" FinLock.
    mapping(address => Akun) private akunPengguna;

    // ============ EVENT (catatan kejadian, untuk dibaca aplikasi web) ============

    event AkunDibuat(address indexed pengguna, uint256 danaTerkunci, uint256 danaPakai, uint256 waktuBuka);
    event DanaDipakai(address indexed pengguna, uint256 jumlah, bool pakaiJatahDarurat);
    event DanaTerkunciDitarik(address indexed pengguna, uint256 jumlah);

    // ============ FUNGSI UTAMA ============

    /**
     * @notice Membuat akun FinLock sekaligus menyetor uang pertama.
     * @param _danaTerkunci jumlah yang dikunci mati (WAJIB > 0)
     * @param _waktuBuka tanggal (timestamp) kapan Dana Terkunci boleh ditarik
     * @param _batasBulanan batas pemakaian Dana Pakai per bulan
     *
     * Uang yang disetor = msg.value. Sisanya (msg.value - _danaTerkunci) jadi Dana Pakai.
     */
    function buatAkun(uint256 _danaTerkunci, uint256 _waktuBuka, uint256 _batasBulanan) external payable {
        Akun storage a = akunPengguna[msg.sender];

        require(!a.aktif, "FinLock: kamu sudah punya akun");
        require(msg.value > 0, "FinLock: harus menyetor uang");
        require(_danaTerkunci > 0, "FinLock: dana terkunci tidak boleh nol");
        require(_danaTerkunci <= msg.value, "FinLock: dana terkunci melebihi setoran");
        require(_waktuBuka > block.timestamp, "FinLock: tanggal buka harus di masa depan");

        a.danaTerkunci = _danaTerkunci;
        a.danaPakai = msg.value - _danaTerkunci;
        a.waktuBuka = _waktuBuka;
        a.batasBulanan = _batasBulanan;
        a.terpakaiBulanIni = 0;
        a.jatahDaruratTersisa = MAX_JATAH_DARURAT;
        a.indeksPeriode = block.timestamp / PERIODE_BULAN;
        a.waktuMulai = block.timestamp;
        a.aktif = true;

        emit AkunDibuat(msg.sender, a.danaTerkunci, a.danaPakai, _waktuBuka);
    }

    /**
     * @notice Memakai (menarik) sebagian Dana Pakai.
     * @param _jumlah berapa banyak yang ingin dipakai
     *
     * Aturan:
     *  - Kalau total pemakaian bulan ini MASIH di dalam batas -> langsung boleh.
     *  - Kalau MELEBIHI batas -> butuh 1 jatah darurat (maks 3 per bulan).
     *  - Dana Terkunci TIDAK PERNAH bisa disentuh lewat fungsi ini.
     */
    function pakaiDana(uint256 _jumlah) external {
        Akun storage a = akunPengguna[msg.sender];

        require(a.aktif, "FinLock: kamu belum punya akun");
        require(_jumlah > 0, "FinLock: jumlah harus lebih dari nol");
        require(_jumlah <= a.danaPakai, "FinLock: Dana Pakai tidak cukup");

        _resetBulananJikaPerlu(a);

        bool pakaiJatahDarurat = false;

        // Apakah pemakaian ini melebihi batas bulanan?
        if (a.terpakaiBulanIni + _jumlah > a.batasBulanan) {
            // Melebihi batas -> butuh jatah darurat.
            require(a.jatahDaruratTersisa > 0, "FinLock: jatah darurat habis bulan ini");
            a.jatahDaruratTersisa -= 1;
            pakaiJatahDarurat = true;
        }

        // Update catatan DULU (sebelum kirim uang) demi keamanan.
        a.danaPakai -= _jumlah;
        a.terpakaiBulanIni += _jumlah;

        // Kirim uangnya ke pengguna.
        (bool sukses, ) = payable(msg.sender).call{value: _jumlah}("");
        require(sukses, "FinLock: gagal mengirim uang");

        emit DanaDipakai(msg.sender, _jumlah, pakaiJatahDarurat);
    }

    /**
     * @notice Menarik SEMUA Dana Terkunci. Hanya boleh setelah `waktuBuka` tiba.
     * Inilah inti "komitmen": sebelum tanggalnya, ini mustahil dilakukan.
     */
    function tarikDanaTerkunci() external {
        Akun storage a = akunPengguna[msg.sender];

        require(a.aktif, "FinLock: kamu belum punya akun");
        require(a.danaTerkunci > 0, "FinLock: tidak ada dana terkunci");
        require(block.timestamp >= a.waktuBuka, "FinLock: belum waktunya membuka");

        uint256 jumlah = a.danaTerkunci;
        a.danaTerkunci = 0; // update DULU sebelum kirim

        (bool sukses, ) = payable(msg.sender).call{value: jumlah}("");
        require(sukses, "FinLock: gagal mengirim uang");

        emit DanaTerkunciDitarik(msg.sender, jumlah);
    }

    // ============ FUNGSI BANTU (internal) ============

    /**
     * @dev Mengecek apakah sudah ganti bulan. Kalau iya, reset pemakaian &
     *      isi ulang jatah darurat jadi 3 lagi.
     */
    function _resetBulananJikaPerlu(Akun storage a) internal {
        uint256 periodeSekarang = block.timestamp / PERIODE_BULAN;
        if (periodeSekarang > a.indeksPeriode) {
            a.indeksPeriode = periodeSekarang;
            a.terpakaiBulanIni = 0;
            a.jatahDaruratTersisa = MAX_JATAH_DARURAT;
        }
    }

    // ============ FUNGSI BACA (view — gratis, tidak ubah apa-apa) ============

    /// @notice Mengambil seluruh data akun seorang pengguna (untuk ditampilkan di web).
    function lihatAkun(address _pengguna)
        external
        view
        returns (
            uint256 danaTerkunci,
            uint256 danaPakai,
            uint256 waktuBuka,
            uint256 batasBulanan,
            uint256 terpakaiBulanIni,
            uint256 jatahDaruratTersisa,
            uint256 waktuMulai,
            bool aktif
        )
    {
        Akun storage a = akunPengguna[_pengguna];
        return (
            a.danaTerkunci,
            a.danaPakai,
            a.waktuBuka,
            a.batasBulanan,
            a.terpakaiBulanIni,
            a.jatahDaruratTersisa,
            a.waktuMulai,
            a.aktif
        );
    }

    /// @notice Menghitung sudah berapa HARI uang pengguna "bertahan" (untuk fitur streak).
    function hariBertahan(address _pengguna) external view returns (uint256) {
        Akun storage a = akunPengguna[_pengguna];
        if (!a.aktif) return 0;
        return (block.timestamp - a.waktuMulai) / 1 days;
    }
}
