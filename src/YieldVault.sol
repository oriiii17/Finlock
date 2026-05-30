// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title YieldVault
 * @notice "Bank DeFi" mini buatan sendiri untuk FinLock.
 *
 * FinLock menitipkan sebagian dana terkunci ke sini, dan dana itu MENGHASILKAN
 * BUNGA (yield) berbasis waktu — mirip deposito. Karena lending protocol terkenal
 * (Lendle/INIT) tidak tersedia di Mantle testnet, kita buat versi mini sendiri yang
 * tetap nyata & on-chain.
 *
 * Bunga = pokok x APR x lama-waktu. Pool bunga di-"danai" dengan MNT (danaiYield).
 * Hanya kontrak FinLock yang boleh setor/tarik atas nama pengguna.
 */
contract YieldVault {
    uint256 public constant APR_BPS = 800; // 8% per tahun (800 basis points)
    uint256 internal constant SETAHUN = 365 days;

    address public owner;    // yang men-deploy (boleh atur finlock & danai)
    address public finlock;  // hanya alamat ini yang boleh setor/tarik

    struct Posisi {
        uint256 pokok; // pokok (sudah termasuk bunga yang sudah diakumulasi)
        uint256 sejak; // kapan terakhir pokok diperbarui
    }
    mapping(address => Posisi) public posisi;

    event Setor(address indexed pengguna, uint256 jumlah);
    event Tarik(address indexed pengguna, uint256 total, uint256 bunga);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Set alamat kontrak FinLock (sekali, oleh owner).
    function setFinLock(address _finlock) external {
        require(msg.sender == owner, "YieldVault: bukan owner");
        finlock = _finlock;
    }

    /// @notice Mengisi pool untuk membayar bunga (seed pakai MNT).
    function danaiYield() external payable {}
    receive() external payable {}

    /// @notice Bunga yang sudah berjalan untuk seorang pengguna.
    function bungaBerjalan(address _p) public view returns (uint256) {
        Posisi memory pos = posisi[_p];
        if (pos.pokok == 0) return 0;
        return (pos.pokok * APR_BPS * (block.timestamp - pos.sejak)) / (10000 * SETAHUN);
    }

    /// @notice Nilai sekarang = pokok + bunga berjalan.
    function nilaiSekarang(address _p) external view returns (uint256) {
        return posisi[_p].pokok + bungaBerjalan(_p);
    }

    /// @notice FinLock menyetor MNT atas nama pengguna.
    function setor(address _untuk) external payable {
        require(msg.sender == finlock, "YieldVault: hanya FinLock");
        Posisi storage pos = posisi[_untuk];
        // Akumulasi bunga lama jadi pokok, lalu tambah setoran baru.
        pos.pokok += bungaBerjalan(_untuk) + msg.value;
        pos.sejak = block.timestamp;
        emit Setor(_untuk, msg.value);
    }

    /// @notice FinLock menarik seluruh (pokok + bunga) untuk pengguna. Dikirim ke FinLock.
    function tarik(address _untuk) external returns (uint256 total) {
        require(msg.sender == finlock, "YieldVault: hanya FinLock");
        Posisi storage pos = posisi[_untuk];
        uint256 bunga = bungaBerjalan(_untuk);
        total = pos.pokok + bunga;

        pos.pokok = 0; // update DULU (cegah reentrancy)
        pos.sejak = block.timestamp;

        (bool sukses, ) = payable(finlock).call{value: total}("");
        require(sukses, "YieldVault: transfer gagal");

        emit Tarik(_untuk, total, bunga);
    }
}
