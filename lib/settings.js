// =============================================
// lib/settings.js
// 運営が切り替えられる「設定」を読み書きする場所。
// 今は1つだけ：検索結果に担当代理店名を見せるかどうか。
// =============================================

import { supabase } from "./supabase";

// 設定のキー名（app_settings テーブルの key 列の値）
const SHOW_AGENCY_KEY = "show_agency_name_to_agencies";

// 設定を読む（未設定なら false=見せない を初期値にする）
export async function getShowAgencyName() {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SHOW_AGENCY_KEY)
    .single();
  return data?.value ?? false;
}

// 設定を書き換える（行が無ければ作る＝upsert）
export async function setShowAgencyName(value) {
  await supabase
    .from("app_settings")
    .upsert({ key: SHOW_AGENCY_KEY, value });
}
