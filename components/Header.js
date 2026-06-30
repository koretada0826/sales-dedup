"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

// 画面の上に出る共通バー。ログイン中の名前とログアウトボタンを表示する
export default function Header({ user }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="bg-navy text-white px-6 py-4 flex items-center justify-between">
      <div className="font-bold text-lg">営業重複管理ツール</div>
      <div className="flex items-center gap-4 text-sm">
        {user && (
          <span>
            {user.name}（{user.role === "admin" ? "運営本部" : "販売代理店"}）
          </span>
        )}
        <button
          onClick={handleLogout}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
