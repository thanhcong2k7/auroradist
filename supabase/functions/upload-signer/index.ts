// Deno code for Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3. command";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

serve(async (req) => {
    // 1. Setup R2 Client (S3 Compatible)
    const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
            secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
        },
    });

    // 2. Parse Request
    const { filename, fileType } = await req.json();
    const key = `${crypto.randomUUID()}-${filename}`; // Unique filename

    // 3. Generate Presigned URL
    const command = new PutObjectCommand({
        Bucket: Deno.env.get("R2_BUCKET_NAME"),
        Key: key,
        ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    const publicUrl = `${Deno.env.get("R2_PUBLIC_DOMAIN")}/${key}`;

    return new Response(JSON.stringify({ uploadUrl, publicUrl }), {
        headers: { "Content-Type": "application/json" },
    });
});