import { auth } from '@/auth'
import sql from '@/lib/db'

/**
 * Get the authenticated user's ID from the session.
 * Falls back to looking up by email if the JWT token doesn't have an ID
 * (happens when the user logged in before the jwt callback was added).
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth()
  
  if (!session?.user) return null

  // Best case: ID is in the session token
  if (session.user.id) return session.user.id

  // Fallback: look up by email
  if (session.user.email) {
    const rows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`
    if (rows[0]) return rows[0].id
  }

  return null
}
