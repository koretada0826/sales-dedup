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


-- =====================================================================
-- ④ RLS（行レベルセキュリティ）＝データの鍵
--   これが無いと、公開鍵とURLだけで全データを読み書きできてしまう。
--   必ずこのブロックまで実行すること。
-- =====================================================================

-- 運営本部かどうかを判定する関数（RLSの中で使う）
-- security definer なので関数内ではRLSを無視して agencies を読める（無限ループ防止）
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from agencies where id = auth.uid() and role = 'admin');
$$;

-- RLSを有効化（直接アクセスは原則拒否に）
alter table agencies    enable row level security;
alter table companies   enable row level security;
alter table search_logs enable row level security;

-- agencies：自分の行 or 運営なら全部 読める
drop policy if exists agencies_select on agencies;
create policy agencies_select on agencies for select
  using (id = auth.uid() or public.is_admin());

-- companies：読み取り＝自分の企業 or 運営なら全部
drop policy if exists companies_select on companies;
create policy companies_select on companies for select
  using (agency_id = auth.uid() or public.is_admin());
-- companies：追加＝自分のagency_idでだけ
drop policy if exists companies_insert on companies;
create policy companies_insert on companies for insert
  with check (agency_id = auth.uid());
-- companies：変更＝自分の企業 or 運営（with checkで他人への付け替えを防ぐ）
drop policy if exists companies_update on companies;
create policy companies_update on companies for update
  using (agency_id = auth.uid() or public.is_admin())
  with check (agency_id = auth.uid() or public.is_admin());
-- companies：削除＝運営だけ
drop policy if exists companies_delete on companies;
create policy companies_delete on companies for delete using (public.is_admin());

-- search_logs：運営だけ閲覧可（記録はサーバーが秘密鍵で行う）
drop policy if exists search_logs_select on search_logs;
create policy search_logs_select on search_logs for select using (public.is_admin());
