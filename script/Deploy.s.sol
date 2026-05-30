// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FinLock} from "../src/FinLock.sol";
import {YieldVault} from "../src/YieldVault.sol";

/**
 * @title Skrip Deploy FinLock + YieldVault
 * @notice Urutan: deploy YieldVault -> deploy FinLock(vault) -> hubungkan -> danai pool bunga.
 *
 * Jalankan (dari Git Bash):
 *   forge script script/Deploy.s.sol:DeployFinLock \
 *     --rpc-url https://rpc.sepolia.mantle.xyz --account devFinLock \
 *     --sender 0x6be151b3ccbc1a093ec3df6bd525fb44795fd539 --broadcast
 */
contract DeployFinLock is Script {
    function run() external returns (FinLock finlock, YieldVault vault) {
        vm.startBroadcast();

        // 1) Deploy "bank DeFi" mini.
        vault = new YieldVault();

        // 2) Deploy FinLock yang memakai vault itu.
        finlock = new FinLock(payable(address(vault)));

        // 3) Hubungkan: hanya FinLock yang boleh setor/tarik di vault.
        vault.setFinLock(address(finlock));

        // 4) Danai pool bunga dengan 5 MNT tes supaya vault bisa membayar yield.
        vault.danaiYield{value: 5 ether}();

        console.log("YieldVault di:", address(vault));
        console.log("FinLock di:", address(finlock));

        vm.stopBroadcast();
    }
}
