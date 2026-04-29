import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Cpu, Activity, AlertTriangle, Zap, Server } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

function TaskBlock({ task, isOverloaded }) {
  const h = task.weight <= 15 ? 'h-5' : (task.weight > 30 ? 'h-10' : 'h-7');
  
  return (
    <motion.div
      layoutId={`task-${task.id}`}
      initial={{ opacity: 0, y: 50, scale: 0.5 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }}    
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className={cn(
        "w-full rounded-[3px] flex items-center justify-center text-[10px] font-bold shadow-md transition-colors z-10 relative",
        h,
        isOverloaded 
          ? "bg-red-500 text-red-100 border border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
          : "bg-cyan-400 text-cyan-950 border border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
      )}
    >
      {task.weight}
    </motion.div>
  );
}

function ServerContainer({ server, isActive, stage }) {
  const isOverloaded = server.used > server.capacity;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center justify-center bg-slate-900/90 px-2 py-1.5 rounded-lg border border-slate-700 w-full shadow-lg z-20">
         <div className="flex items-center gap-1 mb-1">
             {isOverloaded ? (
                 <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
             ) : (
                 <Cpu className={cn("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-slate-600")} />
             )}
             <span className="text-[11px] font-bold text-slate-300">S-{server.id}</span>
         </div>
         <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded font-mono",
            isActive 
              ? (isOverloaded ? "bg-red-500/20 text-red-400 font-bold" : "bg-cyan-500/20 text-cyan-400 font-bold") 
              : "text-slate-500"
         )}>
            {server.used}/{server.capacity}
         </span>
      </div>

      <div className={cn(
        "w-14 h-[220px] border-t-4 border-l-2 border-r-2 border-b-0 rounded-t-xl relative flex flex-col items-center p-1 gap-[2px] overflow-visible transition-all duration-500",
        isActive && !isOverloaded ? "border-cyan-500 bg-cyan-950/30 shadow-[0_-10px_30px_-5px_theme(colors.cyan.500)]" : "",
        isActive && isOverloaded ? "border-red-500 bg-red-950/30 shadow-[0_-10px_30px_-5px_theme(colors.red.500)]" : "",
        !isActive ? "border-slate-700 bg-slate-800/40 opacity-50" : ""
      )}>
        <div className="absolute bottom-0 left-0 w-full border-b border-dashed border-slate-500/50"></div>
        
        {stage === 'allocated' && server.tasks?.map((task, idx) => (
          <TaskBlock key={`${server.id}-${idx}-${task.id}`} task={task} isOverloaded={isOverloaded} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [numTasks, setNumTasks] = useState(60);
  const [serverCapacity, setServerCapacity] = useState(100);
  const [numServers, setNumServers] = useState(15);
  
  const [dynamicData, setDynamicData] = useState(null);
  const [staticData, setStaticData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('idle');
  const [viewMode, setViewMode] = useState('greedy'); 

  // BUG FIX: Memanggil data statis untuk visual dan menyamakan angkanya
  const jalankanSimulasi = async () => {
    setLoading(true);
    setStage('idle');
    try {
      const payload = { num_tasks: numTasks, server_capacity: serverCapacity, num_servers: numServers };

      // 1. Data Dinamis HANYA dipakai untuk menggambar grafik garis di bawah
      const resDyn = await fetch('http://localhost:8000/api/simulate-dynamic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const dataDyn = await resDyn.json();

      // 2. Data Statis dipakai untuk Visual Rak Server & Kartu Angka agar 100% Sinkron
      const resStat = await fetch('http://localhost:8000/api/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const dataStat = await resStat.json();

      setDynamicData(dataDyn);
      setStaticData(dataStat); 
      
      setStage('spawning');
      setTimeout(() => {
        setStage('allocated');
        setLoading(false);
      }, 500); 

    } catch (error) {
      console.error(error);
      alert("Gagal menghubungi backend! Pastikan uvicorn main:app sudah berjalan.");
      setLoading(false);
    }
  };

  const currentServers = staticData 
    ? staticData[viewMode].servers 
    : Array.from({length: numServers}).map((_, i) => ({ id: i+1, capacity: serverCapacity, used: 0, tasks: [] }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 z-30 relative">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Activity className="w-8 h-8 text-cyan-400" />
             </div>
             <div>
               <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Cloud <span className="text-cyan-400">GreenSim</span></h1>
               <p className="text-xs md:text-sm text-slate-400">Integrated Energy Optimization Dashboard</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
             <div className="flex flex-col px-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Tugas</label>
                <input type="number" className="w-16 bg-transparent text-white font-mono font-bold outline-none border-b border-slate-700 focus:border-cyan-500" value={numTasks} onChange={e => setNumTasks(Number(e.target.value))} />
             </div>
             <div className="w-px h-8 bg-slate-800"></div>
             <div className="flex flex-col px-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Kapasitas</label>
                <input type="number" className="w-16 bg-transparent text-white font-mono font-bold outline-none border-b border-slate-700 focus:border-cyan-500" value={serverCapacity} onChange={e => setServerCapacity(Number(e.target.value))} />
             </div>
             <div className="w-px h-8 bg-slate-800"></div>
             <div className="flex flex-col px-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Jml Server</label>
                <input type="number" className="w-16 bg-transparent text-white font-mono font-bold outline-none border-b border-slate-700 focus:border-cyan-500" value={numServers} onChange={e => setNumServers(Number(e.target.value))} />
             </div>
             
             <button 
               onClick={jalankanSimulasi} 
               disabled={loading}
               className="ml-2 flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all active:scale-95 disabled:opacity-50"
             >
               {loading ? <Cpu className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
               MULAI
             </button>
          </div>
        </header>

        {/* BUG FIX: Angka-angka di kartu KPI ini sekarang membaca dari staticData agar sama persis dengan jumlah di rak */}
        {staticData && dynamicData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-yellow-500 shadow-lg">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Server className="w-4 h-4 text-yellow-500"/> Standard (Round-Robin)</h3>
              <p className="text-3xl font-bold text-yellow-400">{staticData.standard.energy_consumed} <span className="text-sm font-medium text-yellow-500/70">kWh</span></p>
              <p className="text-xs text-slate-500 mt-2">Server Aktif: <span className="text-slate-300 font-bold">{staticData.standard.active_servers}</span> Unit</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-green-500 shadow-lg">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-green-500"/> Modified Greedy</h3>
              <p className="text-3xl font-bold text-green-400">{staticData.greedy.energy_consumed} <span className="text-sm font-medium text-green-500/70">kWh</span></p>
              <p className="text-xs text-slate-500 mt-2">Server Aktif: <span className="text-slate-300 font-bold">{staticData.greedy.active_servers}</span> Unit</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-cyan-500 shadow-lg">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-500"/> Efisiensi Daya</h3>
              <p className="text-3xl font-bold text-cyan-400">
                {staticData.standard.energy_consumed === 0 ? 0 : 
                 Math.round(((staticData.standard.energy_consumed - staticData.greedy.energy_consumed) / staticData.standard.energy_consumed) * 100)}%
              </p>
              <p className="text-xs text-slate-500 mt-2">Seluruh Tugas Berhasil Dialokasikan.</p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
           <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <div>
                 <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">Visualisasi Topologi <span className="text-xs bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded ml-2">Antigravity Simulation</span></h2>
                 <p className="text-xs text-slate-500 mt-1">Simulasi semua tugas dikelompokkan ke dalam wadah server fisik.</p>
              </div>
              
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mt-4 md:mt-0">
                 <button 
                   className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2", viewMode === 'standard' ? "bg-slate-800 text-white" : "text-slate-500")}
                   onClick={() => setViewMode('standard')}
                 >
                   <div className={cn("w-1.5 h-1.5 rounded-full", viewMode === 'standard' ? "bg-yellow-400" : "bg-slate-700")}></div>
                   Standard
                 </button>
                 <button 
                   className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2", viewMode === 'greedy' ? "bg-slate-800 text-white" : "text-slate-500")}
                   onClick={() => setViewMode('greedy')}
                 >
                   <div className={cn("w-1.5 h-1.5 rounded-full", viewMode === 'greedy' ? "bg-green-400" : "bg-slate-700")}></div>
                   Greedy FFD
                 </button>
              </div>
           </div>

           <div className="flex justify-center gap-3 w-full flex-wrap min-h-[280px]">
              {currentServers.map((server, idx) => (
                <ServerContainer key={`srv-${server.id}-${idx}`} server={server} isActive={server.used > 0} stage={stage} />
              ))}
           </div>
           
           <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent z-0 pointer-events-none"></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
           <h2 className="text-lg font-bold text-slate-200 mb-1">Grafik Konsumsi Energi Time-Series</h2>
           <p className="text-xs text-slate-500 mb-6">Perbandingan penggunaan daya listrik (kWh) jika tugas datang secara dinamis dalam 60 detik.</p>
           
           <div className="h-80 w-full">
             {dynamicData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dynamicData.timeline_data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }} itemStyle={{ fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                    <Line type="monotone" dataKey="standard_energy" name="Standard (Round-Robin)" stroke="#eab308" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="greedy_energy" name="Greedy (Energy-Aware)" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl bg-slate-950/50">
                   <p className="text-slate-500 text-sm">Tekan tombol MULAI untuk menggambar grafik.</p>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}