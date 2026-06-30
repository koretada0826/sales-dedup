-- =====================================================================
-- TELEMO 営業重複管理ツール  データベース設計
-- 使い方：Supabaseの「SQL Editor」にこの全文を貼り付けて Run するだけ
-- =====================================================================


-- ① agencies（アカウント：代理店・運営）---------------------------------
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login_id text not null unique,
  password_hash text not null,        -- ⚠️ MVPは平文。本番は Supabase Auth へ
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


-- ④ app_settings（運営が切り替える設定）--------------------------------
create table app_settings (
  key text primary key,
  value boolean not null default false
);

-- 初期設定：検索結果に担当代理店名を見せるか（最初は false=見せない）
insert into app_settings (key, value) values
  ('show_agency_name_to_agencies', false);


-- =====================================================================
-- デモ用データ（最初の動作確認用。あとで消してOK）
-- =====================================================================

-- アカウント2つ（運営1・代理店1）
insert into agencies (name, login_id, password_hash, role) values
  ('TELEMO運営本部', 'admin',   'admin123',  'admin'),
  ('サンプル代理店A', 'agency01', 'agency123', 'agency');

-- サンプル企業3社（agency01 が登録したことにする）
insert into companies
  (company_name, normalized_company_name, phone_number, normalized_phone_number,
   representative_name, meeting_date, current_status, delivery_flag, agency_id)
values
  ('株式会社TELEMO', 'telemo', '03-1234-5678', '0312345678',
   'telemo太郎', current_date - 14, '商談', '未着手',
   (select id from agencies where login_id = 'agency01')),

  ('サンプル商事', 'サンプル商事', '06-1111-2222', '0611112222',
   '見本花子', current_date - 170, 'テスト', '納品',
   (select id from agencies where login_id = 'agency01')),

  ('テスト工業', 'テスト工業', '052-333-4444', '0523334444',
   '試験次郎', current_date - 60, '商談', '未着手',
   (select id from agencies where login_id = 'agency01'));
