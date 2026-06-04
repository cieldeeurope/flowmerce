import { getAdminAuthHeaders, getApiBaseUrl, signOutAdmin } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response) {
   const rawText = await response.text().catch(() => "");
   let data = {};

   if (rawText) {
      try {
         data = JSON.parse(rawText);
      } catch {
         data = { rawText };
      }
   }

   if (response.status === 401 || response.status === 403) {
      signOutAdmin();
      throw new Error("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
   }

   if (!response.ok || data?.success === false) {
      throw new Error(
         data.message ||
            data.error ||
            data.rawText ||
            `관리자 API 요청에 실패했습니다. (HTTP ${response.status})`,
      );
   }

   return data;
}

function normalizeListResponse(data, key) {
   if (Array.isArray(data)) {
      return data;
   }

   if (Array.isArray(data?.[key])) {
      return data[key];
   }

   return [];
}

export async function fetchAdminUsers() {
   const response = await fetch(`${API_BASE_URL}/user/admin/users`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "users");
}

export async function createAdminUser(payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminUser(id, payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users/${id}`, {
      method: "PUT",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function fetchAdminHostingAccounts() {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "accounts");
}

export async function createAdminHostingAccount(payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminHostingAccount(id, payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts/${id}`, {
      method: "PUT",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function fetchCafe24AuthorizeUrl({ mallId, state }) {
   const query = new URLSearchParams({
      mallId: String(mallId || "").trim(),
      state: String(state || "").trim(),
   });

   const response = await fetch(`${API_BASE_URL}/cafe24/authorize-url?${query.toString()}`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   return parseApiResponse(response);
}

function resolveFilenameFromDisposition(disposition) {
   const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(
      disposition || "",
   );

   if (!match) {
      return "";
   }

   return decodeURIComponent(match[1] || match[2] || "");
}

function sanitizeFilenamePart(value, fallback = "sitemap", maxLength = 80) {
   const sanitized = String(value || fallback)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/[%#&=+]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

   return (sanitized || fallback).slice(0, maxLength);
}

function ensureFileExtension(filename, extension) {
   const safeExtension = extension.startsWith(".") ? extension : `.${extension}`;
   const base = filename || `download${safeExtension}`;

   if (base.toLowerCase().endsWith(safeExtension.toLowerCase())) {
      return base;
   }

   return base.replace(/\.[^.]+$/, "") + safeExtension;
}

function isXmlLike(value) {
   const text = String(value || "").trim();
   return (
      text.startsWith("<?xml") ||
      text.startsWith("<urlset") ||
      text.startsWith("<sitemapindex")
   );
}

function resolveSitemapXmlFromJson(data) {
   const xml =
      data?.xml ||
      data?.sitemapXml ||
      data?.sitemap ||
      data?.content ||
      data?.data?.xml ||
      data?.data?.sitemapXml ||
      data?.data?.sitemap ||
      "";

   return typeof xml === "string" && isXmlLike(xml) ? xml : "";
}

function createZipHeader(size) {
   return new Uint8Array(size);
}

function writeUInt16LE(buffer, offset, value) {
   new DataView(buffer.buffer).setUint16(offset, value, true);
}

function writeUInt32LE(buffer, offset, value) {
   new DataView(buffer.buffer).setUint32(offset, value >>> 0, true);
}

function crc32(bytes) {
   let crc = 0xffffffff;

   for (const byte of bytes) {
      crc ^= byte;

      for (let bit = 0; bit < 8; bit += 1) {
         crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
   }

   return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime() {
   const now = new Date();
   const year = Math.max(now.getFullYear(), 1980);
   const date =
      ((year - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();
   const time =
      (now.getHours() << 11) |
      (now.getMinutes() << 5) |
      Math.floor(now.getSeconds() / 2);

   return { date, time };
}

function buildZipBlob(files) {
   const encoder = new TextEncoder();
   const localParts = [];
   const centralParts = [];
   let offset = 0;

   files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const contentBytes = encoder.encode(file.content);
      const crc = crc32(contentBytes);
      const { date, time } = getDosDateTime();

      const localHeader = createZipHeader(30);
      writeUInt32LE(localHeader, 0, 0x04034b50);
      writeUInt16LE(localHeader, 4, 20);
      writeUInt16LE(localHeader, 6, 0x0800);
      writeUInt16LE(localHeader, 8, 0);
      writeUInt16LE(localHeader, 10, time);
      writeUInt16LE(localHeader, 12, date);
      writeUInt32LE(localHeader, 14, crc);
      writeUInt32LE(localHeader, 18, contentBytes.length);
      writeUInt32LE(localHeader, 22, contentBytes.length);
      writeUInt16LE(localHeader, 26, nameBytes.length);
      writeUInt16LE(localHeader, 28, 0);

      localParts.push(localHeader, nameBytes, contentBytes);

      const centralHeader = createZipHeader(46);
      writeUInt32LE(centralHeader, 0, 0x02014b50);
      writeUInt16LE(centralHeader, 4, 20);
      writeUInt16LE(centralHeader, 6, 20);
      writeUInt16LE(centralHeader, 8, 0x0800);
      writeUInt16LE(centralHeader, 10, 0);
      writeUInt16LE(centralHeader, 12, time);
      writeUInt16LE(centralHeader, 14, date);
      writeUInt32LE(centralHeader, 16, crc);
      writeUInt32LE(centralHeader, 20, contentBytes.length);
      writeUInt32LE(centralHeader, 24, contentBytes.length);
      writeUInt16LE(centralHeader, 28, nameBytes.length);
      writeUInt16LE(centralHeader, 30, 0);
      writeUInt16LE(centralHeader, 32, 0);
      writeUInt16LE(centralHeader, 34, 0);
      writeUInt16LE(centralHeader, 36, 0);
      writeUInt32LE(centralHeader, 38, 0);
      writeUInt32LE(centralHeader, 42, offset);

      centralParts.push(centralHeader, nameBytes);
      offset += localHeader.length + nameBytes.length + contentBytes.length;
   });

   const centralDirectoryLength = centralParts.reduce(
      (sum, part) => sum + part.length,
      0,
   );
   const endRecord = createZipHeader(22);
   writeUInt32LE(endRecord, 0, 0x06054b50);
   writeUInt16LE(endRecord, 4, 0);
   writeUInt16LE(endRecord, 6, 0);
   writeUInt16LE(endRecord, 8, files.length);
   writeUInt16LE(endRecord, 10, files.length);
   writeUInt32LE(endRecord, 12, centralDirectoryLength);
   writeUInt32LE(endRecord, 16, offset);
   writeUInt16LE(endRecord, 20, 0);

   return new Blob([...localParts, ...centralParts, endRecord], {
      type: "application/zip",
   });
}

function addSitemapFile(files, seenNames, name, content) {
   if (!isXmlLike(content)) {
      return;
   }

   let safeName = ensureFileExtension(sanitizeFilenamePart(name), ".xml");
   let suffix = 2;

   while (seenNames.has(safeName)) {
      safeName = ensureFileExtension(
         `${sanitizeFilenamePart(name)}-${suffix}`,
         ".xml",
      );
      suffix += 1;
   }

   seenNames.add(safeName);
   files.push({
      name: safeName,
      content,
   });
}

function collectSitemapFilesFromJson(data, fallbackIndexName) {
   const files = [];
   const seenNames = new Set();

   const knownArrays = [
      data?.files,
      data?.zipFiles,
      data?.sitemaps,
      data?.data?.files,
      data?.data?.zipFiles,
      data?.data?.sitemaps,
   ].filter(Array.isArray);

   knownArrays.flat().forEach((item, index) => {
      const content =
         item?.content ||
         item?.xml ||
         item?.sitemapXml ||
         item?.sitemap ||
         item?.data;
      const name =
         item?.name ||
         item?.fileName ||
         item?.filename ||
         `sitemap-${index + 1}.xml`;

      addSitemapFile(files, seenNames, name, content);
   });

   const indexXml = resolveSitemapXmlFromJson(data);
   if (indexXml) {
      addSitemapFile(files, seenNames, fallbackIndexName, indexXml);
   }

   return files;
}

async function blobLooksLikeZip(blob) {
   const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
   return (
      signature[0] === 0x50 &&
      signature[1] === 0x4b &&
      (signature[2] === 0x03 || signature[2] === 0x05 || signature[2] === 0x07)
   );
}

export async function generateAdminSitemap({ site, apiKey }) {
   const normalizedSite = String(site || "").trim();
   const normalizedApiKey = String(apiKey || "").trim();
   const safeSite = sanitizeFilenamePart(normalizedSite || "cieldeeurope", "cieldeeurope", 32);
   const safeApiKey = sanitizeFilenamePart(normalizedApiKey || "products", "products", 48);

   const response = await fetch(`${API_BASE_URL}/update/generate-sitemap`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
         Accept: "application/zip, application/json, application/xml;q=0.9, */*;q=0.8",
      }),
      body: JSON.stringify({
         siteName: normalizedSite,
         apiKey: normalizedApiKey,
      }),
   });

   const contentType = response.headers.get("content-type") || "";
   const fallbackZipFilename = `sitemaps-${safeSite}-${safeApiKey}.zip`;
   const fallbackIndexFilename = `sitemap-index-${safeApiKey}.xml`;
   const filename =
      resolveFilenameFromDisposition(response.headers.get("content-disposition")) ||
      fallbackZipFilename;

   if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
         signOutAdmin();
         throw new Error("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
      }

      if (!response.ok || data?.success === false) {
         throw new Error(data.message || "사이트맵 생성에 실패했습니다.");
      }

      const sitemapFiles = collectSitemapFilesFromJson(data, fallbackIndexFilename);
      if (sitemapFiles.length) {
         return {
            blob: buildZipBlob(sitemapFiles),
            filename: ensureFileExtension(filename, ".zip"),
            message:
               data.message ||
               `사이트맵 ${sitemapFiles.length}개를 ZIP으로 묶었습니다.`,
         };
      }

      const xml = resolveSitemapXmlFromJson(data);

      if (!xml) {
         return {
            blob: null,
            filename,
            message:
               data.message ||
               `${normalizedSite || "사이트"} sitemap 생성 요청이 완료되었습니다.`,
         };
      }

      return {
         blob: new Blob([xml], { type: "application/xml;charset=utf-8" }),
         filename: ensureFileExtension(fallbackIndexFilename, ".xml"),
         message: data.message || "",
      };
   }

   if (response.status === 401 || response.status === 403) {
      signOutAdmin();
      throw new Error("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
   }

   if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(body || "사이트맵 생성에 실패했습니다.");
   }

   const blob = await response.blob();
   const isZip =
      contentType.includes("zip") ||
      contentType.includes("octet-stream") ||
      (await blobLooksLikeZip(blob));

   return {
      blob,
      filename: isZip
         ? ensureFileExtension(filename, ".zip")
         : ensureFileExtension(filename || fallbackIndexFilename, ".xml"),
      message: "",
   };
}

export async function exchangeCafe24AccessToken(payload) {
   const response = await fetch(`${API_BASE_URL}/cafe24/token/exchange`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}
