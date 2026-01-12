"use client";
import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { ShieldCheck, Upload, FileText, CheckCircle, Loader2, UserCheck } from "lucide-react";

// --- 1. FIX TYPESCRIPT ERROR ---
declare global {
  interface Window {
    ethereum: any;
  }
}

// --- 2. CONFIGURATION ---
// REPLACE WITH YOUR NEW CONTRACT ADDRESS FROM REMIX
const CONTRACT_ADDRESS = "0x919F737bb0C39c05c459a20A2FaB26035E9734f3"; 

const ABI = [
    // The Mint Function (Updated for Real IPFS hash)
    "function mintBond(string _name, string _isin, string _docHash, string _ipfsHash, uint256 _yieldRate, uint256 _totalSupply) public",
    // The Compliance Function
    "function whitelistUser(address _user) public",
    // The Verification Function
    "function verifyIntegrity(uint256 _bondId, string _hashToCheck) public view returns (bool)"
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [minting, setMinting] = useState(false);

  // --- 3. ANALYZE (Send to Python) ---
  const handleAnalyze = async () => {
    if (!file) return alert("Please select a PDF first");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Connects to your Flask Backend
      const res = await axios.post("http://localhost:5000/analyze_bond", formData);
      console.log("AI Response:", res.data); // Debugging
      setAiData(res.data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to Python Backend. Make sure app.py is running!");
    }
    setLoading(false);
  };

  // --- 4. MINT (Send to Celo) ---
  const handleMint = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    setMinting(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // Call the Smart Contract
      const tx = await contract.mintBond(
        aiData.ai_data.bond_name,     // Name from AI
        aiData.ai_data.isin,          // ISIN from AI
        aiData.hash,                  // SHA256 Hash from Python
        aiData.ipfs_cid,              // IPFS Hash from Pinata
        aiData.ai_data.detected_yield,// Yield (e.g. 720) from AI
        10000                         // Total Supply (Hardcoded for demo)
      );
      
      await tx.wait(); // Wait for block confirmation
      setTxHash(tx.hash);
      alert("Success! Bond Tokenized on Celo Sepolia.");
    } catch (err: any) {
      console.error(err);
      // Nice error handling for KYC failure
      if (err.message.includes("KYC")) {
        alert("Transaction Failed: You are not KYC Verified! Click the 'Simulate KYC' button.");
      } else {
        alert("Transaction Failed. Check Console.");
      }
    }
    setMinting(false);
  };

  // --- 5. KYC SIMULATION (For Demo) ---
  const handleKYC = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.whitelistUser(await signer.getAddress());
      await tx.wait();
      alert("KYC Verified! You can now trade RWA tokens.");
    } catch (err) {
      console.error(err);
      alert("KYC Failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-800 pb-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <ShieldCheck className="w-10 h-10" /> VerifyChain RWA
            </h1>
            <p className="text-gray-500 mt-2 text-sm">East-India Blockchain Summit 2.0</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-green-900/30 text-green-400 border border-green-600 px-4 py-1 rounded-full text-sm">
              Celo Sepolia
            </span>
            <button 
              onClick={handleKYC}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-900 px-2 py-1 rounded"
            >
              <UserCheck size={14} /> Simulate KYC
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* LEFT: UPLOAD */}
          <div className="border border-green-800 p-8 rounded-xl bg-gray-900/50 backdrop-blur">
            <h2 className="text-2xl mb-6 flex items-center gap-2 text-white">
              <Upload className="text-green-500" /> 1. Issuer Upload
            </h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-green-800 hover:border-green-500 transition rounded-lg p-8 text-center cursor-pointer relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-gray-400 group-hover:text-green-300 transition">
                    {file ? (
                        <span className="text-green-400 font-bold">{file.name}</span>
                    ) : (
                        "Drag & Drop Bond PDF here"
                    )}
                </div>
              </div>

              <button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-4 rounded-lg transition flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Analyze with AI"}
              </button>
            </div>
          </div>

          {/* RIGHT: RESULTS */}
          <div className={`border border-green-800 p-8 rounded-xl bg-gray-900/50 transition-all ${aiData ? 'opacity-100' : 'opacity-50 blur-sm pointer-events-none'}`}>
            <h2 className="text-2xl mb-6 flex items-center gap-2 text-white">
              <FileText className="text-green-500" /> 2. Verification
            </h2>

            {aiData && (
              <div className="space-y-4">
                <div className="bg-black/50 p-4 rounded border border-green-900 text-sm space-y-2">
                  <p className="flex justify-between"><span>Bond Name:</span> <span className="text-white text-right">{aiData.ai_data.bond_name}</span></p>
                  <p className="flex justify-between"><span>ISIN:</span> <span className="text-white text-right">{aiData.ai_data.isin}</span></p>
                  <p className="flex justify-between"><span>Risk Rating:</span> <span className="text-white text-right">{aiData.ai_data.risk_rating}</span></p>
                  <p className="flex justify-between"><span>Detected Yield:</span> <span className="text-green-400 font-bold text-right">{aiData.ai_data.raw_yield}%</span></p>
                  
                  <div className="h-px bg-green-900 my-2"></div>
                  
                  <p className="flex justify-between items-center">
                    <span>IPFS Document:</span> 
                    <a href={`https://gateway.pinata.cloud/ipfs/${aiData.ipfs_cid}`} target="_blank" className="text-blue-400 underline text-xs">
                        View On-Chain PDF
                    </a>
                  </p>
                  <p className="text-[10px] text-gray-500 break-all mt-1">Hash: {aiData.hash}</p>
                </div>

                <button 
                  onClick={handleMint}
                  disabled={minting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition flex justify-center items-center gap-2"
                >
                  {minting ? <Loader2 className="animate-spin" /> : <><CheckCircle /> Mint on Celo Blockchain</>}
                </button>

                {txHash && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded text-center animate-pulse">
                    <p className="text-green-400 font-bold">Bond Tokenized Successfully!</p>
                    <a 
                      href={`https://celo-sepolia.blockscout.com/tx/${txHash}`} 
                      target="_blank"
                      rel="noreferrer" 
                      className="text-blue-400 underline text-sm block mt-1"
                    >
                      View on Celo Explorer
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}