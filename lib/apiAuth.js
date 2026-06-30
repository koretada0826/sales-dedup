// =============================================
// lib/apiAuth.js
// サーバーAPIで「誰が呼んできたか」を安全に確認する部品（サーバー専用）。
// ブラウザから送られてくるアクセストークンを検証して本人を特定する。
// =============================================

import { supabaseAdmin } from "./supabaseAdmin";

// リクエストのトークンを検証し、本人(authユーザー)を返す。無効なら null。
export async function getAuthedUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// そのユーザーが運営本部(admin)かどうか
export async function isAdminUser(userId) {
  const { data } = await supabaseAdmin
    .from("agencies")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}
