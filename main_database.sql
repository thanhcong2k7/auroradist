


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."metric_type" AS ENUM (
    'STREAM',
    'VIEW'
);


ALTER TYPE "public"."metric_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_type" AS ENUM (
    'BANK',
    'PAYPAL'
);


ALTER TYPE "public"."payout_type" OWNER TO "postgres";


CREATE TYPE "public"."release_status" AS ENUM (
    'DRAFT',
    'DELIVERED',
    'ERROR',
    'CHECKING',
    'ACCEPTED',
    'REJECTED',
    'TAKENDOWN'
);


ALTER TYPE "public"."release_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_priority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'ROYALTY',
    'WITHDRAWAL'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_distribute_revenue_bulk"("p_items" "jsonb", "p_month" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  item jsonb;
  v_upc text;
  v_platform text; -- New Variable
  v_total_amount numeric;
  v_owner_uid uuid;
  v_release_id bigint;
  v_split_record RECORD;
  v_cutoff_date date;
  v_payout_amount numeric;
  v_distributed_amount numeric;
  v_success_count int := 0;
  v_error_count int := 0;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  v_cutoff_date := (p_month + interval '1 month')::date;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_upc := (item->>'upc');
    v_platform := (item->>'platform'); -- Extract Platform
    v_total_amount := (item->>'amount')::numeric;
    v_distributed_amount := 0; 

    -- 1. Find Release ID & Owner (Smart Matching)
    SELECT id, uid INTO v_release_id, v_owner_uid 
    FROM public.releases 
    WHERE upc = v_upc OR upc = LEFT(v_upc, 12) OR v_upc = LEFT(upc, 12)
    LIMIT 1;

    IF v_release_id IS NOT NULL THEN
      
      -- 2. NEW: Insert detailed analytics record (For Charts)
      -- This stores: "User A earned $0.005 from YouTube in July"
      INSERT INTO public.analytics_detailed 
        (user_id, platform, reporting_month, revenue, created_at)
      VALUES 
        (v_owner_uid, v_platform, p_month, v_total_amount, now());

      -- 3. Calculate Splits & Pay Wallet
      
      -- A. Pay Collaborators
      FOR v_split_record IN 
          SELECT recipient_uid, percentage 
          FROM public.revenue_splits 
          WHERE release_id = v_release_id AND created_at < v_cutoff_date
      LOOP
        v_payout_amount := ROUND((v_total_amount * v_split_record.percentage) / 100, 2);
        
        IF v_payout_amount > 0 THEN
           -- Add Platform to Note
           INSERT INTO public.transactions (uid, amount, type, status, date, note)
           VALUES (v_split_record.recipient_uid, v_payout_amount, 'ROYALTY', 'COMPLETED', now(), 
                  'Split: ' || v_platform || ' - ' || v_upc);

           INSERT INTO public.wallet_summary (uid, available_balance, lifetime_earnings)
           VALUES (v_split_record.recipient_uid, v_payout_amount, v_payout_amount)
           ON CONFLICT (uid) DO UPDATE
           SET available_balance = wallet_summary.available_balance + EXCLUDED.available_balance,
               lifetime_earnings = wallet_summary.lifetime_earnings + EXCLUDED.lifetime_earnings,
               updated_at = now();

           v_distributed_amount := v_distributed_amount + v_payout_amount;
        END IF;
      END LOOP;

      -- B. Pay Owner (Remainder)
      v_payout_amount := v_total_amount - v_distributed_amount;
      IF v_payout_amount > 0 THEN
          INSERT INTO public.transactions (uid, amount, type, status, date, note)
          VALUES (v_owner_uid, v_payout_amount, 'ROYALTY', 'COMPLETED', now(), 
                  'Royalty: ' || v_platform || ' - ' || v_upc);

          INSERT INTO public.wallet_summary (uid, available_balance, lifetime_earnings)
          VALUES (v_owner_uid, v_payout_amount, v_payout_amount)
          ON CONFLICT (uid) DO UPDATE
          SET available_balance = wallet_summary.available_balance + EXCLUDED.available_balance,
              lifetime_earnings = wallet_summary.lifetime_earnings + EXCLUDED.lifetime_earnings,
              updated_at = now();
      END IF;
      
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors, 'UPC not found: ' || v_upc);
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'success_count', v_success_count, 'error_count', v_error_count, 'errors', v_errors);
END;
$_$;


ALTER FUNCTION "public"."admin_distribute_revenue_bulk"("p_items" "jsonb", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_decrypted_payouts"() RETURNS TABLE("user_id" "uuid", "user_name" "text", "method_type" "text", "decrypted_details" "text", "bank_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_secret_key text := 'YOUR_SUPER_SECRET_ENCRYPTION_KEY_2025'; -- Must match above
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY 
    SELECT 
        pm.uid,
        p.name,
        pm.type,
        -- Decrypt here
        pgp_sym_decrypt(pm.details::bytea, v_secret_key)::text,
        pm.bank_name
    FROM public.payout_methods pm
    JOIN public.profiles p ON pm.uid = p.id;
END;
$$;


ALTER FUNCTION "public"."admin_get_decrypted_payouts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_process_withdrawal"("p_txn_id" "uuid", "p_status" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_amount numeric;
  v_uid uuid;
  v_current_status text;
BEGIN
  -- 1. Check quyền Admin (Sử dụng logic của bạn)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrative privileges required.';
  END IF;

  -- 2. Validate p_status đầu vào
  IF p_status NOT IN ('COMPLETED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid status. Must be COMPLETED or REJECTED.';
  END IF;

  -- 3. Lấy thông tin giao dịch và LOCK hàng đó để tránh Race Condition
  SELECT amount, uid, status INTO v_amount, v_uid, v_current_status
  FROM public.transactions
  WHERE id = p_txn_id
  FOR UPDATE; -- Khóa hàng này lại cho đến khi Transaction kết thúc

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Transaction % not found', p_txn_id; 
  END IF;

  -- 4. Chỉ xử lý nếu đang PENDING
  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Transaction is already processed (Current status: %).', v_current_status;
  END IF;

  -- 5. Cập nhật trạng thái Transaction
  UPDATE public.transactions
  SET status = p_status,
      note = p_note,
      updated_at = now() -- Giả sử bạn có cột này
  WHERE id = p_txn_id;

  -- 6. Cập nhật Ví (Wallet Summary)
  -- Giả sử v_amount lưu trong DB là số dương (số tiền muốn rút)
  v_amount := ABS(v_amount);

  IF p_status = 'COMPLETED' THEN
    -- Hợp lệ hóa việc chi tiền: Trừ khỏi quỹ tạm giữ (pending)
    -- Tiền Available KHÔNG trừ nữa vì đã trừ lúc User tạo Request.
    UPDATE public.wallet_summary
    SET 
      pending_clearance = GREATEST(pending_clearance - v_amount, 0),
      updated_at = now()
    WHERE uid = v_uid;

  ELSIF p_status = 'REJECTED' THEN
    -- Từ chối: Hoàn tiền từ quỹ tạm giữ về quỹ khả dụng cho User
    UPDATE public.wallet_summary
    SET 
      pending_clearance = GREATEST(pending_clearance - v_amount, 0),
      available_balance = available_balance + v_amount,
      updated_at = now()
    WHERE uid = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transaction ' || p_status,
    'txn_id', p_txn_id
  );
END;$$;


ALTER FUNCTION "public"."admin_process_withdrawal"("p_txn_id" "uuid", "p_status" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_revenue_split_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_percentage numeric;
BEGIN
    -- Tính tổng % của tất cả collab trên RELEASE này
    SELECT COALESCE(SUM(percentage), 0)
    INTO total_percentage
    FROM revenue_splits
    WHERE release_id = NEW.release_id -- [ĐÃ SỬA] track_id -> release_id
    AND id IS DISTINCT FROM NEW.id; 

    IF (total_percentage + NEW.percentage) > 100 THEN
        RAISE EXCEPTION 'Total revenue split cannot exceed 100%%';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_revenue_split_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_by_platform"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("name" "text", "value" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    platform as name,
    SUM(count)::bigint as value -- Lấy tổng số lượng Stream
  FROM public.analytics_daily
  WHERE uid = auth.uid()
    AND date >= p_start_date
    AND date <= p_end_date
    AND type = 'STREAM'
  GROUP BY platform
  ORDER BY value DESC;
END;
$$;


ALTER FUNCTION "public"."get_analytics_by_platform"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_daily_trend"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("day" "text", "streams" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date, 'YYYY-MM-DD') as day, -- Trả về định dạng chuẩn để Frontend dễ format
    SUM(count)::bigint as streams
  FROM public.analytics_daily
  WHERE uid = auth.uid()
    AND date >= p_start_date
    AND date <= p_end_date
    AND type = 'STREAM'
  GROUP BY date
  ORDER BY date ASC;
END;
$$;


ALTER FUNCTION "public"."get_analytics_daily_trend"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  curr_uid UUID;
  
  -- Biến tính Doanh thu (Revenue)
  total_revenue NUMERIC := 0;
  this_month_rev NUMERIC := 0;
  last_month_rev NUMERIC := 0;
  rev_change NUMERIC := 0;
  
  -- Biến tính Streams
  total_streams BIGINT := 0;
  curr_streams INT := 0;
  prev_streams INT := 0;
  streams_change NUMERIC := 0;
  
  -- Biến tính Listeners (Ước lượng)
  curr_listeners INT := 0;
  prev_listeners INT := 0;
  listeners_change NUMERIC := 0;
  
  -- Biến tính Releases
  active_rel_count INT := 0;
  
BEGIN
  -- Lấy ID của user đang đăng nhập
  curr_uid := auth.uid();
  
  -- ==========================================
  -- 1. TÍNH DOANH THU (Từ bảng transactions)
  -- ==========================================
  -- Tổng doanh thu trọn đời (chỉ tính ROYALTY)
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM public.transactions
  WHERE uid = curr_uid AND type = 'ROYALTY';
  
  -- Doanh thu tháng này
  SELECT COALESCE(SUM(amount), 0) INTO this_month_rev
  FROM public.transactions
  WHERE uid = curr_uid AND type = 'ROYALTY'
  AND date_trunc('month', date) = date_trunc('month', now());
  
  -- Doanh thu tháng trước
  SELECT COALESCE(SUM(amount), 0) INTO last_month_rev
  FROM public.transactions
  WHERE uid = curr_uid AND type = 'ROYALTY'
  AND date_trunc('month', date) = date_trunc('month', now() - interval '1 month');
  
  -- Tính % thay đổi
  IF last_month_rev > 0 THEN
    rev_change := ((this_month_rev - last_month_rev) / last_month_rev) * 100;
  ELSE
    rev_change := 0;
  END IF;

  -- ==========================================
  -- 2. TÍNH STREAMS (Từ bảng analytics_monthly)
  -- ==========================================
  -- Tổng streams trọn đời
  SELECT COALESCE(SUM(streams), 0) INTO total_streams
  FROM public.analytics_monthly
  WHERE uid = curr_uid;
  
  -- Lấy streams tháng gần nhất (Sắp xếp theo ID giảm dần)
  SELECT COALESCE(streams, 0) INTO curr_streams
  FROM public.analytics_monthly
  WHERE uid = curr_uid
  ORDER BY id DESC LIMIT 1;
  
  -- Lấy streams tháng liền kề trước đó
  SELECT COALESCE(streams, 0) INTO prev_streams
  FROM public.analytics_monthly
  WHERE uid = curr_uid
  ORDER BY id DESC LIMIT 1 OFFSET 1;
  
  -- Tính % thay đổi streams
  IF prev_streams > 0 THEN
    streams_change := ((curr_streams::NUMERIC - prev_streams::NUMERIC) / prev_streams::NUMERIC) * 100;
  ELSE
    streams_change := 0;
  END IF;
  
  -- ==========================================
  -- 3. TÍNH LISTENERS (Ước lượng 60% của Streams)
  -- ==========================================
  curr_listeners := FLOOR(curr_streams * 0.6);
  prev_listeners := FLOOR(prev_streams * 0.6);
  
  IF prev_listeners > 0 THEN
    listeners_change := ((curr_listeners::NUMERIC - prev_listeners::NUMERIC) / prev_listeners::NUMERIC) * 100;
  ELSE
    listeners_change := 0;
  END IF;

  -- ==========================================
  -- 4. TÍNH ACTIVE RELEASES
  -- ==========================================
  SELECT COUNT(*) INTO active_rel_count
  FROM public.releases
  WHERE uid = curr_uid
  AND status IN ('ACCEPTED', 'DELIVERED', 'CHECKING');

  -- ==========================================
  -- 5. TRẢ VỀ JSON CHO FRONTEND
  -- ==========================================
  RETURN json_build_object(
    'totalStreams', to_char(total_streams, 'FM999,999,999,999'),
    'totalStreamsChange', (CASE WHEN streams_change >= 0 THEN '+' ELSE '' END) || round(streams_change, 1)::text || '%',
    
    'revenue', '$' || to_char(total_revenue, 'FM999,999,999.00'),
    'revenueChange', (CASE WHEN rev_change >= 0 THEN '+' ELSE '' END) || round(rev_change, 1)::text || '%',
    
    'activeReleases', active_rel_count::text,
    
    'monthlyListeners', to_char(curr_listeners, 'FM999,999,999'),
    'monthlyListenersChange', (CASE WHEN listeners_change >= 0 THEN '+' ELSE '' END) || round(listeners_change, 1)::text || '%'
  );
END;
$_$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_overview_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total_streams bigint;
  v_total_revenue numeric;
  v_active_releases int;
  v_listeners bigint;
BEGIN
  -- Tính tổng streams trọn đời
  SELECT COALESCE(SUM(count), 0) INTO v_total_streams 
  FROM public.analytics_daily 
  WHERE uid = auth.uid() AND type = 'STREAM';

  -- Lấy tổng doanh thu trọn đời từ ví
  SELECT COALESCE(lifetime_earnings, 0) INTO v_total_revenue 
  FROM public.wallet_summary 
  WHERE uid = auth.uid();

  -- Đếm số bản phát hành đang hoạt động
  SELECT COUNT(*) INTO v_active_releases 
  FROM public.releases 
  WHERE uid = auth.uid() AND status = 'ACCEPTED';

  -- Ước lượng listeners (Giả sử = 40% streams nếu không có data thật)
  v_listeners := floor(v_total_streams * 0.4);

  RETURN json_build_object(
    'totalStreams', v_total_streams,
    'revenue', v_total_revenue,
    'activeReleases', v_active_releases,
    'monthlyListeners', v_listeners
  );
END;
$$;


ALTER FUNCTION "public"."get_user_overview_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_stream_chart"("p_months" integer DEFAULT 12) RETURNS TABLE("name" "text", "streams" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date_trunc('month', date), 'Mon') as name, -- Trả về 'Jan', 'Feb'...
    COALESCE(SUM(count), 0)::bigint as streams
  FROM public.analytics_daily
  WHERE uid = auth.uid()
    AND date >= date_trunc('month', now()) - (p_months || ' months')::interval
    AND type = 'STREAM' -- Chỉ lấy Stream, không lấy Video View
  GROUP BY date_trunc('month', date)
  ORDER BY date_trunc('month', date);
END;
$$;


ALTER FUNCTION "public"."get_user_stream_chart"("p_months" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_release"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.releases (id) values (new.uid);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_release"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  
  INSERT INTO public.wallet_summary (uid)
  VALUES (new.id);
  
  RETURN new;
END;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_monthly_rewards"("target_month" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rec RECORD;
  processed_count INT := 0;
BEGIN
  -- Duyệt qua tất cả user có doanh thu trong tháng đó mà CHƯA được confirm
  FOR rec IN 
      SELECT user_id, SUM(revenue) as total_rev
      FROM public.analytics_detailed
      WHERE reporting_month = target_month 
        AND is_confirmed = false
      GROUP BY user_id
  LOOP
      -- 1. Tạo Transaction (Lịch sử biến động số dư)
      INSERT INTO public.transactions (uid, amount, type, status, date)
      VALUES (rec.user_id, rec.total_rev, 'ROYALTY', 'COMPLETED', now());

      -- 2. Cộng tiền vào Ví (Wallet Summary)
      -- Dùng ON CONFLICT để đảm bảo nếu chưa có ví thì tạo mới, có rồi thì update
      INSERT INTO public.wallet_summary (uid, available_balance, lifetime_earnings)
      VALUES (rec.user_id, rec.total_rev, rec.total_rev)
      ON CONFLICT (uid) DO UPDATE 
      SET available_balance = wallet_summary.available_balance + EXCLUDED.available_balance,
          lifetime_earnings = wallet_summary.lifetime_earnings + EXCLUDED.lifetime_earnings,
          updated_at = now();

      -- 3. Đánh dấu đã xử lý xong trong Analytics
      UPDATE public.analytics_detailed
      SET is_confirmed = true
      WHERE user_id = rec.user_id AND reporting_month = target_month;

      processed_count := processed_count + 1;
  END LOOP;

  RETURN json_build_object(
    'status', 'success',
    'processed_users', processed_count,
    'month', target_month
  );
END;
$$;


ALTER FUNCTION "public"."process_monthly_rewards"("target_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_payout"("amount" numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  curr_uid UUID;
  curr_balance NUMERIC;
BEGIN
  curr_uid := auth.uid();
  
  -- 1. Lấy số dư hiện tại
  SELECT available_balance INTO curr_balance
  FROM public.wallet_summary
  WHERE uid = curr_uid;

  -- 2. Kiểm tra điều kiện
  IF curr_balance IS NULL OR curr_balance < amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  IF amount < 50 THEN -- Ví dụ: Min withdraw $50
    RAISE EXCEPTION 'Minimum withdrawal amount is $50';
  END IF;

  -- 3. Trừ tiền trong ví
  UPDATE public.wallet_summary
  SET available_balance = available_balance - amount,
      pending_clearance = pending_clearance + amount -- Chuyển sang trạng thái chờ xử lý
  WHERE uid = curr_uid;

  -- 4. Tạo Transaction log
  INSERT INTO public.transactions (uid, amount, type, status, date)
  VALUES (curr_uid, -amount, 'WITHDRAWAL', 'PENDING', now());

  RETURN json_build_object('success', true, 'new_balance', curr_balance - amount);
END;
$_$;


ALTER FUNCTION "public"."request_payout"("amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_secure_payout_method"("p_type" "text", "p_name" "text", "p_details" "text", "p_account_holder" "text" DEFAULT NULL::"text", "p_bank_name" "text" DEFAULT NULL::"text", "p_swift_code" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- REPLACE THIS WITH A LONG RANDOM STRING
    -- In production, fetch this from vault.secrets
    v_secret_key text := 'YOUR_SUPER_SECRET_ENCRYPTION_KEY_2025'; 
BEGIN
    INSERT INTO public.payout_methods (
        uid, type, name, details, account_holder, bank_name, swift_code
    ) VALUES (
        auth.uid(),
        p_type,
        p_name,
        -- Encrypt the details
        pgp_sym_encrypt(p_details, v_secret_key)::text, 
        p_account_holder,
        p_bank_name,
        p_swift_code
    );

    RETURN json_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."save_secure_payout_method"("p_type" "text", "p_name" "text", "p_details" "text", "p_account_holder" "text", "p_bank_name" "text", "p_swift_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_request_withdrawal"("p_amount" numeric, "p_method_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid := auth.uid(); -- Lấy UID trực tiếp từ session bảo mật của Supabase
  v_current_balance numeric;
BEGIN
  -- 1. Kiểm tra số dư khả dụng
  SELECT available_balance INTO v_current_balance 
  FROM public.wallet_summary WHERE uid = v_uid FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds.';
  END IF;

  -- 2. Tạo Transaction PENDING
  INSERT INTO public.transactions (uid, amount, type, status, date, note)
  VALUES (v_uid, p_amount, 'WITHDRAWAL', 'PENDING', now(), 'Via method: ' || p_method_id);

  -- 3. Cập nhật ví ngay lập tức (Chuyển tiền sang khu vực tạm giữ)
  UPDATE public.wallet_summary
  SET 
    available_balance = available_balance - p_amount,
    pending_clearance = pending_clearance + p_amount,
    updated_at = now()
  WHERE uid = v_uid;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."user_request_withdrawal"("p_amount" numeric, "p_method_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."action_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "details" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."action_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_daily" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "track_id" bigint,
    "uid" "uuid",
    "platform" "text" DEFAULT 'ALL'::"text",
    "country_code" "text" DEFAULT 'GLOBAL'::"text",
    "count" integer DEFAULT 0,
    "type" "public"."metric_type" DEFAULT 'STREAM'::"public"."metric_type",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_daily" OWNER TO "postgres";


ALTER TABLE "public"."analytics_daily" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."analytics_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analytics_detailed" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "track_id" bigint,
    "platform" "text" NOT NULL,
    "country_code" "text" DEFAULT 'GLOBAL'::"text",
    "reporting_month" "date" NOT NULL,
    "streams" integer DEFAULT 0,
    "revenue" numeric(10,6) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_detailed" OWNER TO "postgres";


ALTER TABLE "public"."analytics_detailed" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."analytics_detailed_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analytics_monthly" (
    "id" bigint NOT NULL,
    "month" "text" NOT NULL,
    "name" "text",
    "streams" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."analytics_monthly" OWNER TO "postgres";


ALTER TABLE "public"."analytics_monthly" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."analytics_monthly_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."artists" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "legal_name" "text",
    "email" "text",
    "avatar" "text",
    "spotify_id" "text",
    "apple_music_id" "text",
    "soundcloud_id" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."artists" OWNER TO "postgres";


ALTER TABLE "public"."artists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."artists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."brand_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "app_name" "text" DEFAULT 'Aurora Music Vietnam'::"text",
    "logo_url" "text" DEFAULT 'https://auroramusicvietnam.net/amvn.png'::"text",
    "favicon_url" "text",
    "support_email" "text" DEFAULT 'support@auroramusicvietnam.net'::"text",
    "primary_color" "text" DEFAULT '#2563eb'::"text",
    "secondary_color" "text" DEFAULT '#9333ea'::"text",
    "bg_color" "text" DEFAULT '#000000'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "single_row_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."brand_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dsp_channels" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "logo_url" "text",
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dsp_channels" OWNER TO "postgres";


ALTER TABLE "public"."dsp_channels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dsp_channels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."labels" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."labels" OWNER TO "postgres";


ALTER TABLE "public"."labels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."labels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payout_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "details" "text",
    "account_holder" "text",
    "bank_name" "text",
    "routing_number" "text",
    "account_number" "text",
    "swift_code" "text",
    "paypal_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."payout_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "legal_name" "text",
    "role" "text" DEFAULT 'USER'::"text",
    "avatar" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'ACTIVE'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['USER'::"text", 'ADMIN'::"text", 'MODERATOR'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raw_analytics" (
    "date" "date" NOT NULL,
    "service" "text" NOT NULL,
    "isrc" "text" NOT NULL,
    "country" "text" NOT NULL,
    "count" numeric,
    "upc" "text" NOT NULL
);


ALTER TABLE "public"."raw_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."raw_analytics" IS 'The State 51 RAW Analytics';



COMMENT ON COLUMN "public"."raw_analytics"."service" IS 'Music Service - Details';



COMMENT ON COLUMN "public"."raw_analytics"."country" IS 'Country of Sale';



COMMENT ON COLUMN "public"."raw_analytics"."count" IS 'Total Units';



CREATE TABLE IF NOT EXISTS "public"."releases" (
    "id" bigint NOT NULL,
    "upc" "text",
    "title" "text" NOT NULL,
    "version" "text",
    "label_id" bigint,
    "status" "text" DEFAULT 'DRAFT'::"text",
    "release_date" "date",
    "original_release_date" "date",
    "cover_art" "text",
    "copyright_year" "text",
    "copyright_line" "text",
    "phonogram_year" "text",
    "phonogram_line" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid",
    "selected_dsps" "jsonb" DEFAULT '[]'::"jsonb",
    "genre" "text",
    "sub_genre" "text",
    "language" "text",
    "format" "text" DEFAULT 'SINGLE'::"text",
    "territories" "text"[] DEFAULT '{WORLDWIDE}'::"text"[],
    "rejection_reason" "text"
);


ALTER TABLE "public"."releases" OWNER TO "postgres";


ALTER TABLE "public"."releases" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."releases_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."revenue_splits" (
    "id" bigint NOT NULL,
    "release_id" bigint,
    "recipient_uid" "uuid",
    "percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revenue_splits_percentage_check" CHECK ((("percentage" > (0)::numeric) AND ("percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."revenue_splits" OWNER TO "postgres";


ALTER TABLE "public"."revenue_splits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."revenue_splits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text",
    "priority" "text" DEFAULT 'MEDIUM'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "sender_id" "uuid",
    "sender_name" "text",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid"
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."track_artists" (
    "id" bigint NOT NULL,
    "track_id" bigint,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'Primary'::"text",
    "spotify_id" "text",
    "apple_music_id" "text"
);


ALTER TABLE "public"."track_artists" OWNER TO "postgres";


ALTER TABLE "public"."track_artists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."track_artists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."track_contributors" (
    "id" bigint NOT NULL,
    "track_id" bigint,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "instrument" "text"
);


ALTER TABLE "public"."track_contributors" OWNER TO "postgres";


ALTER TABLE "public"."track_contributors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."track_contributors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" bigint NOT NULL,
    "release_id" bigint,
    "isrc" "text",
    "name" "text" NOT NULL,
    "version" "text",
    "duration" "text",
    "status" "text" DEFAULT 'READY'::"text",
    "audio_url" "text",
    "filename" "text",
    "has_lyrics" boolean DEFAULT false,
    "lyrics_language" "text",
    "lyrics_text" "text",
    "is_explicit" boolean DEFAULT false,
    "has_explicit_version" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid",
    "tiktok_clip_start_time" "text",
    "artists" "jsonb" DEFAULT '[]'::"jsonb",
    "contributors" "jsonb"
);


ALTER TABLE "public"."tracks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tracks"."tiktok_clip_start_time" IS 'Start time for TikTok viral clip (mm:ss)';



ALTER TABLE "public"."tracks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tracks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone DEFAULT "now"(),
    "amount" numeric(10,2) NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "uid" "uuid",
    "note" "text",
    "updated_at" "date"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_summary" (
    "id" bigint NOT NULL,
    "available_balance" numeric(10,2) DEFAULT 0.00,
    "pending_clearance" numeric(10,2) DEFAULT 0.00,
    "lifetime_earnings" numeric(10,2) DEFAULT 0.00,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uid" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."wallet_summary" OWNER TO "postgres";


ALTER TABLE "public"."wallet_summary" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wallet_summary_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."action_logs"
    ADD CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_daily"
    ADD CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_detailed"
    ADD CONSTRAINT "analytics_detailed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_monthly"
    ADD CONSTRAINT "analytics_monthly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dsp_channels"
    ADD CONSTRAINT "dsp_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labels"
    ADD CONSTRAINT "labels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_methods"
    ADD CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raw_analytics"
    ADD CONSTRAINT "raw_analytics_pkey" PRIMARY KEY ("date");



ALTER TABLE ONLY "public"."releases"
    ADD CONSTRAINT "releases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_splits"
    ADD CONSTRAINT "revenue_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_splits"
    ADD CONSTRAINT "revenue_splits_release_id_recipient_uid_key" UNIQUE ("release_id", "recipient_uid");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."track_artists"
    ADD CONSTRAINT "track_artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."track_contributors"
    ADD CONSTRAINT "track_contributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_summary"
    ADD CONSTRAINT "wallet_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_summary"
    ADD CONSTRAINT "wallet_summary_uid_key" UNIQUE ("uid");



CREATE INDEX "idx_analytics_date_uid" ON "public"."analytics_daily" USING "btree" ("date", "uid");



CREATE INDEX "idx_analytics_platform" ON "public"."analytics_detailed" USING "btree" ("platform");



CREATE INDEX "idx_analytics_track_id" ON "public"."analytics_daily" USING "btree" ("track_id");



CREATE INDEX "idx_analytics_uid_month" ON "public"."analytics_detailed" USING "btree" ("user_id", "reporting_month");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "ensure_revenue_split_total" BEFORE INSERT OR UPDATE ON "public"."revenue_splits" FOR EACH ROW EXECUTE FUNCTION "public"."check_revenue_split_total"();



ALTER TABLE ONLY "public"."analytics_daily"
    ADD CONSTRAINT "analytics_daily_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_daily"
    ADD CONSTRAINT "analytics_daily_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_detailed"
    ADD CONSTRAINT "analytics_detailed_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_detailed"
    ADD CONSTRAINT "analytics_detailed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."releases"
    ADD CONSTRAINT "releases_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."releases"
    ADD CONSTRAINT "releases_uid_fkey_profiles" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revenue_splits"
    ADD CONSTRAINT "revenue_splits_recipient_uid_fkey" FOREIGN KEY ("recipient_uid") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_splits"
    ADD CONSTRAINT "revenue_splits_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_uid_fkey_profiles" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_sender_fkey_profiles" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_artists"
    ADD CONSTRAINT "track_artists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_contributors"
    ADD CONSTRAINT "track_contributors_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_uid_fkey_profiles" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_summary"
    ADD CONSTRAINT "wallet_summary_uid_fkey_profiles" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin update access" ON "public"."brand_settings" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can do everything on artists" ON "public"."artists" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can do everything on labels" ON "public"."labels" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can do everything on profiles" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can do everything on releases" ON "public"."releases" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can do everything on tracks" ON "public"."tracks" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage DSPs" ON "public"."dsp_channels" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage ticket messages" ON "public"."ticket_messages" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage tickets" ON "public"."support_tickets" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage transactions" ON "public"."transactions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view all wallets" ON "public"."wallet_summary" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view payout methods" ON "public"."payout_methods" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins full access analytics" ON "public"."analytics_daily" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins manage splits" ON "public"."revenue_splits" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow all inserting" ON "public"."action_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow user insert" ON "public"."labels" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Allow user to select" ON "public"."labels" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Allow user to update label info" ON "public"."labels" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Enable insert access for authenticated users" ON "public"."tracks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."dsp_channels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tracks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "uid"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."tracks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "uid"));



CREATE POLICY "Public read access" ON "public"."brand_settings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Recipients can view their splits" ON "public"."revenue_splits" FOR SELECT TO "authenticated" USING (("recipient_uid" = "auth"."uid"()));



CREATE POLICY "Release owner can manage splits" ON "public"."revenue_splits" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."releases"
  WHERE (("releases"."id" = "revenue_splits"."release_id") AND ("releases"."uid" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."releases"
  WHERE (("releases"."id" = "revenue_splits"."release_id") AND ("releases"."uid" = "auth"."uid"())))));



CREATE POLICY "User can add" ON "public"."payout_methods" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User can add" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User can add msg" ON "public"."ticket_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User can delete" ON "public"."payout_methods" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "User can do all" ON "public"."tracks" TO "authenticated" USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User can insert" ON "public"."artists" FOR INSERT WITH CHECK (true);



CREATE POLICY "User can see" ON "public"."payout_methods" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "User can see" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "User can select" ON "public"."artists" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "User can update" ON "public"."artists" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User can update" ON "public"."payout_methods" FOR UPDATE USING (("auth"."uid"() = "uid"));



CREATE POLICY "User can update tracks" ON "public"."tracks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "uid")) WITH CHECK (true);



CREATE POLICY "User insert tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "User see msg" ON "public"."ticket_messages" FOR SELECT USING (true);



CREATE POLICY "User see tickets" ON "public"."support_tickets" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "User view own analytics" ON "public"."analytics_detailed" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own data" ON "public"."artists" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can delete own data" ON "public"."labels" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can delete own data" ON "public"."releases" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can insert own data" ON "public"."artists" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Users can insert own data" ON "public"."labels" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Users can insert own data" ON "public"."releases" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "Users can update own data" ON "public"."artists" FOR UPDATE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can update own data" ON "public"."labels" FOR UPDATE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can update own data" ON "public"."releases" FOR UPDATE USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own data" ON "public"."artists" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can view own data" ON "public"."labels" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can view own data" ON "public"."releases" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own wallet" ON "public"."wallet_summary" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Users view own analytics" ON "public"."analytics_daily" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "uid"));



ALTER TABLE "public"."action_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_detailed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_monthly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dsp_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payout_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raw_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."releases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenue_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."track_artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."track_contributors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_summary" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."admin_distribute_revenue_bulk"("p_items" "jsonb", "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_distribute_revenue_bulk"("p_items" "jsonb", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_distribute_revenue_bulk"("p_items" "jsonb", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_decrypted_payouts"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_decrypted_payouts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_decrypted_payouts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_process_withdrawal"("p_txn_id" "uuid", "p_status" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_process_withdrawal"("p_txn_id" "uuid", "p_status" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_process_withdrawal"("p_txn_id" "uuid", "p_status" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_revenue_split_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_revenue_split_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_revenue_split_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_by_platform"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_by_platform"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_by_platform"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_daily_trend"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_daily_trend"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_daily_trend"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_overview_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_overview_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_overview_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stream_chart"("p_months" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stream_chart"("p_months" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stream_chart"("p_months" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_release"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_release"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_release"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_monthly_rewards"("target_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."process_monthly_rewards"("target_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_monthly_rewards"("target_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_payout"("amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."request_payout"("amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_payout"("amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_secure_payout_method"("p_type" "text", "p_name" "text", "p_details" "text", "p_account_holder" "text", "p_bank_name" "text", "p_swift_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_secure_payout_method"("p_type" "text", "p_name" "text", "p_details" "text", "p_account_holder" "text", "p_bank_name" "text", "p_swift_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_secure_payout_method"("p_type" "text", "p_name" "text", "p_details" "text", "p_account_holder" "text", "p_bank_name" "text", "p_swift_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_request_withdrawal"("p_amount" numeric, "p_method_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_request_withdrawal"("p_amount" numeric, "p_method_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_request_withdrawal"("p_amount" numeric, "p_method_id" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."action_logs" TO "anon";
GRANT ALL ON TABLE "public"."action_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."action_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_daily" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_detailed" TO "anon";
GRANT ALL ON TABLE "public"."analytics_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_detailed" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_detailed_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_detailed_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_detailed_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_monthly" TO "anon";
GRANT ALL ON TABLE "public"."analytics_monthly" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_monthly" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_monthly_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_monthly_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_monthly_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";
GRANT ALL ON TABLE "public"."artists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."artists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."artists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."artists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."brand_settings" TO "anon";
GRANT ALL ON TABLE "public"."brand_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_settings" TO "service_role";



GRANT ALL ON TABLE "public"."dsp_channels" TO "anon";
GRANT ALL ON TABLE "public"."dsp_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."dsp_channels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dsp_channels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dsp_channels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dsp_channels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."labels" TO "anon";
GRANT ALL ON TABLE "public"."labels" TO "authenticated";
GRANT ALL ON TABLE "public"."labels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."labels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payout_methods" TO "anon";
GRANT ALL ON TABLE "public"."payout_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_methods" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."raw_analytics" TO "anon";
GRANT ALL ON TABLE "public"."raw_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."releases" TO "anon";
GRANT ALL ON TABLE "public"."releases" TO "authenticated";
GRANT ALL ON TABLE "public"."releases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."releases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."releases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."releases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_splits" TO "anon";
GRANT ALL ON TABLE "public"."revenue_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_splits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."revenue_splits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."revenue_splits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."revenue_splits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."track_artists" TO "anon";
GRANT ALL ON TABLE "public"."track_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."track_artists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."track_artists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."track_artists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."track_artists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."track_contributors" TO "anon";
GRANT ALL ON TABLE "public"."track_contributors" TO "authenticated";
GRANT ALL ON TABLE "public"."track_contributors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."track_contributors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."track_contributors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."track_contributors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tracks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tracks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tracks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_summary" TO "anon";
GRANT ALL ON TABLE "public"."wallet_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_summary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wallet_summary_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallet_summary_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallet_summary_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































