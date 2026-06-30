"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

// 販売代理店のダッシュボード（ログイン後の最初の画面）
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 画面が表示されたとき（最初の1回）に実行される
  useEffect(() => {
    getCurrentUser().then((current) => {
      if (!current) {
        router.push("/"); // ログインしていなければログイン画面へ
        return;
      }
      setUser(current);
      loadMyCompanies(current.id);
    });
  }, []);

  // 自分が登録した企業だけを取ってくる
  async function loadMyCompanies(agencyId) {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">ダッシュボード</h1>

        {/* 2つの大きなボタン */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <Link
            href="/check"
            className="bg-navy text-white rounded-lg p-6 text-center font-bold hover:opacity-90"
          >
            🔍 営業前チェック
            <p className="text-sm font-normal mt-1 opacity-80">
              提案していいか検索する
            </p>
          </Link>
          <Link
            href="/register"
            className="bg-white border-2 border-navy text-navy rounded-lg p-6 text-center font-bold hover:bg-slate-50"
          >
            ＋ 企業を登録
            <p className="text-sm font-normal mt-1 opacity-80">
              商談した企業を登録する
            </p>
          </Link>
        </div>

        {/* 自分が登録した企業一覧 */}
        <h2 className="font-bold text-slate-700 mb-3">
          自分が登録した企業（{companies.length}件）
        </h2>

        {loading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : companies.length === 0 ? (
          <p className="text-slate-500">まだ登録した企業はありません。</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-2">企業名</th>
                  <th className="px-4 py-2">商談日</th>
                  <th className="px-4 py-2">ステータス</th>
                  <th className="px-4 py-2">納品フラグ</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{c.company_name}</td>
                    <td className="px-4 py-2">{c.meeting_date}</td>
                    <td className="px-4 py-2">{c.current_status}</td>
                    <td className="px-4 py-2">{c.delivery_flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
