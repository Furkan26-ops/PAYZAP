import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ARCSCAN_API_BASE = 'https://testnet.arcscan.app/api';
const EXPLORER_TX_BASE = 'https://testnet.arcscan.app/tx/';

type ArcTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  txreceipt_status?: string;
  isError?: string;
  methodId?: string;
};

type ArcTokenTransfer = {
  hash?: string;
  transactionHash?: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  tokenSymbol: string;
  timeStamp: string;
};

type WalletHistoryItem = {
  id: string;
  txHash: string;
  timestamp: string;
  status: 'completed' | 'failed';
  type: 'swap' | 'send' | 'receive' | 'transaction';
  title: string;
  subtitle: string;
  amountDisplay: string;
  tokenSymbol: string;
  explorerUrl: string;
};

function formatAmount(value: string, decimals: number) {
  try {
    const raw = BigInt(value);
    const divisor = BigInt(`1${'0'.repeat(decimals)}`);
    const whole = raw / divisor;
    const fraction = raw % divisor;
    if (fraction === BigInt(0)) return whole.toString();
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 4);
    return `${whole.toString()}.${fractionStr}`;
  } catch {
    return '0';
  }
}

function transferHash(transfer: ArcTokenTransfer) {
  return transfer.transactionHash || transfer.hash || '';
}

async function fetchExplorerJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Explorer request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.toLowerCase();
  const limit = Number(request.nextUrl.searchParams.get('limit') || '20');

  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const [txListResponse, tokenTransferResponse] = await Promise.all([
      fetchExplorerJson<{ result: ArcTx[] }>(
        `${ARCSCAN_API_BASE}?module=account&action=txlist&address=${address}&page=1&offset=${Math.max(limit, 20)}&sort=desc`
      ),
      fetchExplorerJson<{ result: ArcTokenTransfer[] }>(
        `${ARCSCAN_API_BASE}?module=account&action=tokentx&address=${address}&page=1&offset=${Math.max(limit, 40)}&sort=desc`
      ),
    ]);

    const txs = Array.isArray(txListResponse.result) ? txListResponse.result : [];
    const tokenTransfers = Array.isArray(tokenTransferResponse.result) ? tokenTransferResponse.result : [];

    const txMap = new Map<string, ArcTx>();
    for (const tx of txs) {
      txMap.set(tx.hash.toLowerCase(), tx);
    }

    const transferMap = new Map<string, ArcTokenTransfer[]>();
    for (const transfer of tokenTransfers) {
      const hash = transferHash(transfer).toLowerCase();
      if (!hash) continue;
      const current = transferMap.get(hash) || [];
      current.push(transfer);
      transferMap.set(hash, current);
    }

    const allHashes = new Set<string>([
      ...Array.from(txMap.keys()),
      ...Array.from(transferMap.keys()),
    ]);

    const items: WalletHistoryItem[] = Array.from(allHashes).map((hash) => {
      const tx = txMap.get(hash);
      const relatedTransfers = transferMap.get(hash) || [];

      const outgoing = relatedTransfers.filter((item) => item.from.toLowerCase() === address);
      const incoming = relatedTransfers.filter((item) => item.to.toLowerCase() === address);

      const timestampValue = tx?.timeStamp || relatedTransfers[0]?.timeStamp || '0';
      const timestamp = new Date(Number(timestampValue) * 1000).toISOString();
      const status = tx?.isError === '1' || tx?.txreceipt_status === '0' ? 'failed' : 'completed';

      if (outgoing.length > 0 && incoming.length > 0) {
        const sent = outgoing[0];
        const received = incoming[0];
        return {
          id: hash,
          txHash: hash,
          timestamp,
          status,
          type: 'swap',
          title: `Swap ${sent.tokenSymbol} to ${received.tokenSymbol}`,
          subtitle: 'Token swap',
          amountDisplay: `${formatAmount(sent.value, Number(sent.tokenDecimal || '18'))} ${sent.tokenSymbol} -> ${formatAmount(received.value, Number(received.tokenDecimal || '18'))} ${received.tokenSymbol}`,
          tokenSymbol: received.tokenSymbol,
          explorerUrl: `${EXPLORER_TX_BASE}${hash}`,
        };
      }

      if (outgoing.length > 0) {
        const sent = outgoing[0];
        return {
          id: hash,
          txHash: hash,
          timestamp,
          status,
          type: 'send',
          title: `Sent ${sent.tokenSymbol}`,
          subtitle: `To ${sent.to.slice(0, 6)}...${sent.to.slice(-4)}`,
          amountDisplay: `${formatAmount(sent.value, Number(sent.tokenDecimal || '18'))} ${sent.tokenSymbol}`,
          tokenSymbol: sent.tokenSymbol,
          explorerUrl: `${EXPLORER_TX_BASE}${hash}`,
        };
      }

      if (incoming.length > 0) {
        const received = incoming[0];
        return {
          id: hash,
          txHash: hash,
          timestamp,
          status,
          type: 'receive',
          title: `Received ${received.tokenSymbol}`,
          subtitle: `From ${received.from.slice(0, 6)}...${received.from.slice(-4)}`,
          amountDisplay: `${formatAmount(received.value, Number(received.tokenDecimal || '18'))} ${received.tokenSymbol}`,
          tokenSymbol: received.tokenSymbol,
          explorerUrl: `${EXPLORER_TX_BASE}${hash}`,
        };
      }

      const isOutgoing = tx?.from?.toLowerCase() === address;
      const nativeValue = tx ? formatAmount(tx.value || '0', 18) : '0';
      return {
        id: hash,
        txHash: hash,
        timestamp,
        status,
        type: isOutgoing ? 'send' : 'transaction',
        title: isOutgoing ? 'Contract interaction' : 'Wallet transaction',
        subtitle: tx?.to
          ? `${isOutgoing ? 'To' : 'From'} ${(isOutgoing ? tx.to : tx.from).slice(0, 6)}...${(isOutgoing ? tx.to : tx.from).slice(-4)}`
          : 'On-chain activity',
        amountDisplay: nativeValue === '0' ? '0 USDC' : `${nativeValue} USDC`,
        tokenSymbol: 'USDC',
        explorerUrl: `${EXPLORER_TX_BASE}${hash}`,
      };
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ items: items.slice(0, limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
  }
}
