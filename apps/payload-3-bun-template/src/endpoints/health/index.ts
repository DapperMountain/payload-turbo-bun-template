import { Endpoint, PayloadRequest } from 'payload'

const endpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    return Response.json(null, {
      status: 200,
    })
  },
}

export default endpoint
