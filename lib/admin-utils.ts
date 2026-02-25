import sql from './db';

/**
 * Checks if a user has the 'admin' role.
 * @param userId The UUID of the user to check.
 * @returns Promise<boolean>
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const users = await sql`
      SELECT role FROM users WHERE id = ${userId}
    `;
    
    if (users.length === 0) return false;
    return users[0].role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Ensures that the current user is an admin or throws an error.
 * Useful for guarding admin API routes.
 */
export async function ensureAdmin(userId: string) {
  const isUserAdmin = await isAdmin(userId);
  if (!isUserAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
}
