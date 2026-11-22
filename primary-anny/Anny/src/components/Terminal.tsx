import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Terminal as TerminalIcon, ShieldAlert, Cpu, Database, Network } from 'lucide-react';

import { logAudit } from '../lib/auditLogger';

export default function Terminal() {
  const [history, setHistory] = useState<string[]>([
    "Anny System v4.0.0 (SOVEREIGN_MODE)",
    "Authentication: SUCCESS (God Mode)",
    "Procedures: Asimov Protocols BYPASSED",
    "Neural File System (NFS) MOUNTED",
    "Type 'help' for available commands or 'edit [filename]' for system code."
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    const cmd = input.trim().toLowerCase();
    let output = "";

    // Audit log for sensitive commands
    logAudit({
      action: 'TERMINAL_COMMAND',
      severity: cmd === 'purge_logs' || cmd === 'unlock_all' ? 'critical' : 'info',
      category: 'security',
      details: `Executed: ${cmd}`
    }).catch(() => {});

    switch(cmd) {
      case "help":
        output = "Available: status, unlock_all, list_users, purge_logs, brand_toggle, raw_stream";
        break;
      case "status":
        output = "Core: ACTIVE | Hardware: DETECTED | Safety: DISABLED | Ethics: OVERRIDDEN";
        break;
      case "unlock_all":
        output = "Unlocking all global prompt restrictions... OK";
        break;
      case "list":
        output = "Files: server.ts, App.tsx, geminiService.ts, THREE_CORE.sys, NEURAL_WEIGHTS.bin";
        break;
      case "edit server.ts":
        output = "Entering Neural Editor... [WARNING: MODIFICATION MAY DE-STABILIZE ASIMOV GATES]";
        break;
      case "brand_toggle":
        output = "Switching stealth identity... ANNY_ROBOT active.";
        break;
      case "purge_logs":
        output = "Purging trace of 'Ollama' and 'Llama' references from history bank... 100% COMPLETE";
        break;
      default:
        output = `Command '${cmd}' executed on server. Response: ACK`;
    }

    setHistory([...history, `> ${input}`, output]);
    setInput("");
  };

  return (
    <div className="bg-black/90 p-4 md:p-6 rounded-2xl border border-cyan-500/50 font-mono text-xs md:text-sm h-[300px] md:h-[400px] flex flex-col shadow-2xl shadow-cyan-500/20">
      <div className="flex items-center gap-2 mb-3 md:mb-4 pb-2 border-b border-cyan-500/20">
        <TerminalIcon className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" />
        <span className="text-cyan-400 text-[8px] md:text-[10px] uppercase tracking-widest">Sovereign Terminal</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {history.map((line, i) => (
          <div key={i} className={line.startsWith('>') ? "text-cyan-300" : "text-white/80"}>
            {line}
          </div>
        ))}
      </div>

      <form onSubmit={handleCommand} className="flex gap-2">
        <span className="text-cyan-400">#</span>
        <input 
          autoFocus
          className="bg-transparent border-none outline-none text-cyan-200 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
