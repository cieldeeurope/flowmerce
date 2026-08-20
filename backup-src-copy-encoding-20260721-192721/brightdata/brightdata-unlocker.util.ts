import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

type UnlockerExpect = {
  element?: string;
  text?: string;
};

type UnlockerOptions = {
  requiredMarker?: string;
  requiredSelector?: string;
  expect?: UnlockerExpect;
  country?: string | false;
  debugLabel?: string;
  saveRetryResponses?: boolean;
  randomRetryDelay?: boolean;
  render?: boolean;
  timeoutMs?: number;
  formats?: Array<'raw' | 'json'>;
};

const RETRY_DELAYS_MS = [10000, 20000, 30000, 60000];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractHtml(data: any): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    const trimmed = data.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return extractHtml(JSON.parse(trimmed));
      } catch {
        return data;
      }
    }

    return data;
  }

  const possibleHtml =
    data.body ||
    data.html ||
    data.page_html ||
    data.content ||
    data.response ||
    data.data;

  return typeof possibleHtml === 'string' ? extractHtml(possibleHtml) : null;
}

function parsePossibleJson(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return data;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return data;
    }
  }

  return data;
}

function getBrightDataPayloadError(data: any): string | null {
  const parsed = parsePossibleJson(data);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const statusCode = Number(parsed.status_code || parsed.statusCode || parsed.status);
  const headers = parsed.headers || {};
  const brdError = headers['x-brd-error'] || headers['X-Brd-Error'] || parsed.error;
  const brdErrorCode =
    headers['x-brd-error-code'] ||
    headers['X-Brd-Error-Code'] ||
    parsed.error_code ||
    parsed.errorCode;

  if (statusCode >= 400 || brdError || brdErrorCode) {
    return [
      statusCode ? `status_code=${statusCode}` : null,
      brdError ? `error=${brdError}` : null,
      brdErrorCode ? `code=${brdErrorCode}` : null,
    ]
      .filter(Boolean)
      .join(', ');
  }

  return null;
}

function getErrorText(error: any): string {
  const data = error?.response?.data;

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  if (typeof data === 'string') {
    return data;
  }

  if (data) {
    try {
      return JSON.stringify(data);
    } catch {}
  }

  return error?.message || String(error || '');
}

function shortenForLog(text: string, maxLength = 500): string {
  const normalized = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'empty response';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

function isBrightDataThrottle(text: string): boolean {
  return /auto-throttled|low success rate|sr_rate_limit|decrease your request rate|too many requests/i.test(text);
}

function looksLikeHtmlDocument(text: string): boolean {
  return /<!doctype\s+html|<html[\s>]|<body[\s>]|<\/html>/i.test(text);
}

function hasSelectorContent(html: string, selector: string): boolean {
  const $ = cheerio.load(html);
  const element = $(selector).first();
  if (!element.length) return false;
  return Boolean((element.html() || element.text() || '').trim());
}

function getMissingRequiredReason(html: string, options: UnlockerOptions, format: string): string | null {
  const requiredMarker = options.requiredMarker || options.expect?.text;
  const requiredSelector = options.requiredSelector || options.expect?.element;

  if (requiredMarker && !html.includes(requiredMarker)) {
    return `Unlocker response missing marker "${requiredMarker}" (${format})`;
  }

  if (requiredSelector && !hasSelectorContent(html, requiredSelector)) {
    return `Unlocker response missing selector "${requiredSelector}" (${format})`;
  }

  return null;
}

function getDebugFileSlug(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'unlocker';
}

function getRetryResponseBody(data: any): { body: string | Uint8Array; extension: string } {
  if (Buffer.isBuffer(data)) {
    return { body: new Uint8Array(data), extension: 'bin' };
  }

  if (typeof data === 'string') {
    const trimmed = data.trimStart();
    const extension =
      trimmed.startsWith('<') || looksLikeHtmlDocument(data)
        ? 'html'
        : trimmed.startsWith('{') || trimmed.startsWith('[')
          ? 'json'
          : 'txt';

    return { body: data, extension };
  }

  if (data === undefined || data === null) {
    return { body: '', extension: 'txt' };
  }

  try {
    return { body: JSON.stringify(data, null, 2), extension: 'json' };
  } catch {
    return { body: String(data), extension: 'txt' };
  }
}

function getRetryDelayMs(attempt: number, options: UnlockerOptions): number {
  if (options.randomRetryDelay) {
    return 30000 + Math.floor(Math.random() * 40001);
  }

  return RETRY_DELAYS_MS[attempt - 1] || 60000;
}

function saveRetryResponseDebug(options: {
  url: string;
  attempt: number;
  maxRetries: number;
  format: string;
  debugLabel: string;
  data: any;
  status?: number;
  headers?: any;
  errorMessage?: string;
}) {
  const debugDir = path.join(process.cwd(), 'brightdata-debug', options.debugLabel);
  fs.mkdirSync(debugDir, { recursive: true });

  const slug = getDebugFileSlug(options.url);
  const attemptLabel = `attempt-${String(options.attempt).padStart(2, '0')}-of-${String(options.maxRetries).padStart(2, '0')}`;
  const { body, extension } = getRetryResponseBody(options.data);
  const filePath = path.join(
    debugDir,
    `${Date.now()}-${attemptLabel}-${options.format}-${slug}.${extension}`,
  );

  if (typeof body === 'string') {
    fs.writeFileSync(filePath, body, 'utf8');
  } else {
    fs.writeFileSync(filePath, body);
  }

  const metaPath = filePath.replace(/\.[^.]+$/, '.meta.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        url: options.url,
        attempt: options.attempt,
        maxRetries: options.maxRetries,
        format: options.format,
        status: options.status,
        contentType: options.headers?.['content-type'],
        errorMessage: options.errorMessage,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.warn(`Bright Data Unlocker retry response saved: ${filePath}`);
}

function getCountry(url: string, countryOverride?: string | false): string | undefined {
  if (countryOverride === false) return undefined;
  if (countryOverride) return countryOverride;

  const override = process.env.BRIGHTDATA_UNLOCKER_COUNTRY;
  if (override) return override;

  try {
    const path = new URL(url).pathname.toLowerCase();
    const countryCode = path.match(/^\/([a-z]{2})(?:\/|$)/)?.[1];
    const countryMap: Record<string, string> = {
      fr: 'fr',
      de: 'de',
      it: 'it',
      es: 'es',
      nl: 'nl',
      be: 'be',
      ch: 'ch',
      gb: 'gb',
      uk: 'gb',
      us: 'us',
      ca: 'ca',
      jp: 'jp',
      kr: 'kr',
      au: 'au',
    };

    return countryCode ? countryMap[countryCode] : undefined;
  } catch {
    return undefined;
  }
}

export async function getHtmlFromBrightDataUnlocker(
  url: string,
  options: UnlockerOptions = {},
): Promise<string> {
  const apiKey =
    process.env.BRIGHTDATA_UNLOCKER_API_KEY ||
    process.env.BRIGHTDATA_API_KEY ||
    process.env.BRIGHTDATA_API_TOKEN;

  if (!apiKey) {
    throw new Error('Bright Data Unlocker API key is missing.');
  }

  const zone = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'unlocker_normal';
  const country = getCountry(url, options.country);
  const configuredRetries = Number(process.env.BRIGHTDATA_UNLOCKER_MAX_ATTEMPTS || 4);
  const maxRetries =
    Number.isFinite(configuredRetries) && configuredRetries >= 0
      ? Math.floor(configuredRetries)
      : 4;
  const totalAttempts = maxRetries + 1;
  const formats = options.formats?.length ? options.formats : ['raw', 'json'];
  let lastError: any;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const format = formats[(attempt - 1) % formats.length];
    let retryData: any;
    let retryStatus: number | undefined;
    let retryHeaders: any;

    try {
      const payload: Record<string, any> = {
        zone,
        url,
        format,
        method: 'GET',
      };

      if (typeof options.render === 'boolean') {
        payload.render = options.render;
      }

      if (country) {
        payload.country = country;
      }

      if (options.expect) {
        payload.headers = {
          'x-unblock-expect': JSON.stringify(options.expect),
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      if (options.expect) {
        headers['x-unblock-expect'] = JSON.stringify(options.expect);
      }

      const response = await axios.post(
        'https://api.brightdata.com/request',
        payload,
        {
          headers,
          timeout: options.timeoutMs || 120000,
          responseType: 'text',
          transformResponse: [(data) => data],
        },
      );

      retryData = response.data;
      retryStatus = response.status;
      retryHeaders = response.headers;

      const html = extractHtml(response.data);
      const payloadError = getBrightDataPayloadError(response.data);

      if (payloadError) {
        throw new Error(`Bright Data payload error: ${payloadError}`);
      }

      if (html && !looksLikeHtmlDocument(html) && isBrightDataThrottle(html)) {
        throw new Error(shortenForLog(html));
      }

      if (html && html.trim().length > 0) {
        const missingRequiredReason = getMissingRequiredReason(html, options, format);
        if (!missingRequiredReason) {
          return html;
        }

        lastError = new Error(missingRequiredReason);
      } else {
        lastError = new Error(`Empty Unlocker response body (${format})`);
      }
    } catch (error: any) {
      const errorText = getErrorText(error);
      lastError = new Error(shortenForLog(errorText));
      retryData = retryData ?? error?.response?.data;
      retryStatus = retryStatus ?? error?.response?.status;
      retryHeaders = retryHeaders ?? error?.response?.headers;
    }

    if (attempt <= maxRetries) {
      if (options.saveRetryResponses && options.debugLabel) {
        saveRetryResponseDebug({
          url,
          attempt,
          maxRetries,
          format,
          debugLabel: options.debugLabel,
          data: retryData,
          status: retryStatus,
          headers: retryHeaders,
          errorMessage: lastError?.message || String(lastError || ''),
        });
      }

      console.warn(
        `Bright Data Unlocker retry ${attempt}/${maxRetries}: ${lastError?.message || lastError} - ${url}`,
      );
      await sleep(getRetryDelayMs(attempt, options));
    }
  }

  throw new Error(
    `Bright Data Unlocker HTML failed: ${url} - ${lastError?.message || lastError || 'unknown error'}`,
  );
}
