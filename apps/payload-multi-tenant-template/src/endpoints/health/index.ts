import type { Endpoint, PayloadRequest } from 'payload'

/**
 * Liveness probe for load balancers and orchestration.
 */
const health: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (_req: PayloadRequest) => Response.json(null, { status: 200 }),
}

export default health
