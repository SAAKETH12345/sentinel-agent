import asyncio
import json
import logging
import sys
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("simulate_demo")

WS_URL = "ws://localhost:8000/ws/alert"

async def run_hackathon_demo():
    print("=" * 70)
    print("🚀 SENTINEL AGENT - AUTOMATED HACKATHON DEMO ORCHESTRATOR")
    print("=" * 70)
    print(f"Connecting to FastAPI WebSocket endpoint at {WS_URL}...\n")

    try:
        async with websockets.connect(WS_URL) as ws:
            logger.info("Connected to WebSocket backend.")

            # Step 1 & 2: Trigger CPU Spike & Critical DB Connection Pool Exhaustion alert
            print("\n[STEP 1 & 2] Triggering Critical Incident Alert & Spiking CPU to 99%...")
            alert_payload = {
                "type": "SPIKE_CPU",
                "cpu": 99,
                "alert": "CRITICAL: DB Connection Pool Exhausted on auth-service at 18:00 UTC."
            }
            await ws.send(json.dumps(alert_payload))
            logger.info(f"Sent payload: {alert_payload['alert']} (CPU Target: 99%)")

            # Step 3: Stream agent thought process (Observation -> Vector Search -> Diagnosis & Action Proposal)
            print("\n[STEP 3] Agent is processing incoming telemetry and searching CockroachDB vector memory...\n")
            
            awaiting_approval = False
            while not awaiting_approval:
                try:
                    response_raw = await asyncio.wait_for(ws.receive(), timeout=10.0)
                    data = json.loads(response_raw)
                    phase = data.get("phase", "THOUGHT_STREAM")
                    reasoning = data.get("reasoning", "")
                    action = data.get("action", "")

                    print(f"  ├─ [{phase}]")
                    print(f"  │  Reasoning: {reasoning}")
                    print(f"  │  Action: {action}")
                    print("  │")

                    if phase in ["PROPOSE_FIX", "AWAITING_APPROVAL"]:
                        awaiting_approval = True
                        print("\n[AGENT PROPOSAL]: Scale AWS EC2 Nodes & Terminate Idle CockroachDB Sessions.")
                except asyncio.TimeoutError:
                    logger.warning("Timeout waiting for LLM thought stream chunk.")
                    break

            # Step 4: Wait for user's Voice Approval
            print("\n[STEP 4] 🎤 AWAITING HUMAN GOVERNANCE VOICE APPROVAL...")
            print("  >>> Speak 'Action Approved' into microphone (or press Enter in terminal to simulate voice approval)...")
            
            # Interactive choice or voice wait
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, input, "  [Press Enter to confirm Voice Approval 'Action Approved']: ")
            except Exception:
                await asyncio.sleep(3)

            # Step 5: Send success signal to backend/frontend
            print("\n[STEP 5] Voice Approval Confirmed! Sending self-heal resolution signal...")
            approval_payload = {
                "type": "APPROVE_FIX",
                "phase": "SELF_HEAL",
                "action": "aws auto-scaling scale-up --cluster auth-cluster & cockroach sql --execute='CANCEL SESSION <idle_ids>'"
            }
            await ws.send(json.dumps(approval_payload))
            logger.info("Sent APPROVE_FIX signal.")

            # Wait for backend final resolution payload
            try:
                final_response_raw = await asyncio.wait_for(ws.receive(), timeout=8.0)
                final_data = json.loads(final_response_raw)
                print(f"\n[RESOLUTION]: {final_data.get('reasoning', 'Incident Self-Healed.')}")
                print(f"  ├─ CPU Utilization: 20% (Nominal)")
                print(f"  └─ CockroachDB Memory: RESOLUTION RUNBOOK SAVED TO VECTOR STORE\n")
            except asyncio.TimeoutError:
                print("\n[RESOLUTION]: Self-healing executed. CPU graph set to 20%. CockroachDB memory updated.")

            print("=" * 70)
            print("✨ HACKATHON DEMO ORCHESTRATION COMPLETED SUCCESSFULLY!")
            print("=" * 70)

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        print("\n⚠️ Note: Backend server at ws://localhost:8000/ws/alert is unreachable.")
        print("Starting direct client simulation engine for offline demonstration...\n")
        await run_standalone_fallback_demo()

async def run_standalone_fallback_demo():
    print("-------------------------------------------------------")
    print("STANDALONE DEMO SIMULATION (NO BACKEND REQUIRED)")
    print("-------------------------------------------------------")
    print("1. [SPIKE_CPU]: Target 99% CPU & DB Connection Exhaustion Alert dispatched.")
    await asyncio.sleep(1.5)
    print("2. [VECTOR_SEARCH]: Queried CockroachDB pgvector index (0.962 similarity match found).")
    await asyncio.sleep(1.5)
    print("3. [PROPOSE_FIX]: Agent proposes: Scale AWS Cluster & Clear Idle Sessions.")
    await asyncio.sleep(1.0)
    print("\n4. 🎤 AWAITING VOICE APPROVAL ('Action Approved')...")
    await asyncio.sleep(2.0)
    print("5. [RESOLVED]: Human voice approval confirmed! CPU returned to 20%. CockroachDB vector memory updated.")

if __name__ == "__main__":
    asyncio.run(run_hackathon_demo())
