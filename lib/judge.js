// =============================================
// lib/judge.js
// 提案可否を判定する「頭脳」だけのファイル
// 画面にもDBにも依存しないので、どこからでも使い回せる
// =============================================

// 電話番号そうじマシン： "03-1234-5678" → "0312345678"
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";
  return phoneNumber.replace(/[-\s　]/g, "");
}

// 社名そうじマシン： "株式会社TELEMO" → "telemo"
export function normalizeCompanyName(companyName) {
  if (!companyName) return "";
  return companyName
    .replace("株式会社", "")
    .replace("（株）", "")
    .replace("(株)", "")
    .replace("有限会社", "")
    .trim()
    .toLowerCase();
}

// 日数カウントマシン： 商談日が「今日から30日以内」なら true
export function isWithin30Days(meetingDate) {
  const today = new Date();
  const meeting = new Date(meetingDate);
  const diffTime = today - meeting;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
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

  // ルール2：制作中 or 納品 → NG（商談日が古くても優先）
  if (company.delivery_flag === "制作中" || company.delivery_flag === "納品") {
    return {
      result: "NG",
      message: "この企業はすでに制作中または納品済みです。",
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
