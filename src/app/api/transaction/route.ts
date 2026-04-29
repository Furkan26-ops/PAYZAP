import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userToken, recipientAddress, amount } = body;

    if (!userId || !userToken || !recipientAddress || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const API_KEY = process.env.CIRCLE_API_KEY || 'MOCK_API_KEY';
    let challengeId = 'mock_challenge_id_' + uuidv4().substring(0, 8);

    if (API_KEY !== 'MOCK_API_KEY') {
        const transferRes = await fetch('https://api.circle.com/v1/w3s/user/transactions/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'X-User-Token': userToken
            },
            body: JSON.stringify({
                idempotencyKey: uuidv4(),
                userId,
                destinationAddress: recipientAddress,
                amounts: [amount.toString()],
                feeLevel: 'MEDIUM',
                tokenId: process.env.ARC_USDC_TOKEN_ID || 'dummy_token_id', 
                walletId: body.walletId || 'dummy_wallet_id', 
            })
        });

        if (transferRes.ok) {
            const transferData = await transferRes.json();
            challengeId = transferData.data?.challengeId || challengeId;
        } else {
            console.error('Failed to initiate transfer:', await transferRes.text());
            return NextResponse.json({ error: 'Failed to initiate transfer on Circle' }, { status: 500 });
        }
    }

    return NextResponse.json({ challengeId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
