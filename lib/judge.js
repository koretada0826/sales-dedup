// =============================================
// lib/judge.js
// 提案可否を判定する「頭脳」だけのファイル
// 画面にもDBにも依存しないので、どこからでも使い回せる
// =============================================

// 電話番号そうじマシン： "(03)1234-5678" や "０３-…" → "0312345678"
// 方針：全角数字を半角に直してから、数字以外（ハイフン・括弧・空白・ドット等）を全部消す
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";
  const halfWidth = phoneNumber.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  return halfWidth.replace(/[^0-9]/g, "");
}

// 社名そうじマシン： "株式会社TELEMO" → "telemo"
// 方針：会社の種類を表す言葉（株式会社・㈱など）と空白を消し、小文字にそろえる
//   /.../g の g は「全部」の意味。先頭の1回だけでなく、出てきた分すべて消す。
export function normalizeCompanyName(companyName) {
  if (!companyName) return "";
  return companyName
    .replace(/株式会社|（株）|\(株\)|㈱|有限会社|（有）|\(有\)|㈲|合同会社|（同）|\(同\)/g, "")
    .replace(/[\s　]/g, "")
    .toLowerCase();
}

// 日数カウントマシン： 商談日が「今日から30日以内」なら true（ちょうど30日も含む）
// 方針：時刻のズレで判定がブレないよう、両方を「日付だけ（時刻を切り捨て）」にして比べる
export function isWithin30Days(meetingDate) {
  const today = new Date();
  const meeting = new Date(meetingDate);
  // 年月日だけを取り出して比較用の数値にする（時・分・秒は無視）
  const toDayNumber = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = (toDayNumber(today) - toDayNumber(meeting)) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

// 信号機マシン（このシステムの心臓）
// 企業1社の情報を受け取り、OK / NG / 運営確認 を返す
export function judgeProposalAvailability(company) {
  // ルール1：登録がない → OK
  if (!company) {
    return {
      result: "OK",
      message: "この企業は登録されていません。提案可能です。",
    };
  }

  // ルール2：導入プロジェクトが進行中 → NG（商談日が古くても優先）
  //   ・ステータスが「商談」より先（システム商談以降）に進んでいる、または
  //   ・納品フラグが「制作中」「納品」になっている
  // のどちらかなら、すでに動いている案件なので提案不可。
  const progressedStatuses = ["システム商談", "トークツリー商談", "テスト", "納品"];
  const isProgressedStatus = progressedStatuses.includes(company.current_status);
  const isInProduction =
    company.delivery_flag === "制作中" || company.delivery_flag === "納品";

  if (isProgressedStatus || isInProduction) {
    return {
      result: "NG",
      message: "この企業はすでに導入プロジェクトが進行中（または納品済み）です。",
    };
  }

  // ルール3：商談日が30日以内 → NG
  if (isWithin30Days(company.meeting_date)) {
    return {
      result: "NG",
      message: "商談日から30日以内のため、他販売代理店が営業権を保有しています。",
    };
  }

  // ルール4：それ以外（30日以上経過）→ 運営確認
  return {
    result: "運営確認",
    message: "商談日から30日以上経過しています。運営へお問い合わせください。",
  };
}

// 判定の「厳しさ」の順位。数字が大きいほど厳しい。
const RESULT_SEVERITY = { NG: 3, 運営確認: 2, OK: 1 };

// 複数ヒットした企業をまとめて判定し、「一番厳しい結果」を返す。
// 重複防止が目的なので、1件でもNGがあればNG、無ければ運営確認、それも無ければOK。
// 戻り値： { judgement, company }（companyは判定の根拠になった1社。該当なしならnull）
export function judgeCompanies(companies) {
  if (!companies || companies.length === 0) {
    return { judgement: judgeProposalAvailability(undefined), company: null };
  }

  let best = null;
  for (const company of companies) {
    const judgement = judgeProposalAvailability(company);
    const isStricter =
      !best || RESULT_SEVERITY[judgement.result] > RESULT_SEVERITY[best.judgement.result];
    if (isStricter) {
      best = { judgement, company };
    }
  }
  return best;
}
