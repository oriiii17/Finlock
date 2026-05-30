// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {FinLock} from "../src/FinLock.sol";
import {YieldVault} from "../src/YieldVault.sol";

/**
 * @title Tes untuk FinLock
 * @notice "Robot penguji" yang mencoba berbagai skenario, termasuk mencoba curang,
 *         untuk memastikan aturan FinLock benar-benar dipatuhi.
 *
 * Cara baca: setiap fungsi yang diawali "test_" adalah satu skenario uji.
 * forge-std memberi kita alat bantu:
 *   - vm.prank(alamat)      -> berpura-pura jadi pengguna tertentu untuk 1 transaksi
 *   - vm.deal(alamat, uang) -> memberi saldo MNT palsu ke pengguna untuk testing
 *   - vm.warp(waktu)        -> "menggeser" waktu blockchain (untuk uji tanggal buka)
 *   - vm.expectRevert(...)  -> memastikan sebuah aksi DITOLAK (gagal) seperti seharusnya
 */
contract FinLockTest is Test {
    FinLock finlock;
    YieldVault vault;

    // Dua pengguna palsu untuk testing.
    address andi = address(0xA1);
    address budi = address(0xB2);

    function setUp() public {
        vault = new YieldVault();
        finlock = new FinLock(payable(address(vault)));
        vault.setFinLock(address(finlock));
        // Danai pool bunga vault dengan MNT palsu.
        vm.deal(address(this), 100 ether);
        vault.danaiYield{value: 50 ether}();
        // Beri masing-masing 100 MNT palsu untuk diuji.
        vm.deal(andi, 100 ether);
        vm.deal(budi, 100 ether);
    }

    // 1) Membuat akun normal harus berhasil & datanya tersimpan benar.
    function test_BuatAkun_Berhasil() public {
        uint256 tanggalBuka = block.timestamp + 30 days;

        vm.prank(andi);
        // Setor 10 MNT: 6 dikunci, sisanya (4) jadi Dana Pakai. Batas bulanan 2 MNT.
        finlock.buatAkun{value: 10 ether}(6 ether, tanggalBuka, 2 ether);

        (
            uint256 danaTerkunci,
            uint256 danaPakai,
            uint256 waktuBuka,
            uint256 batasBulanan,
            ,
            uint256 jatahDarurat,
            ,
            bool aktif
        ) = finlock.lihatAkun(andi);

        assertEq(danaTerkunci, 6 ether, "dana terkunci harus 6");
        assertEq(danaPakai, 4 ether, "dana pakai harus 4");
        assertEq(waktuBuka, tanggalBuka, "tanggal buka salah");
        assertEq(batasBulanan, 2 ether, "batas bulanan salah");
        assertEq(jatahDarurat, 3, "jatah darurat awal harus 3");
        assertTrue(aktif, "akun harus aktif");
    }

    // 2) Aturan "dana terkunci tidak boleh nol" harus ditegakkan.
    function test_BuatAkun_TolakDanaTerkunciNol() public {
        vm.prank(andi);
        vm.expectRevert("FinLock: dana terkunci tidak boleh nol");
        finlock.buatAkun{value: 10 ether}(0, block.timestamp + 30 days, 2 ether);
    }

    // 3) INTI KOMITMEN: dana terkunci TIDAK bisa ditarik sebelum tanggalnya.
    function test_TarikTerkunci_DitolakSebelumWaktunya() public {
        vm.startPrank(andi);
        finlock.buatAkun{value: 10 ether}(6 ether, block.timestamp + 30 days, 2 ether);

        vm.expectRevert("FinLock: belum waktunya membuka");
        finlock.tarikDanaTerkunci();
        vm.stopPrank();
    }

    // 4) Setelah tanggal buka tiba, dana terkunci BARU bisa ditarik.
    function test_TarikTerkunci_BerhasilSetelahWaktunya() public {
        uint256 tanggalBuka = block.timestamp + 30 days;

        vm.startPrank(andi);
        finlock.buatAkun{value: 10 ether}(6 ether, tanggalBuka, 2 ether);

        // Geser waktu blockchain melewati tanggal buka.
        vm.warp(tanggalBuka + 1);

        uint256 saldoSebelum = andi.balance;
        finlock.tarikDanaTerkunci();
        uint256 saldoSesudah = andi.balance;
        vm.stopPrank();

        // Sekarang dapat 6 MNT pokok + bunga dari YieldVault, jadi harus LEBIH dari 6.
        assertGt(saldoSesudah - saldoSebelum, 6 ether, "harus menerima pokok + bunga (>6 MNT)");
    }

    // 5) Memakai dana DI DALAM batas tidak memotong jatah darurat.
    function test_PakaiDana_DalamBatas() public {
        vm.startPrank(andi);
        finlock.buatAkun{value: 10 ether}(6 ether, block.timestamp + 30 days, 2 ether);

        finlock.pakaiDana(1 ether); // masih di bawah batas 2 MNT
        vm.stopPrank();

        (, uint256 danaPakai,,, uint256 terpakai, uint256 jatahDarurat,,) = finlock.lihatAkun(andi);
        assertEq(danaPakai, 3 ether, "sisa dana pakai harus 3");
        assertEq(terpakai, 1 ether, "terpakai bulan ini harus 1");
        assertEq(jatahDarurat, 3, "jatah darurat tidak boleh berkurang");
    }

    // 6) Memakai MELEBIHI batas memotong 1 jatah darurat.
    function test_PakaiDana_LewatBatas_PotongJatah() public {
        vm.startPrank(andi);
        finlock.buatAkun{value: 10 ether}(6 ether, block.timestamp + 30 days, 2 ether);

        // Batas 2 MNT. Pakai 3 MNT sekaligus -> lewat batas -> potong 1 jatah.
        finlock.pakaiDana(3 ether);
        vm.stopPrank();

        (,,,,, uint256 jatahDarurat,,) = finlock.lihatAkun(andi);
        assertEq(jatahDarurat, 2, "jatah darurat harus berkurang jadi 2");
    }

    // 7) Setelah 3 jatah darurat habis, pemakaian melebihi batas ditolak.
    function test_PakaiDana_JatahDaruratHabis() public {
        vm.startPrank(budi);
        // Setor banyak agar dana cukup. Batas kecil (1 MNT) agar mudah terlampaui.
        finlock.buatAkun{value: 50 ether}(10 ether, block.timestamp + 30 days, 1 ether);

        // Tiap pemakaian 2 MNT selalu melebihi batas 1 MNT -> tiap kali potong jatah.
        finlock.pakaiDana(2 ether); // jatah 3 -> 2
        finlock.pakaiDana(2 ether); // jatah 2 -> 1
        finlock.pakaiDana(2 ether); // jatah 1 -> 0

        // Percobaan ke-4 harus DITOLAK karena jatah habis.
        vm.expectRevert("FinLock: jatah darurat habis bulan ini");
        finlock.pakaiDana(2 ether);
        vm.stopPrank();
    }

    // 8b) Top-up: tambahDana menambah ke kunci & dana pakai dengan benar.
    function test_TambahDana_Berhasil() public {
        vm.startPrank(andi);
        finlock.buatAkun{value: 10 ether}(6 ether, block.timestamp + 30 days, 2 ether);
        // Awal: terkunci 6, pakai 4. Tambah 5 MNT: 2 ke kunci, 3 ke pakai.
        finlock.tambahDana{value: 5 ether}(2 ether);
        vm.stopPrank();

        (uint256 terkunci, uint256 pakai,,,,,,) = finlock.lihatAkun(andi);
        assertEq(terkunci, 8 ether, "terkunci harus 6+2=8");
        assertEq(pakai, 7 ether, "pakai harus 4+3=7");
    }

    // 8c) tambahDana ditolak kalau belum punya akun.
    function test_TambahDana_TolakTanpaAkun() public {
        vm.prank(budi);
        vm.expectRevert("FinLock: kamu belum punya akun");
        finlock.tambahDana{value: 1 ether}(0);
    }

    // 9) Ganti bulan -> jatah darurat terisi ulang jadi 3.
    function test_ResetBulanan_IsiUlangJatah() public {
        vm.startPrank(budi);
        finlock.buatAkun{value: 50 ether}(10 ether, block.timestamp + 365 days, 1 ether);

        // Habiskan 3 jatah bulan ini.
        finlock.pakaiDana(2 ether);
        finlock.pakaiDana(2 ether);
        finlock.pakaiDana(2 ether);

        // Geser waktu maju 31 hari (ganti bulan), lalu pakai lagi melebihi batas.
        vm.warp(block.timestamp + 31 days);
        finlock.pakaiDana(2 ether); // harus berhasil karena jatah sudah terisi ulang
        vm.stopPrank();

        (,,,,, uint256 jatahDarurat,,) = finlock.lihatAkun(budi);
        assertEq(jatahDarurat, 2, "setelah ganti bulan & 1x pakai, sisa jatah harus 2");
    }
}
