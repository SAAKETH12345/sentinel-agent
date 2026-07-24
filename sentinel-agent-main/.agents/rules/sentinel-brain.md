---
trigger: always_on
---

{
  "observation": "MCP query confirms issue. Fix requires write access to terminate sessions.",
  "mcp_audit_state": "PENDING_WRITE",
  "action": "request_mcp_write_consent(proposed_sql_or_cli_command: 'cockroach sql --execute=\"CANCEL SESSION <idle_ids>\"', risk_level: 'High')"
}