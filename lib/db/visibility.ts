import { eq, or } from 'drizzle-orm'
import { shapingPolicies } from './schema'

// Owner id used by the seed script for global demo policies. Every operator
// sees these lanes in addition to their own, so the Flow Canvas is never
// empty for a freshly registered account.
export const GLOBAL_POLICY_OWNER = 'operator'

export function policyVisibility(userId: string) {
  return or(
    eq(shapingPolicies.createdBy, userId),
    eq(shapingPolicies.createdBy, GLOBAL_POLICY_OWNER),
  )
}
