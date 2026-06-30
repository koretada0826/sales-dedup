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
import { STATUS_OPTIONS, DELIVERY_OPTIONS } from "@/lib/constants";
import Header from "@/components/Header";

// 企業登録画面（商談した企業をフォームで登録する）
export default function RegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // フォーム全体の入力内容を1つのオブジェクトで管理する
  const [form, setForm] = useState({
    company_name: "",
    phone_number: "",
    representative_name: "",
    address: "",
    meeting_date: "",
    current_status: "商談",
    delivery_flag: "未着手",
    memo: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // 既に登録済みの企業が見つかったときに、その一覧をここに入れて警告を出す
  const [duplicates, setDuplicates] = useState(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/");
      return;
    }
    setUser(current);
  }, []);

  // 入力欄が変わるたびに、formの該当キーだけを書き換える
  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // 登録ボタンを押したとき：まず「すでに登録済みか」をチェックする
  async function handleSubmit(event) {
    event.preventDefault();

    const normName = normalizeCompanyName(form.company_name);
    const normPhone = normalizePhoneNumber(form.phone_number);

    // 電話番号 or 企業名（そうじ版）が一致する既存企業を探す
    const conditions = [];
    if (normPhone) conditions.push(`normalized_phone_number.eq.${normPhone}`);
    if (normName) conditions.push(`normalized_company_name.eq.${normName}`);

    if (conditions.length > 0) {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .or(conditions.join(","));
      if (data && data.length > 0) {
        // 既存があれば、いったん登録を止めて警告を表示する
        setDuplicates(data);
        return;
      }
    }

    // 重複がなければそのまま登録
    await insertCompany();
  }

  // 実際にDBへ登録する処理（重複チェックを通過 or「それでも登録」したとき）
  async function insertCompany() {
    setSaving(true);
    const newCompany = {
      ...form,
      normalized_company_name: normalizeCompanyName(form.company_name),
      normalized_phone_number: normalizePhoneNumber(form.phone_number),
      agency_id: user.id,
    };

    const { error } = await supabase.from("companies").insert(newCompany);
    setSaving(false);

    if (error) {
      alert("登録に失敗しました：" + error.message);
      return;
    }
    setDuplicates(null);
    setDone(true);
  }

  // 登録完了の表示
  if (done) {
    return (
      <div className="min-h-screen">
        <Header user={user} />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-2xl mb-4">✅ 登録しました</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setForm({
                  company_name: "",
                  phone_number: "",
                  representative_name: "",
                  address: "",
                  meeting_date: "",
                  current_status: "商談",
                  delivery_flag: "未着手",
                  memo: "",
                });
                setDone(false);
              }}
              className="bg-navy text-white px-4 py-2 rounded"
            >
              続けて登録
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="border px-4 py-2 rounded"
            >
              ダッシュボードへ
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">企業を登録</h1>

        {/* すでに登録済みの企業が見つかったときの警告 */}
        {duplicates && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900 rounded p-5 mb-6">
            <p className="font-bold mb-2">
              ⚠️ この企業はすでに登録されている可能性があります（{duplicates.length}件）
            </p>
            <ul className="text-sm space-y-2 mb-4">
              {duplicates.map((c) => {
                const judgement = judgeProposalAvailability(c);
                return (
                  <li key={c.id} className="border-t border-yellow-200 pt-2">
                    {c.company_name}（{c.phone_number || "電話未登録"}） / 商談日：
                    {c.meeting_date} / ステータス：{c.current_status} /
                    <span className="font-bold"> 提案可否：{judgement.result}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={insertCompany}
                disabled={saving}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "登録中..." : "それでも登録する"}
              </button>
              <button
                onClick={() => setDuplicates(null)}
                className="border border-yellow-600 text-yellow-800 px-4 py-2 rounded"
              >
                やめる
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <Field label="企業名（必須）">
            <input
              required
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="代表電話番号">
            <input
              value={form.phone_number}
              onChange={(e) => updateField("phone_number", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="03-1234-5678"
            />
          </Field>

          <Field label="代表者名">
            <input
              value={form.representative_name}
              onChange={(e) => updateField("representative_name", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="住所">
            <input
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="商談日（必須）">
            <input
              required
              type="date"
              value={form.meeting_date}
              onChange={(e) => updateField("meeting_date", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="現在ステータス">
            <select
              value={form.current_status}
              onChange={(e) => updateField("current_status", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="納品フラグ">
            <select
              value={form.delivery_flag}
              onChange={(e) => updateField("delivery_flag", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {DELIVERY_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="メモ">
            <textarea
              value={form.memo}
              onChange={(e) => updateField("memo", e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy text-white py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "登録中..." : "登録する"}
          </button>
        </form>
      </main>
    </div>
  );
}

// 入力欄1つ分の「ラベル＋中身」をまとめる小さな部品
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
