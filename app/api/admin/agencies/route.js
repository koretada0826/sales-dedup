// =============================================
// app/api/admin/agencies/route.js
// 代理店アカウントの一覧取得・作成・削除を行うサーバー側API。
// 秘密の鍵を使うので、必ず「呼び出し元が運営本部(admin)か」を確認してから動く。
// =============================================

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loginIdToEmail, emailToLoginId } from "@/lib/loginId";

// 呼び出し元が運営本部(admin)か確認する。OKならそのユーザーを返す。違えば null。
async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  // トークンから本人を特定する（なりすまし防止）
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  // その人の権限が admin か確認する
  const { data: profile } = await supabaseAdmin
    .from("agencies")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;

  return user;
}

// 一覧取得（名前・権限・メールアドレス）
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { data: agencies } = await supabaseAdmin
    .from("agencies")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: true });

  // ログインIDは内部メールから復元する（id→email の対応表を作る）
  const {
    data: { users },
  } = await supabaseAdmin.auth.admin.listUsers();
  const emailById = Object.fromEntries(users.map((u) => [u.id, u.email]));

  const result = (agencies || []).map((a) => ({
    ...a,
    login_id: emailToLoginId(emailById[a.id]),
  }));
  return NextResponse.json({ agencies: result });
}

// 新規アカウント作成（Authユーザー＋agencies行）
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { name, login_id, password, role } = await request.json();
  if (!name || !login_id || !password) {
    return NextResponse.json({ error: "未入力の項目があります" }, { status: 400 });
  }

  // ログインIDを内部メールに変換してAuthユーザーを作成（メール確認済み）
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: loginIdToEmail(login_id),
    password,
    email_confirm: true,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // agencies に名前と権限を登録
  const { error: aErr } = await supabaseAdmin
    .from("agencies")
    .insert({ id: data.user.id, name, role: role || "agency" });
  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// アカウント削除（Authユーザーを消す→agencies行はcascadeで消える）
export async function DELETE(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id } = await request.json();
  if (id === admin.id) {
    return NextResponse.json(
      { error: "ログイン中の自分自身は削除できません" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// パスワード再設定（運営が任意のアカウントの新しいパスワードを設定する）
export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id, password } = await request.json();
  if (!id || !password) {
    return NextResponse.json({ error: "未入力の項目があります" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上にしてください" },
      { status: 400 }
    );
  }

  // Auth 側のパスワードを更新する
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
