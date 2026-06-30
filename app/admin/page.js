"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import {
  judgeProposalAvailability,
  normalizeCompanyName,
  normalizePhoneNumber,
} from "@/lib/judge";
import { STATUS_OPTIONS, DELIVERY_OPTIONS } from "@/lib/constants";
import { getShowAgencyName, setShowAgencyName } from "@/lib/settings";
import Header from "@/components/Header";

// 運営管理画面（運営本部だけが見れる。全企業の一覧・編集・削除・ステータス管理）
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // editing = 編集中の企業（コピー）。null なら編集モーダルは閉じている
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  // deletingId = 削除確認中の企業id（その行だけ「削除しますか？」を出す）
  const [deletingId, setDeletingId] = useState(null);
  // 検索結果に担当代理店名を見せるか（運営が切り替える設定）
  const [showAgency, setShowAgency] = useState(false);

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
    getShowAgencyName().then(setShowAgency);
  }, []);

  // 「代理店名を見せる」設定を切り替える
  async function toggleShowAgency(value) {
    setShowAgency(value); // 画面を先に更新
    await setShowAgencyName(value);
  }

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

  // ステータスや納品フラグを変更したらDBを更新する（一覧で直接変更）
  async function updateCompany(id, key, value) {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
    await supabase
      .from("companies")
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  // 編集中の企業の1項目を書き換える
  function updateEditField(key, value) {
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  // 編集内容を保存する（全項目＋そうじ版を更新）
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
    await supabase.from("companies").update(updated).eq("id", editing.id);
    setSaving(false);
    setEditing(null);
    loadAll();
  }

  // 企業を削除する
  async function deleteCompany(id) {
    await supabase.from("companies").delete().eq("id", id);
    setDeletingId(null);
    loadAll();
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex gap-4 mb-4 text-sm">
          <Link href="/admin/agencies" className="text-navy underline">
            代理店アカウント管理 →
          </Link>
        </nav>

        <h1 className="text-xl font-bold text-navy mb-4">
          運営管理画面（全{companies.length}件）
        </h1>

        {/* 設定：検索結果に担当代理店名を見せるか */}
        <label className="flex items-center gap-2 mb-6 text-sm bg-white rounded shadow px-4 py-3 w-fit">
          <input
            type="checkbox"
            checked={showAgency}
            onChange={(e) => toggleShowAgency(e.target.checked)}
          />
          代理店の検索結果に「担当代理店名」を表示する
        </label>

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
                  <th className="px-3 py-2">操作</th>
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
                      <td className="px-3 py-2">
                        {deletingId === c.id ? (
                          <span className="flex items-center gap-2">
                            <span className="text-red-700">削除しますか？</span>
                            <button
                              onClick={() => deleteCompany(c.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >
                              はい
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="border px-2 py-1 rounded text-xs"
                            >
                              いいえ
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <button
                              onClick={() => setEditing({ ...c })}
                              className="text-navy underline"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => setDeletingId(c.id)}
                              className="text-red-600 underline"
                            >
                              削除
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 編集モーダル（editing が入っているときだけ表示） */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy mb-4">企業情報を編集</h2>
            <div className="space-y-3">
              <EditField label="企業名">
                <input
                  value={editing.company_name || ""}
                  onChange={(e) => updateEditField("company_name", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </EditField>
              <EditField label="代表電話番号">
                <input
                  value={editing.phone_number || ""}
                  onChange={(e) => updateEditField("phone_number", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </EditField>
              <EditField label="代表者名">
                <input
                  value={editing.representative_name || ""}
                  onChange={(e) => updateEditField("representative_name", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </EditField>
              <EditField label="住所">
                <input
                  value={editing.address || ""}
                  onChange={(e) => updateEditField("address", e.target.value)}
                  className="w-full border rounded px-3 py-2"
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
