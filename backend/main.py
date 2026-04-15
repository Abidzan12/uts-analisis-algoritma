import random
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Task Scheduling Simulator API")

# Konfigurasi CORS agar React bisa berkomunikasi dengan FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationRequest(BaseModel):
    num_tasks: int = 50
    server_capacity: int = 100
    num_servers: int = 15

class CustomServerDef(BaseModel):
    id: str
    capacity: int

class CustomSimulationRequest(BaseModel):
    num_tasks: int = 50
    servers: list[CustomServerDef]

def run_standard_allocation(tasks, num_servers, capacity):
    servers = [{"id": i+1, "capacity": capacity, "used": 0, "tasks": []} for i in range(num_servers)]
    for i, task in enumerate(tasks):
        s_idx = i % num_servers
        servers[s_idx]["tasks"].append(task)
        servers[s_idx]["used"] += task["weight"]
    
    active_servers = sum(1 for s in servers if s["used"] > 0)
    energy = active_servers * 50
    return {"servers": servers, "active_servers": active_servers, "energy_consumed": energy, "unallocated_count": 0}

def run_modified_greedy_allocation(tasks, num_servers, capacity):
    sorted_tasks = sorted(tasks, key=lambda x: x["weight"], reverse=True)
    servers = [{"id": i+1, "capacity": capacity, "used": 0, "tasks": []} for i in range(num_servers)]
    unallocated_tasks = []
    
    for task in sorted_tasks:
        placed = False
        for s in servers:
            if s["capacity"] - s["used"] >= task["weight"]:
                s["tasks"].append(task)
                s["used"] += task["weight"]
                placed = True
                break
        if not placed:
            unallocated_tasks.append(task)

    active_servers = sum(1 for s in servers if s["used"] > 0)
    energy = active_servers * 50
    return {"servers": servers, "active_servers": active_servers, "energy_consumed": energy, "unallocated_count": len(unallocated_tasks)}

def run_custom_allocation(tasks, server_defs):
    sorted_tasks = sorted(tasks, key=lambda x: x["weight"], reverse=True)
    servers = [{"id": s.id, "capacity": s.capacity, "used": 0, "tasks": []} for s in server_defs]
    unallocated_tasks = []
    
    for task in sorted_tasks:
        placed = False
        for s in servers:
            if s["capacity"] - s["used"] >= task["weight"]:
                s["tasks"].append(task)
                s["used"] += task["weight"]
                placed = True
                break
        if not placed:
            unallocated_tasks.append(task)

    active_servers = sum(1 for s in servers if s["used"] > 0)
    energy = active_servers * 50
    return {"servers": servers, "active_servers": active_servers, "energy_consumed": energy, "unallocated_count": len(unallocated_tasks)}

@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    tasks = [{"id": f"T{i+1}", "weight": random.randint(10, 50)} for i in range(req.num_tasks)]
    return {
        "tasks": tasks,
        "standard": run_standard_allocation(tasks, req.num_servers, req.server_capacity),
        "greedy": run_modified_greedy_allocation(tasks, req.num_servers, req.server_capacity)
    }

@app.post("/api/simulate-custom")
def simulate_custom(req: CustomSimulationRequest):
    tasks = [{"id": f"T{i+1}", "weight": random.randint(10, 50)} for i in range(req.num_tasks)]
    return {
        "tasks": tasks,
        "custom_result": run_custom_allocation(tasks, req.servers)
    }

class DynamicSimRequest(BaseModel):
    num_tasks: int = 50
    server_capacity: int = 100
    num_servers: int = 15

@app.post("/api/simulate-dynamic")
def simulate_dynamic(req: DynamicSimRequest):
    num_servers = req.num_servers
    server_capacity = req.server_capacity
    tasks = []
    
    for i in range(req.num_tasks):
        tasks.append({
            "id": f"T{i+1}",
            "weight": random.randint(10, 40),
            "arrival_time": random.randint(0, 60),
            "duration": random.randint(10, 30) # INI ADALAH LOGIC DIMANA DAPAT GANARATE ANGKA RANDOM SEBAGAI BEBAN TUGASNYA
        })
        
    if not tasks:
        return {"timeline_data": [], "kpi_metrics": {}, "heatmap_data": []}
        
    max_time = max(t["arrival_time"] + t["duration"] for t in tasks)
    timeline_data = []
    
    total_standard_energy = 0
    total_greedy_energy = 0
    peak_standard_servers = 0
    peak_greedy_servers = 0
    peak_greedy_time = 0
    heatmap_data_at_peak = []
    
    rr_next = 0
    standard_assignments = {} 
    
    for t in range(max_time + 1):
        active_tasks = [task for task in tasks if task["arrival_time"] <= t < task["arrival_time"] + task["duration"]]
        
        arrived_now = [task for task in active_tasks if task["arrival_time"] == t]
        for task in arrived_now:
            standard_assignments[task["id"]] = rr_next % num_servers  # MODULUS OVERLOAD
            rr_next += 1
            
        std_servers = [{"id": i+1, "used": 0} for i in range(num_servers)] #
        for task in active_tasks:
            s_idx = standard_assignments.get(task["id"])
            if s_idx is not None:
                std_servers[s_idx]["used"] += task["weight"]
                
        active_std_count = sum(1 for s in std_servers if s["used"] > 0)
        std_energy_step = active_std_count * 50  # INI LOGIC STANDARD
        
        sorted_active = sorted(active_tasks, key=lambda x: x["weight"], reverse=True)
        greedy_servers = [{"id": i+1, "used": 0} for i in range(num_servers)]
        
        for task in sorted_active:
            placed = False
            for s in greedy_servers:
                if s["used"] + task["weight"] <= server_capacity:
                    s["used"] += task["weight"]
                    placed = True
                    break
            if not placed:
                new_s = {"id": len(greedy_servers) + 1, "used": task["weight"]}
                greedy_servers.append(new_s)
                
        active_greedy_count = sum(1 for s in greedy_servers if s["used"] > 0)
        greedy_energy_step = active_greedy_count * 50  # DISINI LOGIC SETIAP KELIPATAN KETIKA TERJADI KENAIKAN 1 SERVER  DENGAN TOTAL ENERGI DI KALI DENGAN 4 atau lebih SERVER DI STANDART
        
        timeline_data.append({
            "time": t,
            "standard_energy": std_energy_step, # ENERGY kWh
            "greedy_energy": greedy_energy_step
        })
        
        total_standard_energy += std_energy_step
        total_greedy_energy += greedy_energy_step
        
        peak_standard_servers = max(peak_standard_servers, active_std_count)
        
        if active_greedy_count > peak_greedy_servers:
            peak_greedy_servers = active_greedy_count
            peak_greedy_time = t
            # REVISI: Menggunakan num_servers alih-alih angka 15 statis
            base_heatmap = [{"id": s["id"], "utilization": min(100, (s["used"] / server_capacity) * 100)} for s in greedy_servers[:num_servers]]
            while len(base_heatmap) < num_servers:
                 base_heatmap.append({"id": len(base_heatmap) + 1, "utilization": 0})
            heatmap_data_at_peak = base_heatmap
            
    if not heatmap_data_at_peak:
         # REVISI: Menggunakan num_servers alih-alih angka 15 statis
         heatmap_data_at_peak = [{"id": i+1, "utilization": 0} for i in range(num_servers)]
         
    active_in_heatmap = [s for s in heatmap_data_at_peak if s["utilization"] > 0]
    avg_greedy_util = sum(s["utilization"] for s in active_in_heatmap) / len(active_in_heatmap) if active_in_heatmap else 0

    return {
        "timeline_data": timeline_data,
        "kpi_metrics": {
            "total_standard_energy": total_standard_energy,
            "total_greedy_energy": total_greedy_energy,
            "peak_standard_servers": peak_standard_servers,
            "peak_greedy_servers": peak_greedy_servers,
            "avg_greedy_utilization": round(avg_greedy_util, 2)
        },
        "heatmap_data": heatmap_data_at_peak
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)