require('dotenv').config({ path: '.env.local' });

async function testCreateSwap() {
  const kitKey = "KIT_KEY:invalid:invalid";
  const url = 'https://api.circle.com/v1/stablecoinKits/swap';
  
  // Example payload for a same-chain swap on Arc Testnet
  const body = JSON.stringify({
    tokenInAddress: "0x3600000000000000000000000000000000000000", // USDC
    tokenInChain: "Arc_Testnet",
    tokenOutAddress: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // EURC
    tokenOutChain: "Arc_Testnet",
    fromAddress: "0x3ACE06952e0Dd11016df2E2D6233B87A39a2f53d",
    toAddress: "0x3ACE06952e0Dd11016df2E2D6233B87A39a2f53d",
    amount: "1000000", // 1 USDC in base units (assuming 6 decimals for this test, though Arc USDC is 18)
    slippageBps: 300
  });

  console.log('Testing createSwap with Kit Key...');
  console.log('URL:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kitKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

testCreateSwap();
