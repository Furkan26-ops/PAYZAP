import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CIRCLE_API_BASE_URL = 'https://api.circle.com';

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const path = pathSegments.join('/');
  const url = new URL(`${CIRCLE_API_BASE_URL}/${path}`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  const targetUrl = buildTargetUrl(context.params.path, request);
  const headers = new Headers();

  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (authorization) headers.set('authorization', authorization);
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const upstreamResponse = await fetch(targetUrl, init);
  const responseHeaders = new Headers();
  const responseContentType = upstreamResponse.headers.get('content-type');

  if (responseContentType) {
    responseHeaders.set('content-type', responseContentType);
  }

  return new NextResponse(upstreamResponse.body, {
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
