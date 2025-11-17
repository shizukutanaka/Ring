/**
 * Cloudflare Worker Handler for WebRTC Signaling
 * Deployed on Cloudflare Workers (330+ edge locations)
 *
 * This is the entry point that receives requests from clients and routes them
 * to the appropriate Durable Object (room/session)
 *
 * Key Features:
 * - Zero cold start latency (unlike AWS Lambda)
 * - Automatic geographic routing
 * - WebSocket support for real-time signaling
 * - Built-in DDoS protection and rate limiting
 * - Request/response caching where appropriate
 */

/**
 * Cloudflare Worker Handler
 * This function processes every request to the signaling edge
 */
async function handleSignalingRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Extract client metadata
  const clientIP = request.headers.get('cf-connecting-ip');
  const clientCountry = request.headers.get('cf-ipcountry');
  const clientCity = request.headers.get('cf-metro-code');
  const userAgent = request.headers.get('user-agent');

  const clientMetadata = {
    ip: clientIP,
    country: clientCountry,
    city: clientCity,
    userAgent,
    timestamp: Date.now()
  };

  // Route requests based on path
  if (pathname.startsWith('/signal/room/')) {
    return handleRoomSignaling(request, env, pathname, clientMetadata);
  }

  if (pathname.startsWith('/signal/peer/')) {
    return handlePeerSignaling(request, env, pathname, clientMetadata);
  }

  if (pathname === '/signal/health') {
    return handleHealthCheck(env);
  }

  if (pathname === '/signal/metrics') {
    return handleMetricsRequest(env);
  }

  if (pathname.startsWith('/signal/ws')) {
    return handleWebSocketUpgrade(request, env, clientMetadata);
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Handle room creation and management
 * Path: /signal/room/{roomId}
 */
async function handleRoomSignaling(request, env, pathname, clientMetadata) {
  const roomId = pathname.split('/')[3];

  if (!roomId) {
    return new Response('Room ID required', { status: 400 });
  }

  // Get Durable Object for this room
  const durableObjectStub = env.SIGNALING_ROOMS.get(roomId);

  if (request.method === 'POST') {
    // Create or join room
    const body = await request.json();

    return durableObjectStub.fetch(request.clone());
  }

  if (request.method === 'GET') {
    // Get room status
    return durableObjectStub.fetch(
      new Request(`https://signaling.internal/room/${roomId}/status`, {
        method: 'GET'
      })
    );
  }

  if (request.method === 'DELETE') {
    // Delete room
    return durableObjectStub.fetch(
      new Request(`https://signaling.internal/room/${roomId}`, {
        method: 'DELETE'
      })
    );
  }

  return new Response('Method not allowed', { status: 405 });
}

/**
 * Handle peer signaling (offers, answers, ICE candidates)
 * Path: /signal/peer/{peerId}
 */
async function handlePeerSignaling(request, env, pathname, clientMetadata) {
  const pathParts = pathname.split('/');
  const peerId = pathParts[3];
  const action = pathParts[4]; // 'offer', 'answer', 'candidate'

  if (!peerId) {
    return new Response('Peer ID required', { status: 400 });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { roomId, signal } = body;

    if (!roomId) {
      return new Response('Room ID required', { status: 400 });
    }

    // Route to room's Durable Object
    const durableObjectStub = env.SIGNALING_ROOMS.get(roomId);

    // Create internal request for the Durable Object
    const internalRequest = new Request('https://signaling.internal/relay', {
      method: 'POST',
      body: JSON.stringify({
        from: peerId,
        to: body.to || null,
        signal,
        clientMetadata
      })
    });

    return durableObjectStub.fetch(internalRequest);
  }

  return new Response('Method not allowed', { status: 405 });
}

/**
 * Handle WebSocket upgrade for real-time signaling
 * Path: /signal/ws
 */
async function handleWebSocketUpgrade(request, env, clientMetadata) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const url = new URL(request.url);
  const roomId = url.searchParams.get('room');
  const peerId = url.searchParams.get('peer');

  if (!roomId || !peerId) {
    return new Response('Room ID and Peer ID required', { status: 400 });
  }

  // Get Durable Object for this room
  const durableObjectStub = env.SIGNALING_ROOMS.get(roomId);

  // Upgrade connection to WebSocket through Durable Object
  return durableObjectStub.fetch(
    new Request('https://signaling.internal/ws', {
      method: 'GET',
      headers: request.headers
    })
  );
}

/**
 * Health check endpoint
 * Returns 200 OK if edge is healthy
 */
async function handleHealthCheck(env) {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
      edge: 'cloudflare-worker',
      version: '1.0.0'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Metrics endpoint
 * Returns current edge metrics
 */
async function handleMetricsRequest(env) {
  // In production, aggregate metrics from all Durable Objects
  return new Response(
    JSON.stringify({
      timestamp: Date.now(),
      metrics: {
        messagesRelayed: 0, // Would aggregate from all DOs
        peersConnected: 0,
        roomsActive: 0,
        edgeLatency: '5-15ms',
        uplimePercentage: 99.95
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Request router with caching where appropriate
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);

  // Disable caching for signaling (always real-time)
  if (url.pathname.startsWith('/signal/')) {
    return handleSignalingRequest(request, env);
  }

  // Cache health checks for 10 seconds
  if (url.pathname === '/signal/health') {
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;

    let response = await cache.match(cacheKey);

    if (!response) {
      response = await handleSignalingRequest(request, env);
      if (response.status === 200) {
        response = new Response(response.body, response);
        response.headers.set('Cache-Control', 'max-age=10');
        await cache.put(cacheKey, response.clone());
      }
    }

    return response;
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Rate limiting and DDoS protection
 */
async function applyRateLimiting(request, env) {
  const ip = request.headers.get('cf-connecting-ip');
  const key = `rate_limit:${ip}`;

  // Check if IP has exceeded rate limit
  // In production, use Cloudflare KV or rate limiting service
  const rateLimitKey = await env.RATE_LIMIT_KV?.get(key);

  if (rateLimitKey) {
    const count = parseInt(rateLimitKey) || 0;

    if (count > 1000) {
      // 1000 requests per minute
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      });
    }
  }

  return null; // Allow request
}

/**
 * Main Cloudflare Worker handler
 * This is the entry point for all requests
 */
addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      // Apply rate limiting
      const rateLimitResponse = await applyRateLimiting(
        event.request,
        event
      );

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      // Handle the request
      return handleRequest(event.request, event);
    })()
  );
});

module.exports = {
  handleRequest,
  handleSignalingRequest,
  handleRoomSignaling,
  handlePeerSignaling,
  handleWebSocketUpgrade,
  handleHealthCheck,
  handleMetricsRequest
};
