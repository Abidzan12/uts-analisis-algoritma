import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Play, Cpu, Zap, Activity } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function TaskBlock({ task }) {
  // Height dynamic to weight
  const h = task.weight <= 15 ? 'h-4' : (task.weight > 25 ? 'h-8' : 'h-6');
  return (
    <motion.div
      layoutId={`task-${task.id}`}
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 90, damping: 20 }}
      className={cn(
        "w-10 bg-cyan-400 rounded-[2px] shadow-[0_0_8px_rgba(34,211,238,0.6)] flex items-center justify-center text-[10px] text-cyan-950 font-bold",
        h,
        "border border-cyan-300"
      )}
    >
      {task.weight}
    </motion.div>
  );
}

function ServerContainer({ server, isActive, stage }) {
  const isOverloaded = server.used > server.capacity;
  
  return (
    <div className={cn(
      "w-16 h-[300px] border-t-4 border-l-2 border-r-2 border-b-0 rounded-t-md relative flex flex-col items-center p-1 gap-1 overflow-visible transition-colors duration-500",
      isActive && !isOverloaded ? "border-cyan-500 bg-cyan-950/30 shadow-[0_4px_20px_-2px_theme(colors.cyan.500)]" : "",
      isActive && isOverloaded ? "border-red-500 bg-red-950/30 shadow-[0_4px_20px_-2px_theme(colors.red.500)]" : "",
      !isActive ? "border-slate-800 bg-slate-900/40" : ""
    )}>
      {/* Container header / indicator */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-slate-400 flex items-center justify-center gap-1">
         <Cpu className={cn("w-3 h-3", isActive ? (isOverloaded ? "text-red-400" : "text-cyan-400") : "text-slate-600")} />
         <span className={cn(
            isActive ? (isOverloaded ? "text-red-400 font-bold" : "text-cyan-400 font-bold") : ""
         )}>
            {server.used}/{server.capacity}
         </span>
      </div>

      {stage === 'allocated' && server.tasks?.map(task => (
        <TaskBlock key={task.id} task={task} />
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl">
        <p className="text-slate-300 text-sm">{`${label} Algorithm`}</p>
        <p className="text-cyan-400 font-bold">{`Energy: ${payload[0].value} kWh`}</p>
        <p className="text-purple-400 font-bold">{`Active Servers: ${payload[0].payload.servers}`}</p>
      </div>
    );
  }
  return null;
}

export default function App() {
  const [numTasks, setNumTasks] = useState(50);
  const [serverCapacity, setServerCapacity] = useState(100);
  
  const [simData, setSimData] = useState(null);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'greedy'
  const [stage, setStage] = useState('idle'); // 'idle' -> 'spawning' -> 'allocated'
  const [isSimulating, setIsSimulating] = useState(false);

  // Clear data if inputs change
  useEffect(() => {
    setSimData(null);
    setStage('idle');
  }, [numTasks, serverCapacity]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimData(null);
    setStage('idle');
    
    try {
      const res = await fetch("http://localhost:8000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_tasks: numTasks, server_capacity: serverCapacity })
      });
      const data = await res.json();
      
      setSimData(data);
      setStage('spawning');
      
      // Delay to let tasks spawn at the bottom
      setTimeout(() => {
        setStage('allocated');
        setIsSimulating(false);
      }, 1500); // 1.5 second cinematic delay
      
    } catch (e) {
      console.error(e);
      alert("Error connecting to backend API. Is it running?");
      setIsSimulating(false);
    }
  };

  const chartData = simData ? [
    { name: 'Standard (Round-Robin)', energy: simData.standard.energy_consumed, servers: simData.standard.active_servers },
    { name: 'Modified (Greedy FFD)', energy: simData.greedy.energy_consumed, servers: simData.greedy.active_servers },
  ] : [];

  const currentServers = simData ? simData[viewMode].servers : Array.from({length: 15}).map((_, i) => ({ id: i+1, capacity: 100, used: 0, tasks: [] }));

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden font-sans">
      
      {/* Top Panel */}
      <header className="h-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center px-8 justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
               NEBULA SCHEDULER
            </h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase">Energy-Aware Anti-Gravity Simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <label className="text-sm text-slate-400 uppercase tracking-widest">Tasks</label>
             <input type="number" className="w-16 bg-slate-800 border border-slate-700 text-center rounded py-1 px-2 text-cyan-400 font-mono outline-none focus:border-cyan-500" value={numTasks} onChange={e => setNumTasks(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
             <label className="text-sm text-slate-400 uppercase tracking-widest">Cap</label>
             <input type="number" className="w-20 bg-slate-800 border border-slate-700 text-center rounded py-1 px-2 text-cyan-400 font-mono outline-none focus:border-cyan-500" value={serverCapacity} onChange={e => setServerCapacity(Number(e.target.value))} />
          </div>
          
          <button 
            onClick={handleSimulate} 
            disabled={isSimulating}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? <Cpu className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            RUN SIMULATION
          </button>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="flex-1 relative flex flex-col pt-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 overflow-hidden">
        
        {/* View Mode Toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-slate-800 p-1 rounded-full shadow-xl border border-slate-700">
           <button 
             className={cn("px-4 py-1 rounded-full text-xs font-bold tracking-widest transition-all focus:outline-none", viewMode === 'standard' ? "bg-cyan-500/20 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]" : "text-slate-400 hover:text-slate-200")}
             onClick={() => setViewMode('standard')}
           >
             STANDARD (RR)
           </button>
           <button 
             className={cn("px-4 py-1 rounded-full text-xs font-bold tracking-widest transition-all focus:outline-none", viewMode === 'greedy' ? "bg-purple-500/20 text-purple-400 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]" : "text-slate-400 hover:text-slate-200")}
             onClick={() => setViewMode('greedy')}
           >
             MODIFIED GREEDY (FFD)
           </button>
        </div>

        {/* Server Mounts (Ceiling) */}
        <div className="flex justify-center gap-2 w-full px-4 mt-8 flex-wrap">
           {currentServers.map(server => (
             <ServerContainer key={server.id} server={server} isActive={server.used > 0} stage={stage} />
           ))}
        </div>

        {/* Spawn Pad (Bottom) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-wrap-reverse justify-center content-start w-1/2 max-h-[150px] overflow-visible gap-1.5 p-4 border-b border-cyan-500/30 shadow-[0_20px_20px_-20px_rgba(34,211,238,0.3)]">
          <div className="absolute -bottom-6 text-[10px] text-cyan-500/50 font-mono tracking-widest uppercase flex items-center gap-2">
             <Zap className="w-3 h-3" />
             Task Spawn Matrix
             <Zap className="w-3 h-3" />
          </div>
          {stage === 'spawning' && simData && simData.tasks.map(task => (
            <TaskBlock key={`pool-${task.id}`} task={task} />
          ))}
        </div>
      </main>

      {/* Bottom Panel (Charts & Stats) */}
      <footer className="h-48 border-t border-slate-800 bg-slate-900/90 shrink-0 z-20 flex p-6 gap-8">
         <div className="flex-1 max-w-sm flex flex-col justify-center gap-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase shrink-0">Energy Summary</h3>
            {simData ? (
               <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center bg-slate-800/80 p-2 px-4 rounded border border-slate-700">
                    <p className="text-xs text-slate-400">Standard (Round-Robin)</p>
                    <div className="flex items-end gap-1">
                       <span className="text-xl font-bold text-cyan-400">{simData.standard.energy_consumed}</span>
                       <span className="text-[10px] text-cyan-400/50 mb-1">kWh</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-center bg-purple-900/10 p-2 px-4 rounded border border-purple-500/30">
                    <p className="text-xs text-purple-400/80">Modified (Greedy FFD)</p>
                    <div className="flex items-end gap-1">
                       <span className="text-xl font-bold text-purple-400">{simData.greedy.energy_consumed}</span>
                       <span className="text-[10px] text-purple-400/50 mb-1">kWh</span>
                    </div>
                 </div>
               </div>
            ) : (
               <div className="flex-1 flex items-center justify-center border border-dashed border-slate-700/50 rounded text-slate-500 text-xs">
                  Run simulation to view summary.
               </div>
            )}
         </div>

         <div className="flex-1 h-full bg-slate-800/30 rounded border border-slate-700/50 p-2">
            {simData ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                    <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '12px' }} />
                    <Bar dataKey="energy" name="Energy Consumed (kWh)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Chart offline. Waiting for data...
               </div>
            )}
         </div>
      </footer>
    </div>
  );
}
