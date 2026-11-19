export interface McpLogEntry {
  id: string;
  timestamp: string;
  phase:
    | 'USER_REQUEST'
    | 'AGENT_CALL'
    | 'WEBMCP_EXEC'
    | 'STORE_SYNC'
    | 'A2UI_SYNTHESIS'
    | 'A2UI_ACTION';
  method: string;
  details: string;
  data?: any;
  durationMs?: number;
}
