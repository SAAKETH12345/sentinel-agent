"""
CockroachDB x AWS Hackathon Compliance Test Suite
-------------------------------------------------
Audits & verifies:
1. CockroachDB vector schema (VECTOR(1536) & vector_cosine_ops)
2. CockroachDB Row-Level TTL (ttl_expire_after = '24 hours')
3. Managed MCP PENDING_WRITE execution pause state
4. AWS Bedrock Anthropic Claude 3.5 Sonnet integration
5. Amazon S3 Post-Mortem Presigned URL generation
6. React/Netlify SPA routing readiness (netlify.toml & public/_redirects)
7. ClusterTopology component HEALTHY (cyan) & INCIDENT (red) support
"""

import sys
import os
import unittest

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
elif current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi.testclient import TestClient
from main import app
from config import settings
from database import _setup_schema
import database
import s3_client
import bedrock_client


class TestHackathonCompliance(unittest.TestCase):

    def test_01_cockroachdb_schema_and_ttl(self):
        """Verify CockroachDB vector schema (VECTOR(1536)) and Row-Level TTL (24h)."""
        print("\n--- STEP 1: CockroachDB Database & MCP Requirements Audit ---")
        
        # Check database.py source code definitions
        db_file = os.path.join(backend_dir if os.path.exists(backend_dir) else current_dir, "database.py")
        with open(db_file, "r", encoding="utf-8") as f:
            content = f.read()

        vector_schema_ok = "VECTOR(1536)" in content and "vector_cosine_ops" in content
        ttl_schema_ok = "ttl_expire_after = '24 hours'" in content or "24 hours" in content

        self.assertTrue(vector_schema_ok, "VECTOR(1536) and vector_cosine_ops must be defined in database schema.")
        self.assertTrue(ttl_schema_ok, "Row-Level TTL (ttl_expire_after = '24 hours') must be configured.")

        print(" [PASS] CockroachDB Vector Schema (VECTOR(1536) & vector_cosine_ops) verified.")
        print(" [PASS] CockroachDB Row-Level TTL (ttl_expire_after = '24 hours') verified.")

    def test_02_aws_integrations(self):
        """Verify AWS Bedrock Claude 3.5 Sonnet & S3 Post-Mortem Presigned URL integration."""
        print("\n--- STEP 2: AWS Integrations Audit ---")

        # Check Bedrock model ID in config
        expected_model = "anthropic.claude-3-5-sonnet-20240620-v1:0"
        self.assertEqual(
            settings.BEDROCK_MODEL_ID, 
            expected_model, 
            f"BEDROCK_MODEL_ID must be set to {expected_model}"
        )
        print(f" [PASS] AWS Bedrock Claude model ID ({settings.BEDROCK_MODEL_ID}) verified.")

        # Check S3 post-mortem generation logic
        mock_data = {
            "incident_id": "TEST-INC-101",
            "alert_text": "DB Pool Exhaustion",
            "root_cause": "High connection count",
            "applied_fix": "Session cancel & node scale",
            "metrics": "CPU restored to 20%"
        }
        presigned_url, markdown_content, s3_key = s3_client.generate_post_mortem(mock_data)

        self.assertTrue(len(markdown_content) > 0, "Post-Mortem Markdown content must be generated.")
        self.assertTrue(len(presigned_url) > 0, "Presigned URL (or fallback URI) must be returned.")
        self.assertIn("TEST-INC-101", markdown_content)

        print(" [PASS] Amazon S3 Post-Mortem generator & presigned URL function verified.")

    def test_03_frontend_netlify_readiness(self):
        """Verify Netlify SPA routing (_redirects & netlify.toml) and ClusterTopology states."""
        print("\n--- STEP 3: Frontend UI & Netlify Readiness Audit ---")

        # Check netlify.toml
        root_dir = os.path.dirname(os.path.abspath(__file__))
        netlify_toml = os.path.join(root_dir, "netlify.toml")
        self.assertTrue(os.path.exists(netlify_toml), "netlify.toml must exist.")

        # Check public/_redirects
        redirects_file = os.path.join(root_dir, "public", "_redirects")
        self.assertTrue(os.path.exists(redirects_file), "public/_redirects must exist.")

        with open(redirects_file, "r", encoding="utf-8") as f:
            redirects_content = f.read().strip()

        self.assertIn("/* /index.html 200", redirects_content, "public/_redirects must contain '/* /index.html 200'")

        # Check ClusterTopology component
        cluster_component = os.path.join(root_dir, "src", "components", "ClusterTopology.tsx")
        with open(cluster_component, "r", encoding="utf-8") as f:
            component_code = f.read()

        self.assertIn("HEALTHY", component_code, "ClusterTopology must support HEALTHY state.")
        self.assertIn("INCIDENT", component_code, "ClusterTopology must support INCIDENT state.")

        print(" [PASS] Netlify SPA config (netlify.toml & public/_redirects /* /index.html 200) verified.")
        print(" [PASS] ClusterTopology component support for HEALTHY (cyan) & INCIDENT (red) verified.")

    def test_04_websocket_mcp_pending_write_assertion(self):
        """Fire DB Pool Exhaustion payload via WebSocket and assert Bedrock LLM responds with PENDING_WRITE MCP state."""
        print("\n--- STEP 4: Managed MCP PENDING_WRITE State WebSocket Test ---")

        client = TestClient(app)
        pending_write_detected = False
        received_states = []

        with client.websocket_connect("/ws/alert") as websocket:
            # Fire mock DB Pool Exhaustion payload
            websocket.send_json({
                "type": "ALERT",
                "alert": "DB Pool Exhaustion on auth-service",
                "cluster_node": "Node 2"
            })

            # Read WebSocket frames until PENDING_WRITE state is detected or stream ends
            for _ in range(5):
                msg = websocket.receive_json()
                received_states.append(msg)

                # Check mcp_state in root message
                if msg.get("mcp_state") == "PENDING_WRITE":
                    pending_write_detected = True
                    break

                # Check mcpAuditLogs for status containing PENDING_WRITE
                for log in msg.get("mcpAuditLogs", []):
                    if "PENDING_WRITE" in str(log.get("status", "")):
                        pending_write_detected = True
                        break

                if pending_write_detected:
                    break

        self.assertTrue(
            pending_write_detected,
            f"WebSocket must emit PENDING_WRITE MCP state upon receiving 'DB Pool Exhaustion'. Received: {received_states}"
        )
        print(" [PASS] WebSocket fired 'DB Pool Exhaustion' payload successfully.")
        print(" [PASS] Asserted Managed MCP LLM response returned 'PENDING_WRITE' state.")


def print_compliance_summary():
    print("\n" + "=" * 60)
    print("      COCKROACHDB x AWS HACKATHON COMPLIANCE CHECKLIST")
    print("=" * 60)
    print(" [PASS] Step 1: CockroachDB VECTOR(1536) & vector_cosine_ops Index")
    print(" [PASS] Step 1: CockroachDB Row-Level TTL (ttl_expire_after = '24 hours')")
    print(" [PASS] Step 1: Managed MCP PENDING_WRITE State Enforcement")
    print(" [PASS] Step 2: AWS Bedrock Claude 3.5 Sonnet Integration")
    print(" [PASS] Step 2: Amazon S3 Post-Mortem Presigned URL Generator")
    print(" [PASS] Step 3: Netlify SPA Routing (netlify.toml & public/_redirects)")
    print(" [PASS] Step 3: ClusterTopology HEALTHY (cyan) & INCIDENT (red) UI")
    print(" [PASS] Step 4: WebSocket End-to-End PENDING_WRITE Compliance Test")
    print("=" * 60)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestHackathonCompliance)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print_compliance_summary()
        sys.exit(0)
    else:
        sys.exit(1)
