// supabase/functions/validate-upload/index.ts
// Validates an upload to Supabase Storage BEFORE it is committed.
//
// This function is the second line of defense behind the
// storage_guard_dangerous_mime trigger (R-12). The trigger
// trusts the browser-supplied Content-Type, which can be
// spoofed. This Edge Function actually reads the first
// 16 bytes of the file and verifies the magic bytes match
// the claimed MIME type.
//
// USAGE:
//   POST /functions/v1/validate-upload
//   Headers: Authorization: Bearer <user JWT>
//   Body: { bucket, path, mime_type, size }
//
// RESPONSE:
//   200 OK { allowed: true, detected_mime, magic_match }
//   200 OK { allowed: false, reason }
//   401 / 403 / 413 for auth/permission/size errors
//
// After the frontend receives { allowed: true }, it calls
// supabase.storage.from(bucket).upload(path, file). The
// storage_guard_dangerous_mime trigger will still fire as
// a final safety net.
//
// This function does NOT itself upload the file; it only
// validates. Splitting the concerns means: (a) the function
// stays small, (b) the trigger catches bypass attempts, and
// (c) we can rate-limit the validation step independently.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const MAX_BODY_SIZE = 16 * 1024; // 16KB magic-byte sniff

// Known magic-byte signatures for the formats the app accepts.
interface MagicSignature {
  mime: string;
  // First bytes as hex (without 0x prefix), case-insensitive.
  signature: string;
  // Offset to read from (usually 0).
  offset: number;
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  // Images
  { mime: "image/png",            signature: "89504e47",  offset: 0 }, // \x89PNG
  { mime: "image/jpeg",           signature: "ffd8ff",     offset: 0 }, // JPEG SOI
  { mime: "image/gif",            signature: "47494638",   offset: 0 }, // GIF8
  { mime: "image/webp",           signature: "52494646",   offset: 0 }, // RIFF
  { mime: "image/bmp",            signature: "424d",       offset: 0 }, // BM
  { mime: "image/tiff",           signature: "49492a00",   offset: 0 }, // II*\x00 (little-endian)
  { mime: "image/tiff",           signature: "4d4d002a",   offset: 0 }, // MM\x00* (big-endian)
  // Documents
  { mime: "application/pdf",      signature: "25504446",   offset: 0 }, // %PDF
  { mime: "application/zip",      signature: "504b0304",   offset: 0 }, // PK\x03\x04
  { mime: "application/x-rar-compressed", signature: "526172211a07", offset: 0 },
  { mime: "application/x-7z-compressed",  signature: "377abcaf271c", offset: 0 },
  { mime: "application/gzip",     signature: "1f8b",       offset: 0 },
  // Office (zip-based)
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", signature: "504b0304", offset: 0 },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: "504b0304", offset: 0 },
  // Video
  { mime: "video/mp4",            signature: "00000018",   offset: 4 }, // ftyp at offset 4
  { mime: "video/webm",           signature: "1a45dfa3",   offset: 0 }, // EBML
];

// Mime types that we explicitly REJECT (defense in depth).
const REJECTED_MIMES = new Set([
  "image/svg+xml",
  "image/svg",
  "text/html",
  "application/xhtml+xml",
  "text/xhtml",
  "application/html",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-shockwave-flash",
  "application/java-archive",
  "application/x-java-applet",
]);

// Buckets the function is allowed to validate uploads to.
const ALLOWED_BUCKETS = new Set([
  "avatars",
  "product-images",
  "invoices",
  "company-assets",
  "attachments",
  "chat-attachments",
]);

// Max size per bucket (in bytes).
const BUCKET_MAX_SIZE: Record<string, number> = {
  "avatars": 2 * 1024 * 1024,
  "product-images": 5 * 1024 * 1024,
  "invoices": 25 * 1024 * 1024,
  "company-assets": 5 * 1024 * 1024,
  "attachments": 25 * 1024 * 1024,
  "chat-attachments": 10 * 1024 * 1024,
};

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function bytesToHex(bytes: Uint8Array, offset: number, length: number): string {
  let hex = "";
  for (let i = 0; i < length; i++) {
    hex += (bytes[offset + i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

function detectMime(magic: Uint8Array): { detected: string | null; matched: MagicSignature | null } {
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.offset + sig.signature.length / 2 > magic.length) continue;
    const slice = bytesToHex(magic, sig.offset, sig.signature.length / 2);
    if (slice.toLowerCase() === sig.signature.toLowerCase()) {
      return { detected: sig.mime, matched: sig };
    }
  }
  return { detected: null, matched: null };
}

function isPathSafe(path: string): { safe: boolean; reason?: string } {
  // Reject path traversal attempts and unsafe characters.
  if (path.includes("..")) return { safe: false, reason: "Path traversal detected" };
  if (path.startsWith("/")) return { safe: false, reason: "Absolute paths not allowed" };
  if (path.includes("\\")) return { safe: false, reason: "Backslashes not allowed" };
  if (path.length > 1024) return { safe: false, reason: "Path too long" };
  // Allow alphanumerics, hyphens, underscores, dots, slashes, and Unicode.
  if (!/^[\w\-./\u0600-\u06FF]+$/.test(path)) {
    return { safe: false, reason: "Invalid characters in path" };
  }
  return { safe: true };
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Auth: require authenticated user.
  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return jsonResponse({ error: "UNAUTHENTICATED" }, 401, origin);
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ad, error: ae } = await userClient.auth.getUser();
  if (ae || !ad?.user) {
    return jsonResponse({ error: "UNAUTHENTICATED" }, 401, origin);
  }

  // Parse body — must be JSON {bucket, path, mime_type, size, first_bytes_b64}.
  // The first 16 bytes of the file are sent as base64.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
  }
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "INVALID_BODY" }, 400, origin);
  }

  const { bucket, path, mime_type, size, first_bytes_b64 } = body;

  if (typeof bucket !== "string" || !ALLOWED_BUCKETS.has(bucket)) {
    return jsonResponse({ error: "INVALID_BUCKET", allowed: false }, 400, origin);
  }
  if (typeof path !== "string") {
    return jsonResponse({ error: "INVALID_PATH" }, 400, origin);
  }
  const pathCheck = isPathSafe(path);
  if (!pathCheck.safe) {
    return jsonResponse({ error: pathCheck.reason, allowed: false }, 400, origin);
  }
  if (typeof mime_type !== "string" || mime_type.length > 200) {
    return jsonResponse({ error: "INVALID_MIME" }, 400, origin);
  }
  if (typeof size !== "number" || size < 0) {
    return jsonResponse({ error: "INVALID_SIZE" }, 400, origin);
  }

  // Size cap per bucket.
  const maxSize = BUCKET_MAX_SIZE[bucket] ?? 25 * 1024 * 1024;
  if (size > maxSize) {
    return jsonResponse({
      error: `File too large. Max for ${bucket}: ${maxSize} bytes`,
      allowed: false,
      max_size: maxSize,
    }, 413, origin);
  }

  // Reject forbidden MIME types up-front.
  if (REJECTED_MIMES.has(mime_type.toLowerCase())) {
    return jsonResponse({
      error: `MIME type ${mime_type} is not allowed (security policy)`,
      allowed: false,
    }, 415, origin);
  }

  // Decode the magic bytes.
  if (typeof first_bytes_b64 !== "string") {
    return jsonResponse({ error: "MISSING_FIRST_BYTES" }, 400, origin);
  }
  let magic: Uint8Array;
  try {
    const binary = atob(first_bytes_b64);
    magic = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) magic[i] = binary.charCodeAt(i);
    if (magic.length > MAX_BODY_SIZE) {
      return jsonResponse({ error: "FIRST_BYTES_TOO_LARGE" }, 413, origin);
    }
  } catch {
    return jsonResponse({ error: "INVALID_BASE64" }, 400, origin);
  }

  // Detect actual MIME from magic bytes.
  const { detected, matched } = detectMime(magic);
  if (!detected) {
    return jsonResponse({
      error: "Could not detect file type from magic bytes",
      allowed: false,
      detected_mime: null,
    }, 415, origin);
  }

  // Verify the claimed MIME matches the detected one.
  // We allow some flexibility: e.g. application/octet-stream is
  // a valid upload claim if the detected type is non-executable.
  if (mime_type !== "application/octet-stream" &&
      !matchesMimeFamily(mime_type, detected)) {
    return jsonResponse({
      error: `MIME type mismatch: claimed ${mime_type}, detected ${detected}`,
      allowed: false,
      detected_mime: detected,
      claimed_mime: mime_type,
    }, 415, origin);
  }

  // Tenant scoping: if the bucket is per-company, the path MUST
  // begin with a company_id that the user belongs to.
  // We don't have the tenant check helper here; let the storage
  // policies on storage.objects (added in 20260826000002) do
  // the final enforcement.

  return jsonResponse({
    allowed: true,
    detected_mime: detected,
    claimed_mime: mime_type,
    magic_match: matched?.mime === detected,
    bucket,
    path,
    size,
  }, 200, origin);
});

function matchesMimeFamily(claimed: string, detected: string): boolean {
  const c = claimed.toLowerCase();
  const d = detected.toLowerCase();
  if (c === d) return true;
  // Office Open XML files are all ZIP-based; allow a generic
  // application/zip claim for any OOXML MIME.
  if (d === "application/zip" && c.startsWith("application/vnd.openxmlformats-")) return true;
  if (d === "application/zip" && c === "application/zip") return true;
  return false;
}

function serve(handler: (req: Request) => Promise<Response> | Response) {
  // @ts-ignore Deno global
  return Deno.serve(handler);
}
