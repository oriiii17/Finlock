// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FinLock} from "../src/FinLock.sol";

/**
 * @title Skrip Deploy FinLock
 * @notice Mengirim (deploy) contract FinLock ke blockchain.
 *
 * Cara menjalankan (dari Git Bash, lihat panduan):
 *   forge script script/Deploy.s.sol:DeployFinLock \
 *     --rpc-url https://rpc.sepolia.mantle.xyz \
 *     --account devWallet \
 *     --broadcast
 */
contract DeployFinLock is Script {
    function run() external returns (FinLock finlock) {
        // Mulai "menyiarkan" transaksi ke jaringan (pakai wallet yang dipilih).
        vm.startBroadcast();

        // Buat & kirim contract FinLock ke blockchain.
        finlock = new FinLock();

        // Cetak alamat hasil deploy ke layar supaya bisa kita catat.
        console.log("FinLock berhasil di-deploy di alamat:", address(finlock));

        vm.stopBroadcast();
    }
}
