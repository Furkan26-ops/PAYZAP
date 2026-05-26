require('dotenv').config({ path: '.env.local' });

async function testApiKey() {
  const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
  // Try production URL with Sandbox Kit Key
  const url = 'https://api.circle.com/v1/stablecoinKits/quote';
  
  const query = new URLSearchParams({
    tokenIn: "USDC",
    amount: "1.00",
    tokenOut: "EURC",
    chain: "Arc_Testnet"
  });

  const fullUrl = `${url}?${query.toString()}`;
  console.log('Testing Kit Key as Bearer on PRODUCTION with URL:', fullUrl);

  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kitKey}`, 
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

testApiKey();
