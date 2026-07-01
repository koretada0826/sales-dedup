"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCompanyName, normalizePhoneNumber } from "@/lib/judge";
import { STATUS_OPTIONS, DELIVERY_OPTIONS } from "@/lib/constants";
import Header from "@/components/Header";

// 販売代理店のダッシュボード（ログイン後の最初の画面）
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // editing = 編集中の企業（コピー）。null なら編集モーダルは閉じている
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

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

  // 編集中の企業の1項目を書き換える
  function updateEditField(key, value) {
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  // 編集内容を保存する（自分の企業のみ。RLSで他人の企業は保存できない）
  async function saveEdit() {
    setSaving(true);
    const updated = {
      company_name: editing.company_name,
      phone_number: editing.phone_number,
      representative_name: editing.representative_name,
      address: editing.address,
      meeting_date: editing.meeting_date,
      current_status: editing.current_status,
      delivery_flag: editing.delivery_flag,
      memo: editing.memo,
      normalized_company_name: normalizeCompanyName(editing.company_name),
      normalized_phone_number: normalizePhoneNumber(editing.phone_number),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("companies")
      .update(updated)
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      alert("保存に失敗しました：" + error.message);
      return;
    }
    setEditing(null);
    loadMyCompanies(user.id);
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
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{c.company_name}</td>
                    <td className="px-4 py-2">{c.meeting_date}</td>
                    <td className="px-4 py-2">{c.current_status}</td>
                    <td className="px-4 py-2">{c.delivery_flag}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setEditing({ ...c })}
                        className="text-navy underline"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 編集モーダル（editing が入っているときだけ表示） */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">登録企業を編集</h2>
            <div className="space-y-3">
              <EditField label="企業名（カタカナで入力）">
                <input
                  value={editing.company_name || ""}
                  onChange={(e) => updateEditField("company_name", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例：テレモ"
                />
              </EditField>
              <EditField label="代表電話番号">
                <input
                  value={editing.phone_number || ""}
                  onChange={(e) => updateEditField("phone_number", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="03-1234-5678"
                />
              </EditField>
              <EditField label="代表者名（カタカナで入力）">
                <input
                  value={editing.representative_name || ""}
                  onChange={(e) => updateEditField("representative_name", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例：ヤマダタロウ"
                />
              </EditField>
              <EditField label="住所（丁目まで）">
                <input
                  value={editing.address || ""}
                  onChange={(e) => updateEditField("address", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例：東京都豊島区池袋1丁目"
                />
              </EditField>
              <EditField label="商談日">
                <input
                  type="date"
                  value={editing.meeting_date || ""}
                  onChange={(e) => updateEditField("meeting_date", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </EditField>
              <EditField label="現在ステータス">
                <select
                  value={editing.current_status}
                  onChange={(e) => updateEditField("current_status", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </EditField>
              <EditField label="納品フラグ">
                <select
                  value={editing.delivery_flag}
                  onChange={(e) => updateEditField("delivery_flag", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {DELIVERY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </EditField>
              <EditField label="メモ">
                <textarea
                  value={editing.memo || ""}
                  onChange={(e) => updateEditField("memo", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </EditField>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="bg-navy text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="border px-4 py-2 rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 編集モーダル内の「ラベル＋入力欄」の小さな部品
function EditField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
