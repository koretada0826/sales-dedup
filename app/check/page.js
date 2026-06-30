"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import {
  normalizeCompanyName,
  normalizePhoneNumber,
  judgeProposalAvailability,
} from "@/lib/judge";
import Header from "@/components/Header";
import ResultCard from "@/components/ResultCard";

// 営業前チェック画面（企業名・電話番号で検索し、提案可否を表示する）
export default function CheckPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searching, setSearching] = useState(false);

  // 検索結果：判定（judgement）と、見つかった企業（matched）
  const [judgement, setJudgement] = useState(null);
  const [matched, setMatched] = useState(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/");
      return;
    }
    setUser(current);
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    if (!companyName && !phoneNumber) {
      alert("企業名か電話番号のどちらかを入力してください。");
      return;
    }
    setSearching(true);
    setJudgement(null);
    setMatched(null);

    // 入力をそうじする（表記ゆれを吸収）
    const normName = normalizeCompanyName(companyName);
    const normPhone = normalizePhoneNumber(phoneNumber);

    // 「電話番号が一致」または「企業名が一致」する企業を探す条件を組み立てる
    const conditions = [];
    if (normPhone) conditions.push(`normalized_phone_number.eq.${normPhone}`);
    if (normName) conditions.push(`normalized_company_name.eq.${normName}`);

    const { data } = await supabase
      .from("companies")
      .select("*")
      .or(conditions.join(","))
      .order("meeting_date", { ascending: false });

    // 見つかった中の最新の1件を判定対象にする（なければ undefined）
    const found = data && data.length > 0 ? data[0] : undefined;
    const result = judgeProposalAvailability(found);

    setMatched(found || null);
    setJudgement(result);
    setSearching(false);

    // 検索履歴を残す（誰が・何を検索して・どう判定されたか）
    await supabase.from("search_logs").insert({
      agency_id: user.id,
      search_company_name: companyName,
      search_phone_number: phoneNumber,
      result: result.result,
    });
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">営業前チェック</h1>

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
