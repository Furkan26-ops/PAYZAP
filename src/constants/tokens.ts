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
    address: '0x0000000000000000000000000000000000000000', 
    decimals: 18,
    color: 'bg-indigo-100 text-indigo-600', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
  },
  { 
    symbol: 'EURC', 
    name: 'Euro Coin', 
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', // Official Arc EURC Contract
    decimals: 6,
    color: 'bg-purple-100 text-purple-600', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c/logo.png'
  },
  { 
    symbol: 'USYC', 
    name: 'USYC Token', 
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C', // Official Arc USYC Contract
    decimals: 6,
    color: 'bg-blue-100 text-blue-600', 
    logo: '🏦' 
  },
  { 
    symbol: 'USDT', 
    name: 'Tether USD', 
    address: '0x175CdB1D338945f0D851A741ccF787D343E57952',
    decimals: 18,
    color: 'bg-emerald-100 text-emerald-600', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png'
  },
  { 
    symbol: 'XYLO', 
    name: 'XYLO LP Token', 
    address: '0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1',
    decimals: 18,
    color: 'bg-amber-100 text-amber-600', 
    logo: '🌌' 
  }
];

export const ARC_TESTNET_SWAP_TOKENS: Token[] = TOKENS.filter((token) =>
  token.symbol === 'USDC' || token.symbol === 'EURC'
);

export const TOKENS_BY_SYMBOL = Object.fromEntries(
  TOKENS.map((token) => [token.symbol, token])
) as Record<string, Token>;
