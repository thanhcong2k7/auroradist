import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.454.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.454.0";

// CORS Headers to allow browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Setup R2 Client
    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
      },
    });

    // 3. Parse Request
    const { filename, fileType } = await req.json();

    // Basic validation
    if (!filename || !fileType) {
        return new Response(JSON.stringify({ error: "Missing filename or fileType" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // 4. Generate Unique Key
    const key = `${crypto.randomUUID()}-${filename}`;

    // 5. Generate Presigned URL
    const command = new PutObjectCommand({
      Bucket: Deno.env.get("R2_BUCKET_NAME"),
      Key: key,
      ContentType: fileType,
    });

    // expiresIn: 3600 seconds (1 hour)
    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    const publicUrl = `${Deno.env.get("R2_PUBLIC_DOMAIN")}/${key}`;

    // 6. Return Success Response
    return new Response(
      JSON.stringify({ uploadUrl, publicUrl }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      },
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});