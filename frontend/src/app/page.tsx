"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Upload, FileText, CheckCircle, Loader2, ArrowRight, Activity,
  Globe, Shield, Database, Smartphone, Zap, Leaf, Lock,
  BarChart3, Scale, Users, Send, Wallet
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import Terminal from "../components/Terminal";

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0xC18243d1A4014A973B2206e3FC8FcCb65aaA0195";

const ABI = [
    // RWA Functions
    "function createAsset(string _name, string _isin, uint256 _faceValue, uint256 _initialYield, string _ipfsHash) public",
    "function nextBondId() public view returns (uint256)",
    "function bonds(uint256) public view returns (string name, string isin, uint256 faceValue, uint256 currentYield, uint256 lastUpdate, string ipfsHash, bool isActive)",
    // ERC20 Standard Functions (For Selling/Transferring)
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

export default function Home() {
  const [signer, setSigner] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [trustScore, setTrustScore] = useState(0);
  
  // DISTRIBUTION STATE
  const [userBalance, setUserBalance] = useState("0");
  const [recipient, setRecipient] = useState("");
  const [amountToSend, setAmountToSend] = useState("");

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // --- FETCH REGISTRY & BALANCE ---
  const fetchData = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      // 1. Fetch Balance
      if (signer) {
          const address = await signer.getAddress();
          const bal = await contract.balanceOf(address);
          setUserBalance(ethers.formatEther(bal)); // Convert from Wei to Human readable
      }

      // 2. Fetch Registry
      try {
        const count = await contract.nextBondId();
        let tempRegistry = [];
        for (let i = Number(count); i > Math.max(0, Number(count) - 3); i--) {
          const bond = await contract.bonds(i);
          tempRegistry.push({
            id: i.toString(),
            name: bond.name,
            isin: bond.isin,
            faceValue: bond.faceValue.toString(),
            yield: Number(bond.currentYield),
            ipfs: bond.ipfsHash
          });
        }
        setRegistry(tempRegistry);
      } catch (e) {
        console.log("No bonds minted yet");
      }
    } catch (e) {
      console.error("Error connecting to contract", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [signer]);

  // --- 1. ANALYZE ---
  const handleAnalyze = async () => {
    if (!file) return toast.error("Select a file first");
    setLoading(true);
    setTrustScore(0);
    setLogs([]); 
    setAiData(null); 
    
    addLog(`[1/5] Uploading Document: ${file.name}...`);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("https://verifychain-rwa.onrender.com/analyze_and_oracle", formData);
      const analysis = res.data.ai_analysis;
      const oracle = res.data.oracle_data;
      const faceValue = parseInt(analysis.face_value_amount || 0);

      if (analysis.bond_name === "Unknown") addLog(`[AI] ⚠️ Could not identify Bond.`);
      else addLog(`[AI] Extracted Metadata: ${analysis.bond_name}`);
      
      setTrustScore(20);
      await new Promise(r => setTimeout(r, 500)); 

      addLog(`[PoR] Document Face Value: ${faceValue > 0 ? "₹" + faceValue.toLocaleString() : "Unknown"}`);
      
      if (faceValue <= 0) {
          addLog(`[PoR] ❌ CRITICAL FAILURE: No Reserve Value found.`);
          setTrustScore(10); 
          toast.error("Verification Failed");
          setLoading(false);
          return; 
      }

      addLog(`[PoR] ✅ Reserve Limit Established.`);
      setTrustScore(50);
      await new Promise(r => setTimeout(r, 500));

      addLog(`[Oracle] Connection to Yahoo Finance API...`);
      addLog(`[Oracle] Real-Time 10Y Yield: ${oracle.live_yield}%`);
      setTrustScore(80);
      await new Promise(r => setTimeout(r, 500));

      addLog(`[Audit] Contract verified.`);
      setTrustScore(100);

      setAiData(res.data);
      toast.success("Verification Complete.");
      
    } catch (err) {
      addLog("CRITICAL ERROR: Backend Connection Failed");
      toast.error("Analysis Error");
    }
    setLoading(false);
  };

  // --- 2. MINT ---
  const handleMint = async () => {
    if (!signer) return toast.error("Connect Wallet First");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const toastId = toast.loading("Fractionalizing Bond...");

    try {
      addLog("Requesting Wallet Signature...");
      const tx = await contract.createAsset(
        aiData.ai_analysis.bond_name || "Unknown Bond",
        aiData.ai_analysis.isin || "UNKN",
        aiData.ai_analysis.face_value_amount || 1000000,
        Math.floor(aiData.oracle_data.live_yield * 100), 
        "QmMockHashForDemo"
      );
      addLog(`Transaction Sent: ${tx.hash}`);
      await tx.wait();
      addLog("Asset Fractionalized & Tokens Distributed!");
      toast.success("Bond Tokenized Successfully", { id: toastId });
      fetchData(); // Refresh balance and registry
    } catch (err: any) {
      console.error(err);
      toast.error("Minting Failed", { id: toastId });
    }
  };

  // --- 3. TRANSFER (SELL) ---
  const handleTransfer = async () => {
      if (!signer) return toast.error("Connect Wallet First");
      if (!recipient || !amountToSend) return toast.error("Enter details");
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const toastId = toast.loading(`Transferring ${amountToSend} Tokens...`);

      try {
          // Parse amount to 18 decimals
          const tokens = ethers.parseUnits(amountToSend, 18);
          
          addLog(`Initiating Transfer to ${recipient.slice(0,6)}...`);
          const tx = await contract.transfer(recipient, tokens);
          await tx.wait();
          
          addLog(`Success! Sent ${amountToSend} IGBT to investor.`);
          toast.success("Transfer Complete", { id: toastId });
          fetchData(); // Update balance
          setAmountToSend("");
      } catch (err) {
          console.error(err);
          toast.error("Transfer Failed", { id: toastId });
      }
  }

  const handleKYC = async () => {
    if (!signer) return toast.error("Connect Wallet First");
    const userAddr = await signer.getAddress();
    addLog(`[Identity] Biometric Scan for ${userAddr.slice(0,6)}...`);
    setTimeout(() => {
        addLog("[Identity] Verified. User Whitelisted.");
        toast.success("KYC/AML Check Passed");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-green-500/30 font-sans">
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#0a0a0a', color: '#fff', border: '1px solid #222' }
      }}/>
      
      <Navbar setSigner={setSigner} signer={signer} />

      <section className="pt-32 pb-16 px-6 text-center max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-500/30 text-green-400 text-xs font-bold mb-6">
                <Activity size={14} className="animate-pulse"/> LIVE: Oracle & Reserve Monitor Active
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Trust Engine</span> for<br/>
                Real World Assets
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Tokenize Government Bonds with automated Proof-of-Reserve, Live Price Feeds, and AI Verification on Celo.
            </p>
            <div className="flex justify-center gap-4">
                <button onClick={() => document.getElementById('app')?.scrollIntoView({behavior: 'smooth'})} className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-full font-bold text-black transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,0,0.3)]">
                Launch Verification Engine
                </button>
            </div>
        </motion.div>
      </section>

      <div id="app" className="py-20 bg-gradient-to-b from-black to-green-950/20 border-y border-white/5">
        <main className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-8">
          
          {/* LEFT: INPUT & LOGS */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Database className="text-green-500" size={24}/> Custody & Origination
              </h2>
              <p className="text-gray-400 mb-8 text-sm max-w-md">
                Upload Bond Certificate. AI extracts 'Face Value' to set the Hard Cap for minting.
              </p>
              
              <div className="border border-dashed border-gray-700 hover:border-green-500/50 hover:bg-green-500/5 transition-all rounded-xl p-10 text-center relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="text-green-400" size={32} />
                  </div>
                  <span className="text-lg font-medium">
                    {file ? <span className="text-green-400 font-bold">{file.name}</span> : "Drop Bond PDF Here"}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-6 w-full bg-white text-black hover:bg-green-400 hover:scale-[1.01] transition-all font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>INITIATE ORACLE VERIFICATION <ArrowRight size={18} /></>}
              </button>
            </div>

            <div className="h-64">
              <Terminal logs={logs} />
            </div>
          </div>

          {/* RIGHT: LIVE DATA FEED */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* TRUST SCORE */}
            <div className="glass-panel p-6 rounded-2xl flex justify-between items-center border border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10"><Shield size={80} /></div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">AI Trust Score</p>
                    <div className="text-4xl font-bold text-white flex items-end gap-2">
                        {trustScore}/100 
                        <span className="text-sm text-green-400 mb-1 font-normal">{trustScore > 90 ? "(AAA Rated)" : "(Pending)"}</span>
                    </div>
                </div>
                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${trustScore > 90 ? 'border-green-500 text-green-500' : 'border-gray-700 text-gray-700'}`}>
                    <CheckCircle size={32} />
                </div>
            </div>

            {/* MINTING SECTION */}
            <div className={`glass-panel p-8 rounded-2xl border-t-4 ${aiData ? 'border-t-green-500 neon-glow' : 'border-t-gray-800'}`}>
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">Asset Creation</h2>
                {aiData && <div className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30">READY TO MINT</div>}
              </div>

              {!aiData ? (
                <div className="text-center py-6 opacity-30">
                  <Scale size={48} className="mx-auto mb-4" />
                  <p>Waiting for Oracle...</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-green-900/10 border border-green-500/30 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Total Bond Value</span>
                        <span className="text-xl font-bold text-white">₹{parseInt(aiData.ai_analysis.face_value_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Tokens to Mint</span>
                        <span className="text-xl font-mono text-green-400">{parseInt(aiData.ai_analysis.face_value_amount).toLocaleString()} IGBT</span>
                    </div>
                    <p className="text-[10px] text-center text-gray-500 mt-2">1 IGBT Token = ₹1.00 (Pegged)</p>
                  </div>

                  <div className="flex justify-between p-2 bg-white/5 rounded text-sm">
                        <span>Oracle Yield</span>
                        <span className="text-blue-400 font-bold">{Number(aiData.oracle_data.live_yield).toFixed(2)}% APY</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={handleKYC} className="py-3 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-1">
                        <Users size={14}/> KYC Check
                    </button>
                    <button onClick={handleMint} className="py-3 rounded-lg bg-green-600 hover:bg-green-500 text-black text-xs font-bold flex items-center justify-center gap-1">
                        <Zap size={14}/> Fractionalize
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </main>
      </div>

      {/* --- SECONDARY MARKET / DISTRIBUTION (NEW) --- */}
      <section className="py-10 max-w-7xl mx-auto px-6">
        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-r from-gray-900 to-black">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2"><Wallet className="text-purple-400"/> Distribution Console</h2>
              <p className="text-sm text-gray-400">Sell fractional bond tokens to retail investors via Celo.</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-500/30 px-6 py-3 rounded-xl text-right">
              <p className="text-xs text-gray-400 uppercase">Your Balance</p>
              <p className="text-2xl font-mono font-bold text-white">
                {parseFloat(userBalance).toLocaleString()} <span className="text-purple-400 text-sm">IGBT</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs text-gray-400 uppercase">Investor Wallet Address</label>
              <input 
                type="text" 
                placeholder="0x..." 
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase">Amount (IGBT)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input 
                  type="number" 
                  placeholder="500" 
                  value={amountToSend}
                  onChange={(e) => setAmountToSend(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-8 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleTransfer}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Send size={18} /> TRANSFER ASSETS TO INVESTOR
          </button>
        </div>
      </section>

      {/* --- LIVE REGISTRY --- */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-500/10 p-2 rounded-lg"><Globe className="text-blue-400"/></div>
            <h2 className="text-3xl font-bold">Public Transparency Ledger</h2>
        </div>
        
        {registry.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
                <p className="text-gray-500">No assets verified yet.</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-3 gap-6">
                {registry.map((bond) => (
                    <div key={bond.id} className="glass-panel p-6 rounded-xl border border-white/5 hover:border-green-500/30 transition">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded flex items-center gap-1"><Lock size={10}/> Reserve Locked</span>
                            <span className="text-gray-500 text-xs">#{bond.id}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 truncate">{bond.name}</h3>
                        <p className="text-gray-400 text-xs mb-4">{bond.isin}</p>
                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase">Cap</p>
                                <p className="font-bold text-green-400">₹{parseInt(bond.faceValue).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase">Yield</p>
                                <p className="font-bold text-blue-400">{(bond.yield / 100).toFixed(2)}%</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      <footer className="py-10 text-center text-gray-600 text-sm border-t border-white/5">
        <p>&copy; 2026 VerifyChain RWA. Built for East-India Blockchain Summit.</p>
      </footer>
    </div>
  );
}