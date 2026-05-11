export interface Token {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  color: string;
  logo?: string;
}

export const TOKENS: Token[] = [
  { 
    symbol: 'USDC', 
    name: 'USD Coin (Native)', 
    address: '0x3600000000000000000000000000000000000000', 
    decimals: 18,
    color: 'bg-indigo-100 text-indigo-600', 
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  { 
    symbol: 'EURC', 
    name: 'Euro Coin', 
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', // Official Arc EURC Contract
    decimals: 6,
    color: 'bg-purple-100 text-purple-600', 
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20585.png'
  },
  { 
    symbol: 'USYC', 
    name: 'USYC Token', 
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C', // Official Arc USYC Contract
    decimals: 6,
    color: 'bg-blue-100 text-blue-600', 
    logo: 'https://ui-avatars.com/api/?name=USYC&background=0D8ABC&color=fff&rounded=true&bold=true' 
  },
  { 
    symbol: 'USDT', 
    name: 'Tether USD', 
    address: '0x175CdB1D338945f0D851A741ccF787D343E57952',
    decimals: 18,
    color: 'bg-emerald-100 text-emerald-600', 
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  { 
    symbol: 'XYLO', 
    name: 'XYLO LP Token', 
    address: '0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1',
    decimals: 18,
    color: 'bg-amber-100 text-amber-600', 
    logo: 'https://ui-avatars.com/api/?name=XYLO&background=F59E0B&color=fff&rounded=true&bold=true' 
  }
];

export const ARC_TESTNET_SWAP_TOKENS: Token[] = TOKENS.filter((token) =>
  token.symbol === 'USDC' || token.symbol === 'EURC'
);

export const TOKENS_BY_SYMBOL = Object.fromEntries(
  TOKENS.map((token) => [token.symbol, token])
) as Record<string, Token>;
