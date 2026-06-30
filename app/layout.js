import "./globals.css";

// 全ページ共通の枠（タイトルなど）
export const metadata = {
  title: "TELEMO 営業重複管理ツール",
  description: "販売代理店の営業先重複を防ぐための管理システム",
};

// children = 各ページの中身がここに差し込まれる
export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
