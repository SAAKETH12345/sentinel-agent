import asyncio
import json
import unittest
from fastapi.testclient import TestClient
from main import app
from database import vector_cosine_similarity_search, insert_runbook, _cosine_similarity
from bedrock_client import stream_claude_thought_process

class TestSentinelBackend(unittest.TestCase):
    
    def test_cosine_similarity_math(self):
        v1 = [1.0, 0.0, 0.0]
        v2 = [1.0, 0.0, 0.0]
        v3 = [0.0, 1.0, 0.0]
        
        sim_same = _cosine_similarity(v1, v2)
        sim_ortho = _cosine_similarity(v1, v3)
        
        self.assertAlmostEqual(sim_same, 1.0, places=4)
        self.assertAlmostEqual(sim_ortho, 0.0, places=4)
        print("[PASS] Cosine similarity vector calculation verified.")

    def test_runbook_insert_and_vector_search(self):
        emb1 = [0.5] * 10
        emb2 = [-0.5] * 10
        
        insert_runbook("Test Runbook Alpha", "High CPU usage", "Restart service container", emb1)
        insert_runbook("Test Runbook Beta", "Disk full", "Cleanup log files", emb2)
        
        results = vector_cosine_similarity_search(emb1, top_k=2)
        self.assertTrue(len(results) >= 1)
        self.assertEqual(results[0]["title"], "Test Runbook Alpha")
        self.assertAlmostEqual(results[0]["similarity"], 1.0, places=3)
        print("[PASS] Vector cosine similarity search & database insertion verified.")

    def test_fastapi_health_endpoint(self):
        client = TestClient(app)
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")
        print("[PASS] FastAPI REST health endpoint verified.")

    def test_websocket_alert_stream(self):
        client = TestClient(app)
        with client.websocket_connect("/ws/alert") as websocket:
            websocket.send_text("CRITICAL: Connection pool exhausted on auth-service at 18:00 UTC.")
            
            # Step 1 response (RECEIVE_TELEMETRY)
            data1 = websocket.receive_json()
            self.assertIn("phase", data1)
            self.assertEqual(data1["phase"], "RECEIVE_TELEMETRY")
            
            # Step 2 response (VECTOR_SEARCH)
            data2 = websocket.receive_json()
            self.assertIn("phase", data2)
            self.assertEqual(data2["phase"], "VECTOR_SEARCH")
            
            # Step 3 response (AWAITING_APPROVAL)
            data3 = websocket.receive_json()
            self.assertIn("phase", data3)
            self.assertIn(data3["phase"], ["AWAITING_APPROVAL", "DIAGNOSE"])
            
            print("[PASS] WebSocket /ws/alert streaming endpoint verified end-to-end!")

if __name__ == "__main__":
    unittest.main()
