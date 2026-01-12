"use client";
import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { ShieldCheck, Upload, FileText, CheckCircle, Loader2 } from "lucide-react";

// --- CONFIGURATION ---
// PASTE YOUR CONTRACT ADDRESS HERE FROM STEP 1
const CONTRACT_ADDRESS = "0x1E69776cf747ed010FF1320D1512E6c0cf5cc92D"; 

const ABI = [
    "function mintBond(string _name, string _isin, string _docHash, string _ipfsLink, uint256 _yieldRate, uint256 _totalSupply) public",
    "function verifyIntegrity(uint256 _bondId, string _hashToCheck) public view returns (bool)"
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [minting, setMinting] = useState(false);

  // 1. Send PDF to Python Backend
  const handleAnalyze = async () => {
    if (!file) return alert("Please select a PDF first");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Assuming Python runs on port 5000
      const res = await axios.post("http://localhost:5000/analyze_bond", formData);
      setAiData(res.data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to Python Backend. Is it running?");
    }
    setLoading(false);
  };

  // 2. Mint on Celo
  const handleMint = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    setMinting(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const tx = await contract.mintBond(
        aiData.ai_data.bond_name,
        aiData.ai_data.isin,
        aiData.hash,
        aiData.ipfs_cid,
        aiData.ai_data.detected_yield,
        10000 // Total Supply
      );
      
      await tx.wait();
      setTxHash(tx.hash);
      alert("Success! Bond Tokenized on Celo Sepolia.");
    } catch (err) {
      console.error(err);
      alert("Transaction Failed. Check Console.");
    }
    setMinting(false);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-800 pb-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <ShieldCheck className="w-10 h-10" /> VerifyChain RWA
            </h1>
            <p className="text-gray-500 mt-2 text-sm">East-India Blockchain Summit 2.0</p>
          </div>
          <span className="bg-green-900/30 text-green-400 border border-green-600 px-4 py-1 rounded-full text-sm">
            Celo Sepolia
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* LEFT: UPLOAD */}
          <div className="border border-green-800 p-8 rounded-xl bg-gray-900/50 backdrop-blur">
            <h2 className="text-2xl mb-6 flex items-center gap-2 text-white">
              <Upload className="text-green-500" /> 1. Issuer Upload
            </h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-green-800 hover:border-green-500 transition rounded-lg p-8 text-center cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <p className="text-gray-400">
                  {file ? file.name : "Drag & Drop Bond PDF here"}
                </p>
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
                  <p className="flex justify-between"><span>Bond Name:</span> <span className="text-white">{aiData.ai_data.bond_name}</span></p>
                  <p className="flex justify-between"><span>ISIN:</span> <span className="text-white">{aiData.ai_data.isin}</span></p>
                  <p className="flex justify-between"><span>Risk:</span> <span className="text-white">{aiData.ai_data.risk_rating}</span></p>
                  <div className="h-px bg-green-900 my-2"></div>
                  <p className="text-xs text-gray-500 break-all">Doc Hash: {aiData.hash}</p>
                </div>

                <button 
                  onClick={handleMint}
                  disabled={minting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition flex justify-center items-center gap-2"
                >
                  {minting ? <Loader2 className="animate-spin" /> : <><CheckCircle /> Mint on Celo Blockchain</>}
                </button>

                {txHash && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded text-center">
                    <p className="text-green-400 font-bold">Tokenized Successfully!</p>
                    <a 
                      href={`https://celo-sepolia.blockscout.com/tx/${txHash}`} 
                      target="_blank"
                      rel="noreferrer" 
                      className="text-blue-400 underline text-sm block mt-1"
                    >
                      View Transaction on Explorer
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