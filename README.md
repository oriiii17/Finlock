# 🔒 FinLock — Lock your money. Protect yourself.

> A commitment savings wallet on **Mantle** that protects you from your own worst impulse: spending the money you swore you'd save.

**Submission for The Turing Test Hackathon 2026 (Mantle) — Track: Consumer & Viral DApps.**

---

## The problem

Saving is hard not because we lack apps — it's because we cheat *ourselves*. "Just this once" turns a savings goal into an empty account. Regular banks always let you withdraw; the willpower is left entirely to you.

## The idea

FinLock is a wallet that **can't be cheated — not even by you.** Your money is split in two:

- 🔒 **Hard-Locked funds** — set an amount and an unlock date. Until that date, withdrawal is *impossible* for anyone, enforced by a smart contract. No "withdraw early" button exists.
- 💸 **Spendable funds** — usable, but with a monthly limit. Go over it and you spend one of just **3 emergency claims per month** (auto-resets monthly). Run out, and you wait.

Because the rules live on-chain, they're transparent and tamper-proof. It's a *commitment device* — trivial to build on a blockchain, nearly impossible in the real world.

## How it fits the track (Consumer & Viral + AI)

- 🤖 **AI Savings Coach** — gives personal, situational encouragement ("you're on day 23, hold on!") and gentle nudges when you're about to burn an emergency claim. Suggests a realistic lock amount.
- 🔥 **Daily streak** — "your money has survived X days" turns discipline into a game.
- 🐦 **Share to X** — one tap posts your streak, pulling friends into the loop.

---

## 🚀 Live on Mantle Sepolia Testnet

| | |
|---|---|
| **Contract** | `0xC327532a41157dA6B2984886D161C68295c095FB` |
| **Explorer** | https://sepolia.mantlescan.xyz/address/0xC327532a41157dA6B2984886D161C68295c095FB |
| **Chain** | Mantle Sepolia (id `5003`) |

---

## 🛠️ Tech stack

- **Smart contract:** Solidity, [Foundry](https://getfoundry.sh) (8 passing tests incl. anti-cheat scenarios)
- **Frontend:** React + Vite, [ethers.js](https://ethers.org) for on-chain calls, MetaMask wallet
- **AI coach:** in-browser rule-based engine (`frontend/src/coach.js`). An optional real-LLM backend using the **Claude API** (`claude-opus-4-8`) is included in `backend/` and can be enabled with an Anthropic API key.

## 📁 Project structure

```
src/FinLock.sol         # the smart contract (the "vault")
test/FinLock.t.sol      # 8 Foundry tests
script/Deploy.s.sol     # deployment script
frontend/               # React web app (the face of FinLock)
  src/App.jsx           #   UI + wallet + contract calls
  src/finlock.js        #   ethers bridge to the contract
  src/coach.js          #   the AI savings coach (rule-based)
backend/                # optional Claude API server (real LLM coach)
```

## ▶️ Run it locally

**1. Smart contract tests**
```bash
forge test
```

**2. Web app**
```bash
cd frontend
npm install
npm run dev          # opens http://localhost:5173
```
Connect MetaMask (Mantle Sepolia network), get test MNT from https://faucet.sepolia.mantle.xyz, then create a locked savings.

**3. (Optional) real Claude AI coach**
```bash
cd backend
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev
```

---

## How the contract enforces the rules

- `buatAkun(lockAmount, unlockDate, monthlyLimit)` — deposit MNT, split into locked + spendable. Lock amount must be non-zero; unlock date must be in the future.
- `pakaiDana(amount)` — spend; if it exceeds the monthly limit, consumes 1 of 3 emergency claims. Reverts if claims are exhausted.
- `tarikDanaTerkunci()` — withdraw locked funds. **Reverts until the unlock date.** This is the heart of FinLock.
- `lihatAkun(addr)` / `hariBertahan(addr)` — read account data + streak days.

Built with checks-effects-interactions to guard against reentrancy.

---

_Built solo for the Mantle Turing Test Hackathon 2026._ 🔒
