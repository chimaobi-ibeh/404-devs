/**
 * STORAGE — Supabase Storage
 * Drop-in replacement for the Manus Forge API.
 * Public API (storagePut / storageGet) is unchanged so nothing else needs updating.
 */

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

const BUCKET = "vyral-uploads";

function getSupabase() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage");
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const supabase = getSupabase();
  const key = relKey.replace(/^\/+/, "");

  const body =
    typeof data === "string"
      ? Buffer.from(data)
      : data instanceof Uint8Array
      ? Buffer.from(data)
      : data;

  const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: urlData.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const supabase = getSupabase();
  const key = relKey.replace(/^\/+/, "");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: data.publicUrl };
}
