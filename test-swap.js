require('dotenv').config({ path: '.env.local' });
const { AppKit } = require('@circle-fin/app-kit');
const { createViemAdapterFromPrivateKey } = require('@circle-fin/adapter-viem-v2');
async function test() {
  const kit = new AppKit();
  const adapter = createViemAdapterFromPrivateKey({ privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' });
  try {
    const params = {
      from: { adapter, chain: "Arc_Testnet" },
      tokenIn: "USDC",
      amountIn: "1.00",
      tokenOut: "EURC",
      config: { kitKey: process.env.NEXT_PUBLIC_KIT_KEY }
    };
    const estimate = await kit.estimateSwap(params);
    console.log("Estimate Success:", estimate);
  } catch (e) {
    console.error("Estimate Error:", e.message);
  }
}
test();
