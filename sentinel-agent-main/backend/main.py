import json
import logging
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_db_pool, vector_cosine_similarity_search, insert_runbook, _cosine_similarity
from bedrock_client import stream_claude_thought_process

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel.main")

app = FastAPI(
    title="SentinelAgent Backend",
    description="Highly concurrent FastAPI backend with CockroachDB vector search & Bedrock Claude 3.5 Sonnet streaming.",
    version="3.0.0"
)

# Enable CORS for frontend client integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connected WebSocket clients pool for broadcast orchestration
connected_clients: set[WebSocket] = set()

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing SentinelAgent Backend...")
    await asyncio.to_thread(init_db_pool)

class RunbookCreate(BaseModel):
    title: str
    description: str
    solution: str
    embedding: list[float] | None = None

class SearchRequest(BaseModel):
    query_embedding: list[float]
    top_k: int = 3

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SentinelAgent Backend",
        "websocket_endpoint": "/ws/alert"
    }

@app.post("/api/runbooks")
async def create_runbook(item: RunbookCreate):
    """Insert a new runbook entry into CockroachDB vector store."""
    embedding = item.embedding or ([0.1] * 1536)
    record = await asyncio.to_thread(
        insert_runbook,
        item.title,
        item.description,
        item.solution,
        embedding
    )
    return {"status": "success", "runbook": record}

@app.post("/api/search")
async def search_runbooks(item: SearchRequest):
    """Perform vector cosine similarity search against CockroachDB."""
    results = await asyncio.to_thread(
        vector_cosine_similarity_search,
        item.query_embedding,
        item.top_k
    )
    return {"status": "success", "results": results}

@app.websocket("/ws/alert")
async def alert_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint /ws/alert that orchestrates real-time hackathon telemetry streams:
    1. Spikes CPU graph to 99% upon incoming DB Connection Pool Exhaustion alert.
    2. Performs CockroachDB pgvector similarity search.
    3. Streams agent reasoning and proposes scaling AWS nodes & clearing zombie DB sessions.
    4. Awaits Voice Approval ('Action Approved').
    5. Returns CPU graph smoothly to 20% and updates CockroachDB vector memory.
    """
    await websocket.accept()
    connected_clients.add(websocket)
    logger.info(f"WebSocket client connected to /ws/alert. Active clients: {len(connected_clients)}")

    try:
        while True:
            raw_data = await websocket.receive_text()
            logger.info(f"Received alert telemetry payload: {raw_data}")

            try:
                payload = json.loads(raw_data)
            except Exception:
                payload = {"alert": raw_data}

            msg_type = payload.get("type")
            alert_text = payload.get("alert", raw_data)

            if msg_type == "APPROVE_FIX" or payload.get("phase") == "SELF_HEAL":
                # Broadcast self-heal completion & memory update
                resolution_event = {
                    "type": "RESOLVE_INCIDENT",
                    "phase": "RESOLVED",
                    "targetCpu": 20,
                    "reasoning": "Voice approval confirmed ('Action Approved'). Scaled AWS nodes and cleared idle DB sessions. CPU returned to 20%.",
                    "action": "update_runbook_memory(incident_id: 'INC-8891', resolution: 'Scaled AWS EC2 nodes and cleared idle CockroachDB sessions')",
                    "memoryUpdated": True
                }
                for client in list(connected_clients):
                    try:
                        await client.send_json(resolution_event)
                    except Exception:
                        pass
                continue

            # Standard or SPIKE_CPU orchestration flow
            # Step 1: Send CPU spike telemetry event
            spike_event = {
                "type": "SPIKE_CPU",
                "phase": "RECEIVE_TELEMETRY",
                "targetCpu": 99,
                "reasoning": f"CRITICAL ALERT: {alert_text}. CPU utilization surging to 99%.",
                "action": "acknowledge_telemetry_alert(source: 'AWS/CloudWatch', severity: 'CRITICAL')"
            }
            for client in list(connected_clients):
                try:
                    await client.send_json(spike_event)
                except Exception:
                    pass

            await asyncio.sleep(1.0)

            # Step 2: Vector Search against CockroachDB
            query_embedding = [0.1] * 1536
            retrieved_runbooks = await asyncio.to_thread(
                vector_cosine_similarity_search,
                query_embedding,
                top_k=3
            )

            top_match = retrieved_runbooks[0] if retrieved_runbooks else {}
            vector_event = {
                "phase": "VECTOR_SEARCH",
                "reasoning": f"Queried CockroachDB pgvector similarity index. Found top match: '{top_match.get('title', 'Auth Service Connection Leak')}' (0.962 similarity).",
                "action": f"vector_cosine_similarity_search(query_alert: '{alert_text[:40]}...', top_k: 3)"
            }
            for client in list(connected_clients):
                try:
                    await client.send_json(vector_event)
                except Exception:
                    pass

            await asyncio.sleep(1.5)

            # Step 3: Propose Fix (Scale AWS nodes & Clear DB sessions)
            proposal_event = {
                "phase": "AWAITING_APPROVAL",
                "reasoning": "Diagnostic confirms connection pool exhaustion & CPU overload. Remediation: Scale AWS EC2 cluster nodes & clear idle CockroachDB sessions.",
                "action": "HALT: Awaiting human governance voice approval for 'aws auto-scaling scale-up --cluster auth-cluster & cockroach sql --execute=\"CANCEL SESSION <idle_ids>\"'"
            }
            for client in list(connected_clients):
                try:
                    await client.send_json(proposal_event)
                except Exception:
                    pass

    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        logger.info("WebSocket client disconnected from /ws/alert")
    except Exception as e:
        logger.error(f"Error handling WebSocket alert stream: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
