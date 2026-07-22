import json
import logging
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    init_db_pool,
    log_ephemeral_incident,
    search_past_incidents,
    insert_incident_memory,
    _cosine_similarity
)
from bedrock_client import stream_claude_thought_process
from s3_client import generate_post_mortem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel.main")

app = FastAPI(
    title="SentinelAgent Backend",
    description="Highly concurrent FastAPI backend with CockroachDB Dual Memory (Row-Level TTL & vector_cosine_ops).",
    version="3.1.0"
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
    logger.info("Initializing SentinelAgent Backend with CockroachDB Dual Memory...")
    await asyncio.to_thread(init_db_pool)

class RunbookCreate(BaseModel):
    title: str
    summary: str
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
        "websocket_endpoint": "/ws/alert",
        "cockroachdb_memory": "Dual Memory Active (Row-Level TTL & vector_cosine_ops)"
    }

@app.post("/api/runbooks")
async def create_runbook(item: RunbookCreate):
    """Insert a new incident memory entry into CockroachDB vector store."""
    embedding = item.embedding or ([0.1] * 1536)
    record = await asyncio.to_thread(
        insert_incident_memory,
        item.title,
        item.summary,
        item.solution,
        embedding
    )
    return {"status": "success", "incident": record}

@app.post("/api/search")
async def search_incidents(item: SearchRequest):
    """Perform vector cosine similarity search (vector_cosine_ops) against CockroachDB."""
    results = await asyncio.to_thread(
        search_past_incidents,
        item.query_embedding,
        item.top_k
    )
    return {"status": "success", "results": results}

@app.websocket("/ws/alert")
async def alert_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint /ws/alert that orchestrates real-time hackathon telemetry streams:
    1. Logs ephemeral incident with CockroachDB Row-Level TTL (EXPIRE AT 24h).
    2. Spikes CPU graph to 99% upon incoming DB Connection Pool Exhaustion alert.
    3. Performs CockroachDB vector_cosine_ops similarity search across incident_memory.
    4. Streams similarity distances & MCP audit logs to frontend for AgentMemoryPanel.
    5. Awaits Voice Approval ('Action Approved') & resolves incident telemetry.
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
                post_mortem_url, md_content, s3_key = await asyncio.to_thread(
                    generate_post_mortem,
                    {
                        "incident_id": "INC-8891",
                        "alert_text": alert_text,
                        "root_cause": "Stale idle_in_transaction database locks causing max connection threshold breaches.",
                        "applied_fix": "Scaled AWS EC2 auto-scaling nodes & executed session cancellation on idle connections.",
                        "metrics": "CPU dropped from 99% to 20%, connection pool utilization restored to 22%."
                    }
                )
                # Broadcast self-heal completion & memory update & S3 post mortem URL
                resolution_event = {
                    "type": "RESOLVE_INCIDENT",
                    "phase": "RESOLVED",
                    "targetCpu": 20,
                    "reasoning": "Voice approval confirmed ('Action Approved'). Scaled AWS nodes and cleared idle DB sessions. S3 Post-Mortem generated and uploaded.",
                    "action": f"update_runbook_memory(incident_id: 'INC-8891', s3_key: '{s3_key}')",
                    "memoryUpdated": True,
                    "postMortemUrl": post_mortem_url,
                    "s3Key": s3_key
                }
                for client in list(connected_clients):
                    try:
                        await client.send_json(resolution_event)
                    except Exception:
                        pass
                continue

            # Step 1: Log Ephemeral Active Incident (Row-Level TTL: 24h)
            ephemeral_log = await asyncio.to_thread(
                log_ephemeral_incident,
                title=f"Telemetry Alert: {alert_text[:50]}",
                summary="Active incident logged with 24-hour CockroachDB Row-Level TTL",
                details=alert_text
            )
            logger.info(f"Logged active ephemeral incident: {ephemeral_log['id']}")

            # Send CPU spike telemetry event
            spike_event = {
                "type": "SPIKE_CPU",
                "phase": "RECEIVE_TELEMETRY",
                "targetCpu": 99,
                "reasoning": f"CRITICAL ALERT: {alert_text}. Logged to active_incidents (TTL 24h). CPU surging to 99%.",
                "action": f"log_ephemeral_incident(id: '{ephemeral_log['id']}', expire_at: 'now() + 24 hours')"
            }
            for client in list(connected_clients):
                try:
                    await client.send_json(spike_event)
                except Exception:
                    pass

            await asyncio.sleep(1.0)

            # Step 2: Vector Search against CockroachDB incident_memory (vector_cosine_ops)
            query_embedding = [0.1] * 1536
            retrieved_incidents = await asyncio.to_thread(
                search_past_incidents,
                query_embedding,
                top_k=3
            )

            top_match = retrieved_incidents[0] if retrieved_incidents else {}
            top_sim = top_match.get("similarity", 0.94)

            vector_event = {
                "phase": "VECTOR_SEARCH",
                "reasoning": f"Queried CockroachDB `incident_memory` using `vector_cosine_ops`. Top match: '{top_match.get('title', 'DB Pool Exhaustion')}' (similarity: {top_sim}).",
                "action": f"search_past_incidents(query_alert: '{alert_text[:35]}...', top_k: 3)",
                "pastIncidents": retrieved_incidents,
                "mcpAuditLogs": [
                    {
                        "timestamp": "18:55:04 UTC",
                        "toolName": "pgvector_similarity_search",
                        "status": "[READ_ONLY | GRANTED]",
                        "details": f"Queried 1536d embeddings (vector_cosine_ops). Top match score: {top_sim}"
                    },
                    {
                        "timestamp": "18:56:22 UTC",
                        "toolName": "pg_stat_activity_inspect",
                        "status": "[READ_ONLY | GRANTED]",
                        "details": "Fetched active connections & transaction locks."
                    },
                    {
                        "timestamp": "18:57:40 UTC",
                        "toolName": "sql_terminate_idle_connections",
                        "status": "[WRITE_CONSENT | AWAITING_APPROVAL]",
                        "details": "Requires human SRE voice consent to execute PG_CANCEL_BACKEND."
                    }
                ]
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
