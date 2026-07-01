"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import {
  normalizeCompanyName,
  normalizePhoneNumber,
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
  // 既に登録済みの企業が見つかったときの結果（{result, message, company}）。null なら警告なし
  const [dupResult, setDupResult] = useState(null);

  useEffect(() => {
    getCurrentUser().then((current) => {
      if (!current) {
        router.push("/");
        return;
      }
      setUser(current);
    });
  }, []);

  // 入力欄が変わるたびに、formの該当キーだけを書き換える
  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // 登録ボタンを押したとき：まず「すでに登録済みか」をサーバーAPIで確認する
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    // サーバー側の検索APIで重複を確認（他社データはブラウザに届かない）
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
        companyName: form.company_name,
        phoneNumber: form.phone_number,
      }),
    });
    const json = await res.json();
    setSaving(false);

    // result が "OK" 以外＝既存の登録あり → 警告を出して止める
    if (res.ok && json.result !== "OK") {
      setDupResult(json);
      return;
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
    setDupResult(null);
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

        {/* すでに登録済みの企業が見つかったときの警告（最小限の情報のみ） */}
        {dupResult && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900 rounded p-5 mb-6">
            <p className="font-bold mb-2">
              ⚠️ この企業はすでに登録されている可能性があります
            </p>
            <p className="text-sm mb-2">{dupResult.message}</p>
            {dupResult.company && (
              <ul className="text-sm space-y-1 mb-4 border-t border-yellow-200 pt-2">
                <li>企業名：{dupResult.company.company_name}</li>
                <li>商談日：{dupResult.company.meeting_date}</li>
                <li>現在ステータス：{dupResult.company.current_status}</li>
                <li className="font-bold">提案可否：{dupResult.result}</li>
              </ul>
            )}
            <div className="flex gap-3">
              <button
                onClick={insertCompany}
                disabled={saving}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "登録中..." : "それでも登録する"}
              </button>
              <button
                onClick={() => setDupResult(null)}
                className="border border-yellow-600 text-yellow-800 px-4 py-2 rounded"
              >
                やめる
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <Field label="企業名（必須・カタカナで入力）">
            <input
              required
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：テレモ（英字ではなくカタカナで）"
            />
            <p className="text-xs text-slate-500 mt-1">
              ※ 重複を正しく防ぐため、企業名は必ずカタカナで入力してください（例：TELEMO → テレモ）
            </p>
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
