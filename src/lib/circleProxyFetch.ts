const CIRCLE_API_BASE_URL = 'https://api.circle.com';
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
      return `${LOCAL_PROXY_BASE_PATH}/${url.hostname}${url.pathname}${url.search}`;
    }
  } catch (e) {
    return null;
  }

  return null;
}

// PERMANENT OVERRIDE to avoid timing issues with the wrapper
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const proxyUrl = toProxyUrl(input);

    if (!proxyUrl) {
      return originalFetch(input, init);
    }

    console.log('[INTERCEPTOR] Proxying:', input.toString(), '->', proxyUrl);

    if (input instanceof Request) {
      return originalFetch(new Request(proxyUrl, input.clone()));
    }

    return originalFetch(proxyUrl, init);
  };
}

export async function withCircleApiProxy<T>(work: () => Promise<T>): Promise<T> {
  // Now this is just a pass-through because the global override is already active
  return work();
}
