// =============================================
// scripts/seed.mjs
// デモ用アカウント（Supabase Auth）と企業データを投入する一回限りのスクリプト。
// 実行： node scripts/seed.mjs
// 秘密の鍵を使うので、サーバー（自分のPC）でだけ実行する。
// =============================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local を手で読む（依存を増やさないため）
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ログインID → 内部メール（lib/loginId.js と同じ規則）
const LOGIN_EMAIL_DOMAIN = "telemo.local";
const loginIdToEmail = (loginId) => `${loginId}@${LOGIN_EMAIL_DOMAIN}`;

// 投入したいアカウント（ログインID / パスワード / 名前 / 権限）
const accounts = [
  { loginId: "admin", password: "Admin12345!", name: "運営本部", role: "admin" },
  { loginId: "agency01", password: "Agency12345!", name: "サンプル代理店A", role: "agency" },
];

// 何日前か → YYYY-MM-DD
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function run() {
  // 0) いったんリセット（何度でも実行できるように）
  //    企業 → 既存Authユーザー の順で消す（agencies はユーザー削除でcascade）
  await supabase.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: existing } = await supabase.auth.admin.listUsers();
  for (const u of existing?.users || []) {
    await supabase.auth.admin.deleteUser(u.id);
  }

  const ids = {};

  for (const acc of accounts) {
    const email = loginIdToEmail(acc.loginId);
    // 1) Supabase Auth にユーザーを作る（メール確認済みで作成）
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: acc.password,
      email_confirm: true,
    });
    if (error) {
      console.log(`❌ ${acc.loginId} の作成に失敗: ${error.message}`);
      continue;
    }
    ids[acc.loginId] = data.user.id;

    // 2) agencies に名前と権限を登録（idはAuthユーザーidと一致）
    const { error: aErr } = await supabase
      .from("agencies")
      .insert({ id: data.user.id, name: acc.name, role: acc.role });
    if (aErr) console.log(`❌ agencies登録失敗(${acc.loginId}): ${aErr.message}`);
    else console.log(`✅ アカウント作成: ${acc.loginId}（${acc.role}）`);
  }

  // 3) デモ企業3社（agency01 が登録したことにする）
  const agencyId = ids["agency01"];
  if (agencyId) {
    const companies = [
      { company_name: "株式会社TELEMO", normalized_company_name: "telemo", phone_number: "03-1234-5678", normalized_phone_number: "0312345678", representative_name: "telemo太郎", meeting_date: daysAgo(14), current_status: "商談", delivery_flag: "未着手", agency_id: agencyId },
      { company_name: "サンプル商事", normalized_company_name: "サンプル商事", phone_number: "06-1111-2222", normalized_phone_number: "0611112222", representative_name: "見本花子", meeting_date: daysAgo(170), current_status: "テスト", delivery_flag: "納品", agency_id: agencyId },
      { company_name: "テスト工業", normalized_company_name: "テスト工業", phone_number: "052-333-4444", normalized_phone_number: "0523334444", representative_name: "試験次郎", meeting_date: daysAgo(60), current_status: "商談", delivery_flag: "未着手", agency_id: agencyId },
    ];
    const { error } = await supabase.from("companies").insert(companies);
    if (error) console.log(`❌ 企業投入失敗: ${error.message}`);
    else console.log(`✅ デモ企業 ${companies.length}社 を投入`);
  }

  console.log("\n--- ログイン情報（ログインID / パスワード）---");
  accounts.forEach((a) => console.log(`${a.role.padEnd(6)} : ${a.loginId} / ${a.password}`));
}

run();
