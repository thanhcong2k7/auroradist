import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/services/api";
import {
  Upload,
  Loader2,
  Database,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function State51Importer() {
  const [step, setStep] = useState<
    "IDLE" | "PARSING" | "MAPPING" | "UPLOADING" | "COMPLETE"
  >("IDLE");
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; valid: number } | null>(
    null,
  );

  // --- HELPER FUNCTIONS ---

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const findVal = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const match = rowKeys.find(
        (rk) => rk.toLowerCase().trim() === k.toLowerCase().trim(),
      );
      if (match) return row[match];
    }
    return null;
  };

  const cleanString = (val: any) => (val ? String(val).trim() : null);

  const parseDate2 = (val: any) => {
    if (!val) return null;
    try {
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        // const timezoneOffsetInMs = val.getTimezoneOffset() * 60000;
        // const adjustedDate = new Date(val.getTime() - timezoneOffsetInMs);
        const safeDate = new Date(val.getTime() + 12 * 60 * 60 * 1000);
        const y = safeDate.getUTCFullYear();
        const m = String(safeDate.getUTCMonth() + 1).padStart(2, "0");
        const d = String(safeDate.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const dateStr = String(val).trim();
      // Xử lý format DD-MM-YY (Ví dụ: 01-10-25)
      if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split("-");
        let y = parseInt(parts[2]);
        const m = parts[1];
        const d = parts[0];
        y += 2000;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      // Xử lý format DD-MM-YYYY (Ví dụ: 01-01-2026)
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split("-");
        const y = parts[2];
        const m = parts[1];
        const d = parts[0];
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      if (dateStr.includes("/")) {
        const [d, m, y] = dateStr.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      return new Date(dateStr).toISOString().split("T")[0];
    } catch (e) {
      return null;
    }
  };
  //Given DD-MM-YYYY fixed input for parseDate function, now convert it to 
  const parseDate = (val: any) => {
    if (!val) return null;
    try {
      // Vì raw: false, val bây giờ luôn là string text từ Excel hoặc CSV
      const dateStr = String(val).trim();

      // Xử lý format DD-MM-YY (Ví dụ: 01-10-25)
      if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split("-");
        let y = parseInt(parts[2]);
        const m = parts[1];
        const d = parts[0];
        y += 2000;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }

      // Xử lý format DD-MM-YYYY (Ví dụ: 01-01-2026)
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split("-");
        const y = parts[2];
        const m = parts[1];
        const d = parts[0];
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }

      // Xử lý format DD/MM/YYYY hoặc MM/DD/YYYY
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        // Tuỳ thuộc vào định dạng xuất của file là DD/MM hay MM/DD
        // Dưới đây là giả định file đang xuất dạng DD/MM/YYYY
        const d = parts[0];
        const m = parts[1];
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }

      // Fallback cho chuẩn ISO (nếu có file nào trả về dạng YYYY-MM-DD)
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
      }

      return dateStr;
    } catch (e) {
      return null;
    }
  };

  // --- MAIN LOGIC ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("PARSING");
    setLogs([`📂 Reading file: ${file.name}...`]);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      let jsonData: any[] = [];
      process.env.TZ = 'UTC';
      if (fileExt === "xlsx" || fileExt === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          raw: true,
        });
      } else {
        await new Promise((resolve) => {
          Papa.parse(file,
             {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              jsonData = res.data;
              resolve(true);
            },
          });
        });
      }

      // Chuyển sang bước xử lý và map dữ liệu
      await processAndMapData(jsonData);
    } catch (err: any) {
      setLogs((prev) => [`❌ File Error: ${err.message}`, ...prev]);
      setStep("IDLE");
    }
  };

  const processAndMapData = async (rows: any[]) => {
    setStep("MAPPING");
    setLogs((prev) => [
      `⚙️ Analyzed ${rows.length} rows. Extracting ISRCs...`,
      ...prev,
    ]);

    // 1. Lấy danh sách ISRC duy nhất để query DB
    const uniqueIsrcs = new Set<string>();
    rows.forEach((row) => {
      const isrc = cleanString(findVal(row, ["ISRC"]));
      if (isrc) uniqueIsrcs.add(isrc.toUpperCase());
    });

    setLogs((prev) => [
      `🔍 Looking up owners for ${uniqueIsrcs.size} unique ISRCs...`,
      ...prev,
    ]);

    // 2. Query DB để tìm chủ sở hữu (User ID)
    // Chúng ta chia nhỏ query để tránh lỗi URL too long
    const isrcOwnerMap = new Map<string, string>();
    const isrcArray = Array.from(uniqueIsrcs);
    const BATCH_LOOKUP_SIZE = 500;

    for (let i = 0; i < isrcArray.length; i += BATCH_LOOKUP_SIZE) {
      const chunk = isrcArray.slice(i, i + BATCH_LOOKUP_SIZE);
      const { data, error } = await supabase
        .from("tracks")
        .select("isrc, releases!inner(uid)")
        .in("isrc", chunk);

      if (error) {
        console.error("Lookup Error:", error);
        setLogs((prev) => [`⚠️ Lookup warning: ${error.message}`, ...prev]);
      } else if (data) {
        data.forEach((item: any) => {
          if (item.isrc && item.releases?.uid) {
            isrcOwnerMap.set(item.isrc.toUpperCase(), item.releases.uid);
          }
        });
      }

      // Delay nhẹ để tránh spam
      if (i % 2000 === 0 && i > 0) await delay(100);
    }

    setLogs((prev) => [
      `✅ Found ${uniqueIsrcs.size} from analytics file, mapped ${isrcOwnerMap.size} ISRCs to Users.`,
      ...prev,
    ]);

    // 3. Transform Data
    const batchId = crypto.randomUUID();
    const payload: any[] = [];
    let validCount = 0;
    for (const row of rows) {
      const isrc = cleanString(findVal(row, ["ISRC"]))?.toUpperCase();
      if (!isrcOwnerMap.get(isrc)) continue; // Ý tưởng sẽ là chỉ push những record có chứa ISRC đã tồn tại trên database, còn lại sẽ bỏ qua
      const quantity = parseInt(
        findVal(row, ["Total Units", "Units", "Quantity"]) || "0",
      );

      let revenue = parseFloat(findVal(row, ["To Label"]) || "0");
      if (isNaN(revenue)) revenue = 0;

      if (isrc && (quantity !== 0 || revenue !== 0)) {
        // Lấy User ID từ Map, nếu không có thì để null
        const ownerId = isrcOwnerMap.get(isrc) || null;
        payload.push({
          import_batch_id: batchId,
          user_id: ownerId,
          isrc: isrc,
          upc: cleanString(findVal(row, ["UPC"])),
          platform: (
            cleanString(findVal(row, ["Music Service", "Platform"])) ||
            "UNKNOWN"
          )
            .split("-")[0]
            .trim()
            .toUpperCase(),
          country_code:
            cleanString(findVal(row, ["Country of Sale", "Country"])) ||
            "GLOBAL",
          period_start: parseDate2(findVal(row, ["Start"])),
          period_end: parseDate2(findVal(row, ["End"])),
          stream_quantity: quantity,
          revenue: revenue,
          currency:
            cleanString(findVal(row, ["Reporting Currency", "Rep Curr"])) ||
            "GBP",
          raw_data: "",
        });
        // console.log(findVal(row, ["Start"]));
        // console.log(parseDate2(findVal(row, ["Start"])));
        validCount++;
      }
    }

    setStats({ total: rows.length, valid: validCount });

    if (payload.length > 0) {
      //await uploadToSupabase(payload, batchId);
      console.log("Simulate upload");
      console.log(payload);
    } else {
      setLogs((prev) => ["⚠️ No valid data found to import.", ...prev]);
      setStep("IDLE");
    }
  };

  const uploadToSupabase = async (data: any[], batchId: string) => {
    setStep("UPLOADING");
    setLogs((prev) => [
      `🚀 Uploading ${data.length} records...`,
      ...(prev || []),
    ]);

    const CHUNK_SIZE = 500;
    let hasError = false;
    let successCount = 0;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLogs((prev) => [`🔄 Refreshing session...`, ...prev]);
        await supabase.auth.refreshSession();
      }

      // 2. Retry logic
      let retries = 3;
      let chunkSuccess = false;

      while (retries > 0 && !chunkSuccess) {
        const { error } = await supabase.from("raw_analytics").insert(chunk);
        if (error) {
          console.warn(`Chunk ${i} failed. Retries: ${retries}`, error);
          retries--;
          await delay(2000);
        } else {
          chunkSuccess = true;
          successCount += chunk.length;
        }
      }

      if (!chunkSuccess) {
        setLogs((prev) => [`❌ Failed chunk at row ${i}.`, ...prev]);
        hasError = true;
      } else {
        if ((i + CHUNK_SIZE) % 5000 === 0) {
          setLogs((prev) => [
            `... processed ${Math.min(i + CHUNK_SIZE, data.length)} rows`,
            ...prev,
          ]);
        }
      }

      // 3. Delay giữa các chunks để trình duyệt không bị treo
      await delay(100);
    }

    if (!hasError) {
      setStep("COMPLETE");
      setLogs((prev) => [
        `✅ IMPORT SUCCESSFUL! Batch ID: ${batchId}`,
        ...prev,
      ]);
    } else {
      setStep("IDLE");
      setLogs((prev) => [`⚠️ Import finished with some errors.`, ...prev]);
    }
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Database className="text-blue-500" /> State51 Import
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Parses CSV/XLSX & Maps ISRC to Owners
          </p>
        </div>
        {step === "COMPLETE" && (
          <div className="bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20 text-right">
            <p className="text-green-500 font-bold text-sm">Done</p>
            <p className="text-xs text-gray-400">{stats?.valid} saved</p>
          </div>
        )}
      </div>

      {/* Upload Box */}
      {step === "IDLE" || step === "COMPLETE" ? (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-10 hover:bg-white/5 transition text-center relative group">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <Upload
            className="mx-auto text-gray-500 mb-3 group-hover:text-blue-500 transition-colors"
            size={32}
          />
          <p className="text-sm font-bold text-white">Drop Report File</p>
          <p className="text-xs text-gray-500 mt-1">Auto-detects format</p>
        </div>
      ) : (
        <div className="bg-black/50 border border-white/10 rounded-xl p-8 text-center space-y-3">
          {step === "PARSING" && (
            <Loader2 className="animate-spin mx-auto text-blue-500" size={32} />
          )}
          {step === "MAPPING" && (
            <Database
              className="animate-pulse mx-auto text-yellow-500"
              size={32}
            />
          )}
          {step === "UPLOADING" && (
            <Upload
              className="animate-bounce mx-auto text-green-500"
              size={32}
            />
          )}

          <p className="text-white font-mono text-sm uppercase tracking-wider">
            {step}...
          </p>
        </div>
      )}

      {/* Logs Window */}
      <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] custom-scrollbar">
        {logs.length === 0 && <p className="text-gray-700 italic">Logs...</p>}
        {logs.map((log, i) => (
          <div
            key={i}
            className={`mb-1 ${log.includes("❌") ? "text-red-500" : log.includes("✅") ? "text-green-400" : log.includes("⚠️") ? "text-yellow-500" : "text-gray-400"}`}
          >
            <span className="opacity-30 mr-2">
              [{new Date().toLocaleTimeString()}]
            </span>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
