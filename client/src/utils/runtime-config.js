const normalizePath = (rawPath) => {
  if (!rawPath) return '';
  if (rawPath === '/') return '/';
  const trimmed = String(rawPath).trim();
  if (!trimmed) return '';
  return `/${trimmed.replace(/^\/+/, '')}`;
};

const tryParseUrl = (value) => {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
};

export const getBackendHttpBase = () => {
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (!explicit) {
    return '';
  }
  const parsed = tryParseUrl(explicit);
  if (!parsed) {
    return explicit.replace(/\/$/, '');
  }
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, '');
};

export const getWebSocketBaseUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const wsPath = normalizePath(import.meta.env.VITE_WS_PATH || '');
  const explicitWs = import.meta.env.VITE_WS_BASE_URL;
  if (explicitWs) {
    const parsed = tryParseUrl(explicitWs);
    if (parsed) {
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().replace(/\/$/, '') || `${parsed.protocol}//${parsed.host}`;
    }
    return explicitWs;
  }

  const backendHttp = import.meta.env.VITE_API_BASE_URL;
  if (backendHttp) {
    try {
      const parsed = new URL(backendHttp, window.location.origin);
      const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${parsed.host}${wsPath}`;
    } catch (error) {
      console.warn('[runtime-config] 无法解析 VITE_API_BASE_URL:', error);
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  if (import.meta.env.DEV) {
    const host = import.meta.env.VITE_BACKEND_HOST || 'localhost';
    const port = import.meta.env.VITE_BACKEND_PORT || '3002';
    return `${protocol}//${host}:${port}${wsPath}`;
  }

  return `${protocol}//${window.location.host}${wsPath}`;
};
