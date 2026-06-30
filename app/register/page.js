"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCompanyName, normalizePhoneNumber } from "@/lib/judge";
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

  // 登録ボタンを押したとき
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    // DBに入れるデータを組み立てる（そうじした版も一緒に保存）
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
