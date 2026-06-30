"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { judgeProposalAvailability } from "@/lib/judge";
import { STATUS_OPTIONS, DELIVERY_OPTIONS } from "@/lib/constants";
import Header from "@/components/Header";

// 運営管理画面（運営本部だけが見れる。全企業の一覧とステータス管理）
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/");
      return;
    }
    if (current.role !== "admin") {
      router.push("/dashboard"); // 運営でなければ追い返す
      return;
    }
    setUser(current);
    loadAll();
  }, []);

  // 全企業＋登録した代理店名を取ってくる
  async function loadAll() {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("*, agencies(name)")
      .order("meeting_date", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  }

  // ステータスや納品フラグを変更したらDBを更新する
  async function updateCompany(id, key, value) {
    // 画面側を先に書き換える（待たずに見た目を更新）
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
    await supabase
      .from("companies")
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  // 判定結果に応じた色
  const resultColor = {
    OK: "text-green-700 bg-green-100",
    NG: "text-red-700 bg-red-100",
    運営確認: "text-yellow-700 bg-yellow-100",
  };

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">
          運営管理画面（全{companies.length}件）
        </h1>

        {loading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-3 py-2">企業名</th>
                  <th className="px-3 py-2">電話番号</th>
                  <th className="px-3 py-2">代表者</th>
                  <th className="px-3 py-2">商談日</th>
                  <th className="px-3 py-2">ステータス</th>
                  <th className="px-3 py-2">納品フラグ</th>
                  <th className="px-3 py-2">担当代理店</th>
                  <th className="px-3 py-2">提案可否</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const judgement = judgeProposalAvailability(c);
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">{c.company_name}</td>
                      <td className="px-3 py-2">{c.phone_number}</td>
                      <td className="px-3 py-2">{c.representative_name}</td>
                      <td className="px-3 py-2">{c.meeting_date}</td>
                      <td className="px-3 py-2">
                        <select
                          value={c.current_status}
                          onChange={(e) => updateCompany(c.id, "current_status", e.target.value)}
                          className="border rounded px-1 py-1"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={c.delivery_flag}
                          onChange={(e) => updateCompany(c.id, "delivery_flag", e.target.value)}
                          className="border rounded px-1 py-1"
                        >
                          {DELIVERY_OPTIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">{c.agencies?.name || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${resultColor[judgement.result]}`}>
                          {judgement.result}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
