const CIRCLE_API_BASE_URL = 'https://api.circle.com';
const CIRCLE_SANDBOX_BASE_URL = 'https://api-sandbox.circle.com';
const LOCAL_PROXY_BASE_PATH = '/api/circle-proxy';

function toProxyUrl(input: RequestInfo | URL): string | null {
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    const url = new URL(rawUrl);
    if (url.hostname.endsWith('circle.com')) {
      // Encode the entire original hostname and path to pass to the proxy
      // The proxy will need to know which subdomain to hit
      return `${LOCAL_PROXY_BASE_PATH}/${url.hostname}${url.pathname}${url.search}`;
    }
  } catch (e) {
    return null;
  }

  return null;
}

export async function withCircleApiProxy<T>(work: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') {
    return work();
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const proxyUrl = toProxyUrl(input);

    if (!proxyUrl) {
      return originalFetch(input, init);
    }

    // If input is a Request object, we need to extract its parts
    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      
      // We don't want to pass the original authorization if it exists, 
      // as the proxy will inject the correct one.
      // headers.delete('authorization'); 

      const body = (input.method !== 'GET' && input.method !== 'HEAD') 
        ? await input.text() 
        : undefined;

      return originalFetch(proxyUrl, {
        method: input.method,
        headers: headers,
        body: body,
        credentials: 'same-origin',
        cache: 'no-store'
      });
    }

    return originalFetch(proxyUrl, init);
  };

  try {
    return await work();
  } finally {
    window.fetch = originalFetch;
  }
}
