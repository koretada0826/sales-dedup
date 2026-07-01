"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { FORBIDDEN_GROUPS } from "@/lib/constants";
import Header from "@/components/Header";
import ResultCard from "@/components/ResultCard";

// 営業前チェック画面（企業名・電話番号で検索し、提案可否を表示する）
export default function CheckPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);

  // 検索結果：判定（judgement）と、見つかった企業（matched）
  const [judgement, setJudgement] = useState(null);
  const [matched, setMatched] = useState(null);

  useEffect(() => {
    getCurrentUser().then((current) => {
      if (!current) {
        router.push("/");
        return;
      }
      setUser(current);
    });
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    // 重複判定の精度を上げるため、2項目以上の入力を必須にする
    const filledCount = [companyName, phoneNumber, representativeName, address]
      .filter((v) => v && v.trim())
      .length;
    if (filledCount < 2) {
      alert("2項目以上を入力してください（重複を正しく判定するため）。");
      return;
    }
    setSearching(true);
    setJudgement(null);
    setMatched(null);

    // 検索はサーバー側API(/api/search)に任せる。
    // ブラウザは判定結果＋最小限の情報だけ受け取る（他社の生データは届かない）。
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        companyName,
        phoneNumber,
        representativeName,
        address,
        requireTwo: true,
      }),
    });

    setSearching(false);

    if (!res.ok) {
      alert("検索に失敗しました。もう一度お試しください。");
      return;
    }

    const json = await res.json();
    setJudgement({ result: json.result, message: json.message });
    setMatched(json.company);
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">営業前チェック</h1>

        {/* 提案禁止グループのお知らせ（常時表示）。リストが空なら何も出さない */}
        {FORBIDDEN_GROUPS.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded p-4 mb-6">
            <p className="font-bold mb-2">⚠️ 提案禁止グループのお知らせ</p>
            <ul className="space-y-2">
              {FORBIDDEN_GROUPS.map((group) => (
                <li key={group.name}>
                  <span className="font-medium">{group.name}</span>
                  への提案は現在禁止となっております。
                  {group.url && (
                    <a
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-700 underline break-all ml-1"
                    >
                      {group.url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">代表電話番号</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="03-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">企業名（カタカナで入力）</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：テレモ（英字ではなくカタカナで）"
            />
            <p className="text-xs text-slate-500 mt-1">
              ※ 企業名はカタカナで検索してください（例：TELEMO → テレモ）
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">代表者名（カタカナで入力）</label>
            <input
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：ヤマダタロウ"
            />
            <p className="text-xs text-slate-500 mt-1">
              ※ 代表者名はカタカナで入力してください
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">住所（丁目まで）</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：東京都豊島区池袋1丁目"
            />
            <p className="text-xs text-slate-500 mt-1">
              ※ 番地・建物名は入れず、丁目までを入力してください（例：東京都豊島区池袋1丁目）
            </p>
          </div>

          <p className="text-xs text-slate-600">
            ※ 2項目以上を入力してください。<br />
            ・1項目だけ既存企業と一致 → 「運営確認」<br />
            ・2項目以上一致 → 「提案不可（NG）」（商談状況により運営確認の場合あり）
          </p>
          <button
            type="submit"
            disabled={searching}
            className="w-full bg-navy text-white py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {searching ? "検索中..." : "検索して判定する"}
          </button>
        </form>

        {/* 判定結果があれば表示する */}
        {judgement && <ResultCard judgement={judgement} company={matched} />}
      </main>
    </div>
  );
}
