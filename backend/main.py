import random
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Task Scheduling Simulator API")

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

def run_standard_allocation(tasks, num_servers, capacity):
    # Round robin
    servers = [{"id": i+1, "capacity": capacity, "used": 0, "tasks": []} for i in range(num_servers)]
    for i, task in enumerate(tasks):
        s_idx = i % num_servers
        servers[s_idx]["tasks"].append(task)
        servers[s_idx]["used"] += task["weight"]
    
    active_servers = sum(1 for s in servers if s["used"] > 0)
    energy = active_servers * 50
    return {"servers": servers, "active_servers": active_servers, "energy_consumed": energy}

def run_modified_greedy_allocation(tasks, num_servers, capacity):
    # Modified Greedy (First-Fit Decreasing)
    # 1. Sort descending by weight
    sorted_tasks = sorted(tasks, key=lambda x: x["weight"], reverse=True)
    
    servers = [{"id": i+1, "capacity": capacity, "used": 0, "tasks": []} for i in range(num_servers)]
    
    for task in sorted_tasks:
        placed = False
        for s in servers:
            if s["capacity"] - s["used"] >= task["weight"]:
                s["tasks"].append(task)
                s["used"] += task["weight"]
                placed = True
                break
        
        # Open a new server if not placed (surpasses 15 servers)
        if not placed:
            new_server = {"id": len(servers) + 1, "capacity": capacity, "used": task["weight"], "tasks": [task]}
            servers.append(new_server)

    active_servers = sum(1 for s in servers if s["used"] > 0)
    energy = active_servers * 50
    return {"servers": servers, "active_servers": active_servers, "energy_consumed": energy}

@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    # Generate random tasks
    tasks = [{"id": f"T{i+1}", "weight": random.randint(10, 30)} for i in range(req.num_tasks)]
    
    num_servers = 15
    
    standard_result = run_standard_allocation(tasks, num_servers, req.server_capacity)
    greedy_result = run_modified_greedy_allocation(tasks, num_servers, req.server_capacity)
    
    return {
        "tasks": tasks,
        "standard": standard_result,
        "greedy": greedy_result
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
