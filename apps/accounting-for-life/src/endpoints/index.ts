/**
 * Custom Payload REST endpoints (mounted on the Payload API).
 */
import type { Endpoint } from 'payload'

import health from './health'
import ledgerPost from './ledger'

const endpoints: Endpoint[] = [health, ledgerPost]

export default endpoints
