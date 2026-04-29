const { createPublicClient, http } = require('viem');

const publicClient = createPublicClient({
  chain: { id: 5042002, name: 'Arc Testnet', rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } } },
  transport: http()
});

const abi = [{ "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" }];

async function test() {
  const addrs = [
    {sym: 'USDC', addr: '0x3600000000000000000000000000000000000000'},
    {sym: 'USYC', addr: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C'},
    {sym: 'USDT', addr: '0x175CdB1D338945f0D851A741ccF787D343E57952'},
    {sym: 'XYLO', addr: '0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1'}
  ];
  for (let a of addrs) {
    try {
      const dec = await publicClient.readContract({ address: a.addr, abi, functionName: 'decimals' });
      console.log(a.sym, "decimals:", dec);
    } catch(e) {
      console.log(a.sym, "Error:", e.message);
    }
  }
}
test();
