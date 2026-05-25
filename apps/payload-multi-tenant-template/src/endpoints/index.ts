/**
 * Custom Payload REST endpoints (mounted on the Payload API).
 */
import type { Endpoint } from 'payload'

import health from './health'

const endpoints: Endpoint[] = [health]

export default endpoints
