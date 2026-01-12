# 🏦 VerifyChain RWA
### East India Blockchain Summit 2.0

**VerifyChain RWA** is a decentralized Real World Asset (RWA) tokenization platform that brings transparency, security, and automation to bond trading. It leverages **AI Agents** to verify legal documents, **IPFS** for immutable storage, and **Smart Contracts** for compliance-enforced tokenization.

---

## 🚩 Problem Statement
Government bonds are widely regarded as safe, sovereign-backed investment instruments, yet meaningful retail participation remains limited. Structural inefficiencies and missing trust infrastructure prevent broader adoption, especially as tokenized government bonds emerge within the RWA ecosystem.



### Key Challenges:
- **High minimum investment thresholds**: Institutional barriers keep retail investors out.
- **Complex and fragmented onboarding**: Lengthy, paper-heavy processes.
- **Limited secondary market liquidity**: Bonds are hard to trade before maturity.
- **Opaque yield and payout visibility**: Investors lack real-time data on returns.
- **No standardized, tamper-proof verification**: Reliance on centralized intermediaries creates trust gaps.

---

## 💡 Proposed Solution: VerifyChain RWA
**Issuance already exists.** The missing piece is trust, verification, and compliance — that’s where **VerifyChain RWA** creates maximum value.



### What We Do:
- **Cryptographic Verification**: Generate hashes of government bond metadata using AI.
- **On-Chain Proof**: Verify fractional ownership and issuance on the Celo blockchain.
- **Lifecycle Tracking**: Record yield distribution and redemption events immutably.
- **Privacy-Preserving**: Enable trustless verification without exposing sensitive investor data.

### What This Solves:
- **Prevents Fraud**: Eliminates fake or duplicated bond tokens.
- **Transparent Yields**: Ensures 100% visibility into payout history.
- **Audit Trails**: Creates regulator-ready, on-chain records.
- **Trust**: Builds investor confidence in RWA platforms.

---

## 🌍 Why Celo?
We chose **Celo** as our infrastructure layer for its unique "Mobile-First, Carbon-Negative" approach that aligns perfectly with our mission of accessible RWAs.

1.  **Mobile-First Accessibility**: Celo's lightweight protocol enables verification and trading on mobile devices, crucial for emerging markets.
2.  **Stablecoin-Native Gas**: Users can pay transaction fees in stablecoins (cUSD/USDC), removing the friction of holding volatile assets just for gas.
3.  **Sustainability**: Celo is carbon-negative, making our ESG-compliant bond platform truly green.
4.  **EVM Compatibility**: Allows us to leverage the robust Ethereum developer ecosystem while enjoying sub-cent fees.

---

## 🤖 Why AI & How We Use It?
Artificial Intelligence is the "Verifier" in our architecture, bridging the gap between off-chain documents and on-chain truth.

### The Problem with RWAs
Real World Assets start as **paper/PDF legal documents**. Bridging them on-chain manually is slow, error-prone, and hard to audit.

### Our AI Approach
We leverage **Llama 3 (70B via Groq)** as a specialized document analysis engine:
1.  **Extraction**: The AI parses complex PDF data (ISIN, Interest Rate, Maturity Date) with human-like understanding but machine speed.
2.  **Validation**: It cross-references extracted data against defined schema rules.
3.  **Hashing**: The verified data is hashed to create a digital fingerprint. This fingerprint is what goes on-chain, ensuring that **if the document changes, the hash changes**, alerting the smart contract.

---

## 🚀 Live Demo & Links
- **Frontend Deployed URL**: [Click Here](https://verifychain-kappa.vercel.app/)
- **Backend API URL**: [Click Here](https://verifychain-rwa.onrender.com)
- **Smart Contract Address**: `0x919F737bb0C39c05c459a20A2FaB26035E9734f3` (Celo Sepolia Testnet)

![Demo](assets/demo.png)


---

## 🛠 Project Architecture

The system consists of three main pillars:

1.  **AI Verification Engine (Backend)**: 
    -   Extracts data from Bond PDFs using **Llama 3 (via Groq)**.
    -   Generates SHA256 hashes for document integrity.
    -   Uploads original documents to **IPFS/Pinata**.
2.  **Compliance Layer (Smart Contract)**:
    -   Enforces KYC whitelisting for all participants.
    -   Mints ERC-20 tokens linked to real-world bond data.
    -   Restricts transfers to verified users only.
3.  **User Dashboard (Frontend)**:
    -   Allows Issuers to upload PDFs and mint tokens.
    -   Allows Investors to view and trade verified bonds.

---

## 📂 Tech Stack

### **Frontend**
-   **Framework**: Next.js 16 (React 19)
-   **Styling**: Tailwind CSS v4, Framer Motion
-   **Blockchain Interaction**: Ethers.js v6
-   **Icons**: Lucide React

### **Backend**
-   **Framework**: Flask (Python)
-   **AI Model**: Llama 3.3 70B (via Groq API)
-   **Storage**: IPFS (Pinata SDK)
-   **PDF Processing**: PyPDF2
-   **Security**: SHA256 Hashing

### **Smart Contracts**
-   **Language**: Solidity ^0.8.20
-   **Standard**: ERC-20 (OpenZeppelin)
-   **Network**: Celo (Alfajores Testnet)

---

## ⚡ Installation & Setup Guide

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Srizdebnath/verifychain-rwa
cd VerifyChain_RWA
```

### 2️⃣ Backend Setup (AI & IPFS Engine)
The backend handles document parsing, AI analysis, and IPFS uploads.

```bash
cd backend
python -m venv venv
# Activate Venv: source venv/bin/activate (Mac/Linux) or venv\Scripts\activate (Windows)
pip install -r requirements.txt
```

**Configure Environment Variables (`backend/.env`):**
```env
GROQ_API_KEY=your_groq_api_key
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret
```

**Run Server:**
```bash
python app.py
# Server running on http://localhost:5000
```

### 3️⃣ Frontend Setup (User Interface)
The frontend serves as the terminal for users to interact with the protocol.

```bash
cd ../frontend
npm install
```

**Configure Environment Variables (`frontend/.env.local`):**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

**Run Client:**
```bash
npm run dev
# App running on http://localhost:3000
```

---

## 🔌 API Endpoints

### `POST /analyze_bond`
Uploads a Bond PDF, extracts data using AI, and pins to IPFS.

-   **Body**: `form-data` with `file` (PDF)
-   **Response**:
    ```json
    {
      "success": true,
      "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "ipfs_cid": "QmHash...",
      "ai_data": {
        "bond_name": "Government of India 7.26% 2033",
        "isin": "IN0020230018",
        "risk_rating": "AAA",
        "detected_yield": 726,
        "raw_yield": 7.26
      }
    }
    ```

---

## 📜 Smart Contracts

Located in `contracts/VerifyChainRWA.sol`.

### Key Features
-   **`whitelistUser(address)`**: Only the owner can whitelist investors (KYC).
-   **`mintBond(...)`**: Mints tokens representing the bond with on-chain metadata (IPFS Hash, Doc Hash, Yield).
-   **`transfer(...)`**: Overridden to block transfers if sender or recipient is not KYC verified.
-   **`verifyIntegrity(...)`**: Checks if a provided document hash matches the on-chain stored hash.

### Deploy (Remix / Hardhat)
1.  Open Remix IDE.
2.  Compile `VerifyChainRWA.sol`.
3.  Deploy using Injected Provider (Metamask) connected to Celo Alfajores.
4.  Copy the contract address and update it in your frontend config.

---

## 🤝 Contribution
1.  Fork the repo
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

### Built by Team **LowEnd Corp.**
