# TELEMO 営業重複管理ツール

販売代理店どうしの営業先の重複を防ぐための管理システムです。
営業前に企業を検索し、提案可否（OK / NG / 運営確認）を判定します。

## 技術構成
- Next.js（App Router）/ JavaScript / React
- Supabase（データベース）
- Tailwind CSS

---

## セットアップ手順（はじめての人向け）

### 1. ライブラリをインストールする
このフォルダで、ターミナルに次を打ちます。
```bash
npm install
```

### 2. Supabaseプロジェクトを用意する
1. https://supabase.com にログインし、新しいプロジェクトを作る
2. 左メニューの「SQL Editor」を開く
3. このリポジトリの `supabase/schema.sql` の中身を全部貼り付けて **Run**
   → テーブル3つ＋デモ用アカウント＆サンプル企業ができます

### 3. 接続キーを設定する
1. Supabaseの「Project Settings → API」を開く
2. このフォルダの `.env.local.example` を `.env.local` という名前でコピー
3. 中の2つの値を、Supabaseの値で埋める
   - `NEXT_PUBLIC_SUPABASE_URL` … Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` … anon public キー

### 4. 起動する
```bash
npm run dev
```
ブラウザで http://localhost:3000 を開く。

---

## デモ用ログイン
| 役割 | ログインID | パスワード |
|---|---|---|
| 運営本部 | `admin` | `admin123` |
| 販売代理店 | `agency01` | `agency123` |

---

## 画面一覧
| URL | 画面 | 誰が使う |
|---|---|---|
| `/` | ログイン | 全員 |
| `/dashboard` | 代理店ダッシュボード | 代理店 |
| `/register` | 企業登録 | 代理店 |
| `/check` | 営業前チェック（検索＋判定） | 代理店 |
| `/admin` | 運営管理 | 運営本部 |

---

## ⚠️ セキュリティについて（重要）
これは学習用MVPです。本番運用の前に、必ず次を直してください。
- **パスワードが平文**です。本番は **Supabase Auth** を使い、パスワードはハッシュ化してください。
- 今は誰でもDBを読み書きできる状態（RLS無効）です。本番は **Row Level Security** を設定し、
  「代理店は自分のデータだけ」「運営は全部」のように制限してください。
- 検索結果で他代理店の情報を出しすぎないよう、表示は最小限にしています。
