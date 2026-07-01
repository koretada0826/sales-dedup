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
  judgeProposalAvailability,
} from "@/lib/judge";

// 判定の厳しさ順（数字が大きいほど厳しい）
const SEVERITY = { NG: 3, 運営確認: 2, OK: 1 };

export async function POST(request) {
  // 1) ログイン済みの本人か確認
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { companyName, phoneNumber, representativeName, address, requireTwo } =
    await request.json();

  // 検索ページからの呼び出し(requireTwo=true)のときだけ「2項目以上」を必須にする
  const filledCount = [companyName, phoneNumber, representativeName, address]
    .filter((v) => v && String(v).trim())
    .length;
  if (requireTwo && filledCount < 2) {
    return NextResponse.json(
      { error: "2項目以上を入力してください" },
      { status: 400 }
    );
  }
  if (filledCount < 1) {
    return NextResponse.json({ error: "検索条件が空です" }, { status: 400 });
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

  // 4) 企業ごとに「何項目一致したか」を数えて判定する
  //   ・1項目だけ一致 → 確信が弱いので「運営確認」に緩和
  //   ・2項目以上一致 → ほぼ同一企業なので通常判定（NGになりうる）
  const contains = (needle, hay) =>
    needle && hay && String(hay).toLowerCase().includes(String(needle).toLowerCase());

  let best = {
    result: "OK",
    message: "この企業は登録されていません。提案可能です。",
    company: null,
  };

  for (const c of data || []) {
    let matchCount = 0;
    if (normPhone && c.normalized_phone_number === normPhone) matchCount++;
    if (normName && c.normalized_company_name === normName) matchCount++;
    if (representativeName && contains(representativeName, c.representative_name)) matchCount++;
    if (address && contains(address, c.address)) matchCount++;
    if (matchCount === 0) continue;

    const base = judgeProposalAvailability(c); // NG か 運営確認
    let result, message;
    if (matchCount >= 2) {
      result = base.result;
      message = base.message;
    } else {
      // 1項目だけの一致
      result = "運営確認";
      message = "1項目のみ一致しました。同一企業かどうか運営にご確認ください。";
    }

    if (SEVERITY[result] > SEVERITY[best.result]) {
      best = { result, message, company: c };
    }
  }

  // 5) 検索履歴を残す（誰が・何を・どう判定されたか）
  await supabaseAdmin.from("search_logs").insert({
    agency_id: user.id,
    search_company_name: companyName || null,
    search_phone_number: phoneNumber || null,
    search_address: address || null,
    result: best.result,
  });

  // 6) ブラウザには「判定結果＋最小限の情報」だけ返す（他社の生データは渡さない）
  const minimal =
    best.company && best.result !== "OK"
      ? {
          company_name: best.company.company_name,
          meeting_date: best.company.meeting_date,
          current_status: best.company.current_status,
          delivery_flag: best.company.delivery_flag,
        }
      : null;

  return NextResponse.json({
    result: best.result,
    message: best.message,
    company: minimal,
  });
}
