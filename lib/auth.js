// =============================================
// lib/auth.js
// ログイン状態を Supabase Auth（本物の認証）で扱う。
// パスワードやセッションの安全管理は Supabase が担当するので、
// 自前で localStorage にユーザーを保存したりしない。
// =============================================

import { supabase } from "./supabase";

// いまログインしているユーザー（id, email, 名前, 権限）を返す。いなければ null。
// Supabase が持つセッションを確認し、agencies から名前と権限を補う。
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from("agencies")
    .select("name, role")
    .eq("id", session.user.id)
    .single();
  if (!data) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: data.name,
    role: data.role,
  };
}

// ログアウト（Supabaseのセッションを破棄する）
export async function logout() {
  await supabase.auth.signOut();
}
