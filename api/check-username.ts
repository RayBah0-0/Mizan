import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, currentUserId } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Query Clerk API to find users with this displayName in metadata
    const response = await fetch('https://api.clerk.com/v1/users?' + new URLSearchParams({
      limit: '100'
    }), {
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to query Clerk API');
    }

    const users = await response.json();
    
    // Check if any user (excluding current user) has this username
    const isTaken = users.some((user: any) => 
      user.id !== currentUserId && 
      user.username?.toLowerCase() === username.toLowerCase()
    );

    return res.status(200).json({ 
      available: !isTaken,
      message: isTaken ? 'Username is already taken' : 'Username is available'
    });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return res.status(500).json({ 
      error: 'Failed to check username availability',
      available: true // Fail open - allow username if check fails
    });
  }
}
