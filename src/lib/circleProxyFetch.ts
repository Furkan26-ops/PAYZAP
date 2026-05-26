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

  const isProduction = rawUrl.startsWith(CIRCLE_API_BASE_URL);
  const isSandbox = rawUrl.startsWith(CIRCLE_SANDBOX_BASE_URL);

  if (!isProduction && !isSandbox) {
    return null;
  }

  const url = new URL(rawUrl);
  return `${LOCAL_PROXY_BASE_PATH}${url.pathname}${url.search}`;
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

    if (input instanceof Request) {
      return originalFetch(
        new Request(proxyUrl, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          credentials: 'same-origin',
        })
      );
    }

    return originalFetch(proxyUrl, init);
  };

  try {
    return await work();
  } finally {
    window.fetch = originalFetch;
  }
}
