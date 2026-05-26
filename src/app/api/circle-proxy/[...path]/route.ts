import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CIRCLE_API_BASE_URL = 'https://api-sandbox.circle.com';

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  // The first segment is now the original hostname (e.g. 'api-sandbox.circle.com')
  const [targetHost, ...rest] = pathSegments;
  
  if (!targetHost.endsWith('circle.com')) {
    // Safety fallback
    const path = pathSegments.join('/');
    const url = new URL(`${CIRCLE_API_BASE_URL}/${path}`);
    url.search = request.nextUrl.search;
    return url;
  }

  const path = rest.join('/');
  const url = new URL(`https://${targetHost}/${path}`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  const targetUrl = buildTargetUrl(context.params.path, request);
  
  console.log('[PROXY] Incoming Headers:', Array.from(request.headers.keys()).join(', '));
  const incomingAuth = request.headers.get('authorization');
  console.log('[PROXY] Incoming Auth Present:', !!incomingAuth);

  // Clone incoming headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host and other sensitive/problematic headers
    if (!['host', 'connection', 'content-length', 'origin', 'referer', 'cookie'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // FALLBACK: If Authorization is missing, inject the KIT_KEY from environment
  if (!headers.has('authorization')) {
    const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
    if (kitKey) {
      headers.set('authorization', `Bearer ${kitKey}`);
      console.log('[PROXY] Fallback: Injected KIT_KEY');
    }
  }

  console.log('[PROXY] Method:', request.method);
  console.log('[PROXY] Target:', targetUrl.toString());
  
  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text();
    init.body = body;
  }

  const upstreamResponse = await fetch(targetUrl, init);
  console.log('[PROXY] Upstream Status:', upstreamResponse.status, upstreamResponse.statusText);

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'set-cookie'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const responseBody = await upstreamResponse.text();
  if (!upstreamResponse.ok) {
    console.error('[PROXY] Error Response:', responseBody);
  }

  return new NextResponse(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return proxyRequest(request, context);
}
