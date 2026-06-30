// =============================================
// lib/supabase.js
// Supabase（データベース）に接続するための「電話線」を1本だけ作る
// =============================================

import { createClient } from "@supabase/supabase-js";

// .env.local（秘密の金庫）から接続情報を取り出す
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 接続情報が入っているかどうか（未設定なら画面で案内を出すため）
export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

// supabase という名前の「接続ずみの電話機」を作って、外に貸し出す
export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
