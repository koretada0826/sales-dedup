// =============================================
// lib/auth.js
// ログイン中のユーザーを「ブラウザのメモ帳(localStorage)」に保存・取得する
//
// ⚠️ これはMVP（最小限）用の簡易ログインです。
//    本番では Supabase Auth を使うべきです（後述の理由）。
// =============================================

const KEY = "telemo_current_user";

// ログインしたユーザーを保存する
export function setCurrentUser(user) {
  if (typeof window === "undefined") return; // サーバー側では何もしない
  localStorage.setItem(KEY, JSON.stringify(user));
}

// いまログインしているユーザーを取り出す（いなければ null）
export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

// ログアウト（メモ帳を消す）
export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
