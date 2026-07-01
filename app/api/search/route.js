// =============================================
// app/api/search/route.js
// 営業前チェックの検索をサーバー側で行うAPI。
// ・全企業を調べて重複を判定（管理者鍵を使うのでRLSに関係なく全件見られる）
// ・でもブラウザには「判定結果＋最小限の情報」だけ返す
//   → 代理店は他社の生データを受け取れない（技術的に取れない）
// =============================================

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthedUser } from "@/lib/apiAuth";
import {
  normalizeCompanyName,
  normalizePhoneNumber,
  judgeCompanies,
} from "@/lib/judge";

export async function POST(request) {
  // 1) ログイン済みの本人か確認
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { companyName, phoneNumber, representativeName, address } =
    await request.json();

  // 2項目以上の入力を必須にする（重複判定の精度確保）
  const filledCount = [companyName, phoneNumber, representativeName, address]
    .filter((v) => v && String(v).trim())
    .length;
  if (filledCount < 2) {
    return NextResponse.json(
      { error: "2項目以上を入力してください" },
      { status: 400 }
    );
  }

  // 2) 検索条件を組み立てる（電話・社名はそうじ版で一致、代表者・住所は部分一致）
  const normName = normalizeCompanyName(companyName || "");
  const normPhone = normalizePhoneNumber(phoneNumber || "");
  const safe = (v) => v.replace(/,/g, " ");
  const conditions = [];
  if (normPhone) conditions.push(`normalized_phone_number.eq.${normPhone}`);
  if (normName) conditions.push(`normalized_company_name.eq.${normName}`);
  if (representativeName)
    conditions.push(`representative_name.ilike.%${safe(representativeName)}%`);
  if (address) conditions.push(`address.ilike.%${safe(address)}%`);

  // 3) 管理者鍵で全企業を検索（RLSを越えて全件見る）
  const { data } = await supabaseAdmin
    .from("companies")
    .select("*")
    .or(conditions.join(","))
    .order("meeting_date", { ascending: false });

  // 4) 全ヒットをまとめて判定（一番厳しい結果を採用）
  const { judgement, company } = judgeCompanies(data || []);

  // 5) 検索履歴を残す（誰が・何を・どう判定されたか）
  await supabaseAdmin.from("search_logs").insert({
    agency_id: user.id,
    search_company_name: companyName || null,
    search_phone_number: phoneNumber || null,
    search_address: address || null,
    result: judgement.result,
  });

  // 6) ブラウザには「判定結果＋最小限の情報」だけ返す（他社の生データは渡さない）
  const minimal =
    company && judgement.result !== "OK"
      ? {
          company_name: company.company_name,
          meeting_date: company.meeting_date,
          current_status: company.current_status,
          delivery_flag: company.delivery_flag,
        }
      : null;

  return NextResponse.json({
    result: judgement.result,
    message: judgement.message,
    company: minimal,
  });
}
