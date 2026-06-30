// =============================================
// lib/supabaseAdmin.js
// サーバー専用の「管理者権限の接続部品」。
// 秘密の鍵(SUPABASE_SERVICE_ROLE_KEY)を使うので、
// 絶対に "use client" のファイルから import しないこと。
// （API Route などサーバー側コードだけで使う）
// =============================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 管理者鍵で接続。RLS（行レベルの鍵）を飛び越えて全データを扱える。
// だからこそサーバー内だけで使い、結果は必要最小限だけブラウザに返す。
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
