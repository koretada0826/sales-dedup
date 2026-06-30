-- =====================================================================
-- 営業重複管理ツール  データベース設計（Supabase Auth対応版）
--
-- ポイント：
--  - ログインID/パスワードは agencies に持たない。Supabase Auth が安全に管理する。
--  - agencies.id は、Supabase Auth のユーザーid（auth.users.id）と一致させる。
--  - デモ用アカウント・企業は、scripts/seed.mjs（秘密鍵で実行）で投入する。
-- =====================================================================


-- ① agencies（アカウントの付帯情報：名前と権限）-----------------------
--   id は auth.users(id) を参照。＝「このアプリ上の名前と役割」を持つ表。
create table agencies (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'agency', -- 'admin' か 'agency'
  created_at timestamptz not null default now()
);


-- ② companies（商談した企業：主役）-------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  normalized_company_name text,
  phone_number text,
  normalized_phone_number text,
  representative_name text,
  address text,
  meeting_date date not null,
  current_status text not null default '商談',
  delivery_flag text not null default '未着手',
  agency_id uuid references agencies(id),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ③ search_logs（検索の履歴）-------------------------------------------
create table search_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id),
  search_company_name text,
  search_phone_number text,
  search_address text,
  result text,
  created_at timestamptz not null default now()
);
