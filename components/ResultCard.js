// 検索結果（OK / NG / 運営確認）を色付きで表示する部品

// 判定結果ごとの見た目を1か所にまとめておく
const STYLES = {
  OK: {
    box: "bg-green-50 border-green-400 text-green-800",
    badge: "bg-green-600",
    title: "提案可（OK）",
  },
  NG: {
    box: "bg-red-50 border-red-400 text-red-800",
    badge: "bg-red-600",
    title: "提案不可（NG）",
  },
  運営確認: {
    box: "bg-yellow-50 border-yellow-400 text-yellow-800",
    badge: "bg-yellow-500",
    title: "運営へお問い合わせください",
  },
};

export default function ResultCard({ judgement, company }) {
  // judgement = { result, message }
  const style = STYLES[judgement.result];

  return (
    <div className={`border-l-4 rounded p-5 ${style.box}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-white text-xs px-2 py-1 rounded ${style.badge}`}>
          {judgement.result}
        </span>
        <span className="font-bold">{style.title}</span>
      </div>

      <p className="mb-3">{judgement.message}</p>

      {/* OK以外（=登録があった）のときだけ、最小限の情報を見せる */}
      {company && judgement.result !== "OK" && (
        <ul className="text-sm space-y-1 border-t pt-3">
          <li>企業名：{company.company_name}</li>
          <li>商談日：{company.meeting_date}</li>
          <li>現在ステータス：{company.current_status}</li>
          {judgement.result === "NG" && (
            <li>納品フラグ：{company.delivery_flag}</li>
          )}
        </ul>
      )}
    </div>
  );
}
