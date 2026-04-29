import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Deterministic user ID for the sake of the prototype based on email
    const mockUserId = `user-${Buffer.from(email).toString('hex').slice(0, 16)}`;
    const API_KEY = process.env.CIRCLE_API_KEY || 'MOCK_API_KEY';
    const APP_ID = process.env.CIRCLE_APP_ID || 'MOCK_APP_ID';

    let userToken = 'mock_user_token';
    let encryptionKey = 'mock_encryption_key';

    if (API_KEY !== 'MOCK_API_KEY') {
        // Step 1: Attempt to create user (will fail if exists, which is fine for this demo)
        await fetch('https://api.circle.com/v1/w3s/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: mockUserId })
        }).catch(err => console.log('User creation error (might already exist):', err));

        // Step 2: Generate Session Token
        const tokenRes = await fetch('https://api.circle.com/v1/w3s/users/token', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: mockUserId })
        });
        
        if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            userToken = tokenData.data?.userToken || 'mock_user_token';
            encryptionKey = tokenData.data?.encryptionKey || 'mock_encryption_key';
        } else {
            console.error('Failed to get user token:', await tokenRes.text());
        }
    }

    return NextResponse.json({
        userId: mockUserId,
        userToken,
        encryptionKey,
        appId: APP_ID,
        email
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
