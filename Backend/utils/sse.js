// Server-Sent Events (SSE) utility
class SSEClient {
  constructor() {
    this.clients = new Map();
  }

  // Add a new client connection
  addClient(res) {
    const clientId = Date.now().toString();
    
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable buffering for nginx
    });
    
    // Send initial connection event
    this.sendToClient(res, { event: 'connected', data: { clientId } });
    
    // Add client to the map
    this.clients.set(clientId, res);
    
    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });
    
    return clientId;
  }

  // Send data to a specific client
  sendToClient(res, data) {
    const { event = 'message', data: eventData } = data;
    
    // Format the message according to SSE spec
    let message = `event: ${event}\n`;
    message += `data: ${JSON.stringify(eventData)}\n\n`;
    
    res.write(message);
  }

  // Broadcast to all connected clients
  broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    this.clients.forEach((res, clientId) => {
      try {
        res.write(message);
      } catch (err) {
        console.error(`Error sending to client ${clientId}:`, err);
        this.clients.delete(clientId);
      }
    });
  }

  // Send a message to a specific client by ID
  sendToClientId(clientId, data) {
    const res = this.clients.get(clientId);
    if (res) {
      this.sendToClient(res, data);
    }
  }

  // Get number of connected clients
  getClientCount() {
    return this.clients.size;
  }
}

// Create a singleton instance
const sse = new SSEClient();

// Middleware to handle SSE connections
export const setupSSE = (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Add client to SSE manager
  const clientId = Date.now().toString();
  sse.clients.set(clientId, res);

  // Handle client disconnect
  req.on('close', () => {
    sse.clients.delete(clientId);
    console.log(`SSE Client ${clientId} disconnected`);
  });

  req.on('aborted', () => {
    sse.clients.delete(clientId);
    console.log(`SSE Client ${clientId} aborted`);
  });
};

export default sse;
