// =============================================
// lib/loginId.js
// 「ログインID」と「内部メールアドレス」を変換する部品。
//
// 利用者は "agency01" のようなログインIDで操作する。
// 中身（Supabase Auth）はメールで動くので、内部で
//   agency01  ⇔  agency01@telemo.local
// のように相互変換する。利用者はこのメールを意識しない。
// =============================================

export const LOGIN_EMAIL_DOMAIN = "telemo.local";

// ログインID → 内部メール
export function loginIdToEmail(loginId) {
  return `${loginId.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}

// 内部メール → ログインID（一覧表示などで使う）
export function emailToLoginId(email) {
  return (email || "").replace(`@${LOGIN_EMAIL_DOMAIN}`, "");
}
