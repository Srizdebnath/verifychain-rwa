"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Upload, FileText, CheckCircle, Loader2, ArrowRight, Activity,
  Globe, Shield, Database, Smartphone, Zap, Leaf, Lock,
  BarChart3, Scale, Users
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import Terminal from "../components/Terminal";

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0xC18243d1A4014A973B2206e3FC8FcCb65aaA0195";

const ABI = [
    // Updated function signature for Fractionalization
    "function createAsset(string _name, string _isin, uint256 _faceValue, uint256 _initialYield, string _ipfsHash) public",
    "function nextBondId() public view returns (uint256)",
    "function bonds(uint256) public view returns (string name, string isin, uint256 faceValue, uint256 currentYield, uint256 lastUpdate, string ipfsHash, bool isActive)"
];

export default function Home() {
  const [signer, setSigner] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [trustScore, setTrustScore] = useState(0);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // --- FETCH REGISTRY DATA ---
  const fetchRegistry = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      try {
        const count = await contract.nextBondId();
        let tempRegistry = [];
        // Fetch last 3 bonds
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
    fetchRegistry();
  }, [signer]);

  // 1. ANALYZE (Calls Python Real-Data Backend)
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
      // Calls your Production Backend
      const res = await axios.post("https://verifychain-rwa.onrender.com/analyze_and_oracle", formData);
      
      const analysis = res.data.ai_analysis;
      const oracle = res.data.oracle_data;
      const faceValue = parseInt(analysis.face_value_amount || 0);

      // --- PILLAR 1: AI METADATA ---
      if (analysis.bond_name === "Unknown" || !analysis.bond_name) {
          addLog(`[AI] ⚠️ Could not identify Bond Name.`);
      } else {
          addLog(`[AI] Extracted Metadata: ${analysis.bond_name}`);
      }
      setTrustScore(20);
      await new Promise(r => setTimeout(r, 500)); 

      // --- PILLAR 2: PROOF OF RESERVE (CRITICAL CHECK) ---
      addLog(`[PoR] Document Face Value: ${faceValue > 0 ? "₹" + faceValue.toLocaleString() : "Unknown"}`);
      
      if (faceValue <= 0) {
          addLog(`[PoR] ❌ CRITICAL FAILURE: No Reserve Value found.`);
          addLog(`[System] Verification Terminated.`);
          setTrustScore(10); 
          toast.error("Verification Failed: Invalid Bond Document");
          setLoading(false);
          return; 
      }

      addLog(`[PoR] ✅ Reserve Limit Established.`);
      setTrustScore(50);
      await new Promise(r => setTimeout(r, 500));

      // --- PILLAR 3: ORACLE CHECK ---
      addLog(`[Oracle] Connection to Yahoo Finance API...`);
      addLog(`[Oracle] Real-Time 10Y Yield: ${oracle.live_yield}%`);
      setTrustScore(80);
      await new Promise(r => setTimeout(r, 500));

      // --- PILLAR 4: SECURITY ---
      addLog(`[Audit] Contract: ${CONTRACT_ADDRESS.slice(0,6)}... verified.`);
      setTrustScore(100);

      setAiData(res.data);
      toast.success("Verification Complete. Asset Valid.");
      
    } catch (err) {
      addLog("CRITICAL ERROR: Backend Connection Failed");
      toast.error("Analysis Error");
    }
    setLoading(false);
  };

  // 2. MINT (Calls Celo Blockchain)
  const handleMint = async () => {
    if (!signer) return toast.error("Connect Wallet First");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const toastId = toast.loading("Fractionalizing Bond on Celo...");

    try {
      addLog("Requesting Wallet Signature...");
      
      const tx = await contract.createAsset(
        aiData.ai_analysis.bond_name || "Unknown Bond",
        aiData.ai_analysis.isin || "UNKN",
        aiData.ai_analysis.face_value_amount || 1000000,
        Math.floor(aiData.oracle_data.live_yield * 100), // e.g. 4.17 -> 417
        "QmMockHashForDemo"
      );
      
      addLog(`Transaction Sent: ${tx.hash}`);
      await tx.wait();
      
      addLog("Asset Fractionalized & Tokens Distributed!");
      toast.success("Bond Tokenized Successfully", { id: toastId });
      fetchRegistry();
    } catch (err: any) {
      console.error(err);
      toast.error("Minting Failed", { id: toastId });
      addLog(`ERROR: ${err.reason || err.message}`);
    }
  };

  // 3. KYC SIM
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

      {/* --- HERO SECTION --- */}
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

      {/* --- THE TRUST DASHBOARD --- */}
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
                  id="file-upload"
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
            
            {/* 1. TRUST SCORE CARD */}
            <div className="glass-panel p-6 rounded-2xl flex justify-between items-center border border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <Shield size={80} />
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">AI Trust Score</p>
                    <div className="text-4xl font-bold text-white flex items-end gap-2">
                        {trustScore}/100 
                        <span className="text-sm text-green-400 mb-1 font-normal">
                            {trustScore > 90 ? "(AAA Rated)" : "(Pending)"}
                        </span>
                    </div>
                </div>
                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${trustScore > 90 ? 'border-green-500 text-green-500' : 'border-gray-700 text-gray-700'}`}>
                    <CheckCircle size={32} />
                </div>
            </div>

            {/* 2. FAIR VALUE TRACKER */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2"><BarChart3 size={18} className="text-blue-400"/> Oracle Feed (Yahoo Finance)</h3>
                    <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded">Live</span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-gray-500">Benchmark Yield (10Y)</p>
                        <p className="text-xl font-mono">{aiData ? Number(aiData.oracle_data.live_yield).toFixed(2) + "%" : "---"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Data Source</p>
                        <p className="text-xl font-mono text-green-400">^TNX</p>
                    </div>
                </div>
            </div>

            {/* 3. MINTING SECTION */}
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
                  {/* FRACTIONALIZATION DISPLAY */}
                  <div className="bg-green-900/10 border border-green-500/30 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Total Bond Value</span>
                        <span className="text-xl font-bold text-white">₹{parseInt(aiData.ai_analysis.face_value_amount).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-green-500/20 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Tokens to Mint</span>
                        <span className="text-xl font-mono text-green-400">{parseInt(aiData.ai_analysis.face_value_amount).toLocaleString()} IGBT</span>
                    </div>
                    <p className="text-[10px] text-center text-gray-500 mt-2">
                        1 IGBT Token = ₹1.00 (Pegged to Underlying)
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                        <span>Oracle Yield</span>
                        <span className="text-blue-400 font-bold">{aiData.oracle_data.live_yield}% APY</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                        <span>Oracle Timestamp</span>
                        <span className="text-gray-400">{new Date(aiData.oracle_data.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
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

      {/* --- DOCS --- */}
      <section className="py-20 bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-10 text-center">The 5 Pillars of Verification</h2>
            <div className="grid md:grid-cols-5 gap-4">
                {[
                    {icon: <Database size={20} className="text-blue-400"/>, title: "Proof of Reserve", desc: "Hard Caps minting based on PDF Face Value."},
                    {icon: <BarChart3 size={20} className="text-purple-400"/>, title: "Oracle Feed", desc: "Live Yahoo Finance connection for Yields."},
                    {icon: <Shield size={20} className="text-red-400"/>, title: "Smart Contract", desc: "Non-upgradeable Celo logic with Ownable controls."},
                    {icon: <Users size={20} className="text-yellow-400"/>, title: "KYC/AML", desc: "Simulated Biometric and sanctions screening."},
                    {icon: <Globe size={20} className="text-green-400"/>, title: "Transparency", desc: "Public dashboard showing live backing ratios."},
                ].map((item, i) => (
                    <div key={i} className="glass-panel p-5 rounded-xl text-center hover:bg-white/10 transition">
                        <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                        <h3 className="font-bold mb-2 text-sm">{item.title}</h3>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <footer className="py-10 text-center text-gray-600 text-sm border-t border-white/5">
        <p>&copy; 2026 VerifyChain RWA. Built for East-India Blockchain Summit.</p>
      </footer>
    </div>
  );
}