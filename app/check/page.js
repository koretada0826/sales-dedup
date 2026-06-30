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
    if (!companyName && !phoneNumber && !representativeName && !address) {
      alert("いずれか1つ以上を入力してください。");
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
            <label className="block text-sm font-medium mb-1">企業名</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="株式会社〇〇"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">代表者名</label>
            <input
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="山田 太郎"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">住所</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="東京都〇〇区..."
            />
          </div>
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
