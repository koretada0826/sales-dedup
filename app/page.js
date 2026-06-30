"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { loginIdToEmail } from "@/lib/loginId";

// ログイン画面（トップページ）
export default function LoginPage() {
  const router = useRouter();

  // 入力欄の中身を覚えておく箱
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ログインボタンを押したときの処理
  async function handleLogin(event) {
    event.preventDefault(); // フォーム送信でページが再読み込みされるのを止める
    setError("");

    if (!isSupabaseReady) {
      setError("Supabaseが未設定です。READMEの手順で .env.local を設定してください。");
      return;
    }

    setLoading(true);

    // ログインIDを内部メールに変換して、Supabase Auth にログインを依頼する
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginIdToEmail(loginId),
      password,
    });

    if (authError) {
      setLoading(false);
      setError("メールアドレスまたはパスワードが違います。");
      return;
    }

    // ログイン成功 → 権限を調べて、運営なら/admin・代理店なら/dashboardへ
    const current = await getCurrentUser();
    setLoading(false);
    if (current?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ダッシュボードと同じ紺色の上部バー */}
      <header className="bg-navy text-white px-8 py-5">
        <div className="font-bold text-2xl">営業重複管理ツール</div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-xl rounded-3xl p-14 w-full max-w-2xl"
      >
        <h1 className="text-4xl font-bold text-navy mb-3">ログイン</h1>
        <p className="text-xl text-slate-500 mb-10">
          営業重複管理ツール
        </p>

        <label className="block text-lg font-medium mb-2">ログインID</label>
        <input
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="w-full border rounded-xl px-5 py-4 text-lg mb-6"
          placeholder="agency01"
        />

        <label className="block text-lg font-medium mb-2">パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-xl px-5 py-4 text-lg mb-6"
          placeholder="••••••"
        />

        {error && (
          <p className="text-red-600 text-lg mb-6">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white text-xl font-medium py-4 rounded-xl hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "確認中..." : "ログイン"}
        </button>

        <p className="text-base text-slate-400 mt-8 text-center">
          テスト用：agency01 / Agency12345!（代理店）
          <br />
          admin / Admin12345!（運営）
        </p>
      </form>
      </main>
    </div>
  );
}
