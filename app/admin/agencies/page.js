"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

// 代理店アカウント管理画面（運営本部だけが使える）
export default function AgenciesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 新規アカウント追加フォームの入力内容
  const [form, setForm] = useState({
    name: "",
    login_id: "",
    password: "",
    role: "agency",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/");
      return;
    }
    if (current.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setUser(current);
    loadAgencies();
  }, []);

  async function loadAgencies() {
    setLoading(true);
    // パスワードは取得しない（一覧に出さない）
    const { data } = await supabase
      .from("agencies")
      .select("id, name, login_id, role, created_at")
      .order("created_at", { ascending: true });
    setAgencies(data || []);
    setLoading(false);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // アカウントを追加する
  async function handleAdd(event) {
    event.preventDefault();
    setSaving(true);
    // ⚠️ MVP：パスワードを平文で保存しています（本番はハッシュ化が必須）
    const { error } = await supabase.from("agencies").insert({
      name: form.name,
      login_id: form.login_id,
      password_hash: form.password,
      role: form.role,
    });
    setSaving(false);

    if (error) {
      // login_id がすでに使われている場合などはここに来る
      alert("追加に失敗しました：" + error.message);
      return;
    }
    setForm({ name: "", login_id: "", password: "", role: "agency" });
    loadAgencies();
  }

  async function deleteAgency(id) {
    const { error } = await supabase.from("agencies").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      // この代理店が企業を登録済みだと、外部キー制約で削除できないことがある
      alert("削除できませんでした：" + error.message);
      return;
    }
    loadAgencies();
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 画面切り替えのリンク */}
        <nav className="flex gap-4 mb-6 text-sm">
          <Link href="/admin" className="text-navy underline">
            ← 企業一覧へ戻る
          </Link>
        </nav>

        <h1 className="text-xl font-bold text-navy mb-6">
          代理店アカウント管理（全{agencies.length}件）
        </h1>

        {/* 新規追加フォーム */}
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-lg shadow p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">名前</label>
            <input
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="株式会社〇〇代理店"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ログインID</label>
            <input
              required
              value={form.login_id}
              onChange={(e) => updateField("login_id", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="agency02"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">パスワード</label>
            <input
              required
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="初期パスワード"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">権限</label>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="agency">販売代理店（agency）</option>
              <option value="admin">運営本部（admin）</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-navy text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "追加中..." : "アカウントを追加"}
            </button>
          </div>
        </form>

        {/* 一覧 */}
        {loading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-2">名前</th>
                  <th className="px-4 py-2">ログインID</th>
                  <th className="px-4 py-2">権限</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2">{a.login_id}</td>
                    <td className="px-4 py-2">
                      {a.role === "admin" ? "運営本部" : "販売代理店"}
                    </td>
                    <td className="px-4 py-2">
                      {deletingId === a.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-red-700">削除しますか？</span>
                          <button
                            onClick={() => deleteAgency(a.id)}
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
                        <button
                          onClick={() => setDeletingId(a.id)}
                          className="text-red-600 underline"
                          disabled={a.id === user?.id}
                          title={a.id === user?.id ? "ログイン中の自分は削除できません" : ""}
                        >
                          削除
                        </button>
                      )}
                    </td>
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
