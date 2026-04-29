const { createPublicClient, http } = require('viem');
const publicClient = createPublicClient({
  chain: { id: 5042002, name: 'Arc Testnet', rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } } },
  transport: http()
});
async function test() {
  const wallet = '0x3ACE06952e0Dd11016df2E2D6233B87A39a2f53d';
  try {
    const bal = await publicClient.getBalance({ address: wallet });
    console.log("Native balance of wallet:", bal);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
