// FIX 1: Use npm: specifiers to prevent 502 boot crashes and dependency issues
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.454.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.454.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // FIX 2: Check secrets carefully
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicDomain = Deno.env.get("R2_PUBLIC_DOMAIN");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing required R2 environment variables.");
    }

    // FIX 3: clean the ID just in case (removes https:// if accidentally added)
    const cleanAccountId = accountId.replace("https://", "").replace("http://", "");

    // FIX 4: Clean publicDomain aggressively to fix "https://domain.com/other.domain.com" issues
    let cleanPublicDomain = publicDomain || "";
    
    // Attempt to parse as a URL and only keep the origin (protocol + host), discarding any path
    try {
      // If it doesn't start with http, add it for parsing
      const urlStr = cleanPublicDomain.startsWith('http') ? cleanPublicDomain : `https://${cleanPublicDomain}`;
      const url = new URL(urlStr);
      cleanPublicDomain = url.origin; // This strips "/asset.koyrecords.com", "/account.r2...", etc.
    } catch (e) {
      // Fallback manual cleanup if URL parsing fails
      cleanPublicDomain = cleanPublicDomain.replace(/\/$/, "");
      const badSuffix = new RegExp(`/${cleanAccountId}\\.r2\\.cloudflarestorage\\.com`);
      cleanPublicDomain = cleanPublicDomain.replace(badSuffix, "");
    }

    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const { filename, fileType } = await req.json();
    
    // Basic validation
    if (!filename || !fileType) {
        throw new Error("Missing filename or fileType in request body");
    }

    const key = `${crypto.randomUUID()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    const publicUrl = `${cleanPublicDomain}/${key}`;

    return new Response(JSON.stringify({ uploadUrl, publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Log the REAL error to the Supabase dashboard/CLI so you can see it
    console.error("FUNCTION ERROR:", error); 

    return new Response(JSON.stringify({ error: error.message, type: "Server Error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});