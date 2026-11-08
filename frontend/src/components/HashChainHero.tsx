"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Link as LinkIcon, Lock } from "lucide-react";

interface Block {
  id: number;
  action: string;
  actor: string;
  hash: string;
  prevHash: string;
  timestamp: string;
}

// Simple SHA-256 mock for the UI visualizer
function generateMockHash() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function HashChainHero() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    // Initialize with one block
    const initialHash = generateMockHash();
    setBlocks([
      {
        id: 1,
        action: "CONSENT_GRANTED",
        actor: "Patient (John D.)",
        hash: initialHash,
        prevHash: "0".repeat(64),
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Every 3 seconds, append a new block
    const interval = setInterval(() => {
      setBlocks((currentBlocks) => {
        const lastBlock = currentBlocks[currentBlocks.length - 1];
        const newHash = generateMockHash();
        
        const actions = [
          { action: "RECORD_VIEWED", actor: "Dr. Smith" },
          { action: "MFA_VERIFIED", actor: "Nurse Joy" },
          { action: "ACCESS_DENIED", actor: "Unknown Device" },
          { action: "DATA_EXPORTED", actor: "Lab Tech" },
          { action: "BREAK_GLASS", actor: "Dr. Emergency" },
        ];
        
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        const newBlock = {
          id: lastBlock.id + 1,
          action: randomAction.action,
          actor: randomAction.actor,
          hash: newHash,
          prevHash: lastBlock.hash, // Cryptographic link
          timestamp: new Date().toLocaleTimeString(),
        };

        // Keep only the last 4 blocks to fit on screen
        return [...currentBlocks.slice(-3), newBlock];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
      
      <div className="mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-slate-200">
          <ShieldCheck className="h-5 w-5 text-trust-green" />
          <h3 className="text-sm font-semibold tracking-wide">Live Audit Chain</h3>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trust-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-trust-green"></span>
        </span>
      </div>

      <div className="space-y-3 relative z-10">
        {blocks.map((block, i) => (
          <div 
            key={block.id} 
            className="group relative rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:bg-slate-800"
            style={{ animation: `slideUp 0.4s ease-out forwards` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">Block #{block.id}</span>
              <span className="text-xs text-slate-500">{block.timestamp}</span>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">{block.action}</span>
              <span className="text-xs text-slate-400">{block.actor}</span>
            </div>

            <div className="space-y-1.5 rounded-lg bg-slate-950/50 p-2 text-[10px] font-mono break-all leading-tight">
              <div className="flex items-start gap-1 text-slate-500">
                <Lock className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Hash: <span className="text-brand-300">{block.hash}</span></span>
              </div>
              <div className="flex items-start gap-1 text-slate-500">
                <LinkIcon className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Prev: <span className="text-slate-600">{block.prevHash}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center relative z-10">
        <p className="text-xs text-slate-500">Cryptographically linked & tamper-evident</p>
      </div>
    </div>
  );
}
