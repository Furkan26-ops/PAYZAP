const { createPublicClient, http } = require('viem');

const publicClient = createPublicClient({
  chain: { id: 5042002, name: 'Arc Testnet', rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } } },
  transport: http()
});

const abi = [{ "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }];

async function test() {
  const addrs = [
    '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    '0x175CdB1D338945f0D851A741ccF787D343E57952',
    '0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1'
  ];
  for (const addr of addrs) {
    try {
      const symbol = await publicClient.readContract({ address: addr, abi, functionName: 'symbol' });
      console.log(addr, symbol);
    } catch(e) {
      console.log(addr, 'Error', e.message);
    }
  }
}
test();
