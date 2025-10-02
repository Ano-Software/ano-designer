import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

type ResolveIdentifierBody = {
  identifier?: string;
};

const sanitizePattern = (value: string) => value.replace(/[%_]/g, "\\$&");

export async function POST(request: Request) {
  let body: ResolveIdentifierBody;

  try {
    body = (await request.json()) as ResolveIdentifierBody;
  } catch (error) {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const rawIdentifier = body.identifier?.trim();

  if (!rawIdentifier) {
    return NextResponse.json({ error: "identifier obrigatório." }, { status: 400 });
  }

  if (rawIdentifier.includes("@")) {
    return NextResponse.json({ email: rawIdentifier });
  }

  try {
    const admin = createAdminClient();
    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, username")
      .ilike("username", sanitizePattern(normalizedIdentifier))
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = profiles?.[0];

    if (!profile) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      profile.id as string
    );

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível resolver o identificador." },
      { status: 500 }
    );
  }
}
