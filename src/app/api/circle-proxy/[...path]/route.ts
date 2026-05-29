import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CIRCLE_API_BASE_URL = 'https://api-sandbox.circle.com';

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  // The first segment is now the original hostname (e.g. 'api-sandbox.circle.com' or 'api.circle.com')
  const [targetHost, ...rest] = pathSegments;
  
  if (!targetHost.endsWith('circle.com')) {
    // Safety fallback
    const path = pathSegments.join('/');
    const url = new URL(`${CIRCLE_API_BASE_URL}/${path}`);
    url.search = request.nextUrl.search;
    return url;
  }

  const path = rest.join('/');
  // Forward to the exact environment requested by the SDK
  const url = new URL(`https://${targetHost}/${path}`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  const targetUrl = buildTargetUrl(context.params.path, request);
  
  // DRASTIC STRIP: Only keep essential headers to match the successful test script
  const headers = new Headers();
  const allowedHeaders = ['content-type', 'accept', 'x-request-id', 'x-user-agent'];
  
  request.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  let kitKey = process.env.KIT_KEY || process.env.NEXT_PUBLIC_KIT_KEY;
  if (kitKey && !kitKey.includes('dummy')) {
    // Self-healing: if the user provided the raw key without the "KIT_KEY:" prefix, prepend it automatically
    if (!kitKey.startsWith('KIT_KEY:')) {
      kitKey = `KIT_KEY:${kitKey}`;
    }
    headers.set('authorization', `Bearer ${kitKey}`);
    console.log('[PROXY] Injecting KIT_KEY Auth');
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
    // Only forward safe response headers
    if (!['content-encoding', 'transfer-encoding', 'set-cookie', 'access-control-allow-origin'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // Ensure CORS headers are handled by Next.js or set explicitly if needed
  // For now, just pass through the response body.

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
