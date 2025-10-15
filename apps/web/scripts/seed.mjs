import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function createSeedUser(label) {
  const email = `seed+${label}-${Date.now()}@example.com`;
  const password = `Temp-${randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user ${label}: ${error?.message ?? "unknown"}`);
  }

  const project = {
    owner_id: data.user.id,
    name: `Projeto ${label.toUpperCase()}`,
    description: `Projeto de seed gerado para ${label}`,
  };

  const insert = await admin.from("projects").insert(project).select("id").single();

  if (insert.error) {
    throw new Error(`Failed to create project for ${label}: ${insert.error.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    projectId: insert.data.id,
  };
}

async function assertIsolation(user, expectedCount) {
  const client = createClient(supabaseUrl, anonKey);
  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (signIn.error || !signIn.data.session) {
    throw new Error(
      `Unable to sign in seed user ${user.email}: ${signIn.error?.message ?? "unknown"}`
    );
  }

  const { data, error } = await client
    .from("projects")
    .select("id, owner_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list projects for ${user.email}: ${error.message}`);
  }

  if (!data || data.length !== expectedCount) {
    throw new Error(
      `Isolation assertion failed for ${user.email}. Expected ${expectedCount} project(s), got ${data?.length ?? 0}.`
    );
  }

  if (data.some((row) => row.owner_id !== user.id)) {
    throw new Error(
      `Isolation assertion failed for ${user.email}: found project from another owner.`
    );
  }

  await client.auth.signOut();
}

async function cleanup(users) {
  await Promise.all(
    users.map(async (user) => {
      await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    })
  );
}

async function main() {
  const users = [];

  try {
    const userA = await createSeedUser("designer-a");
    const userB = await createSeedUser("designer-b");
    users.push(userA, userB);

    await assertIsolation(userA, 1);
    await assertIsolation(userB, 1);

    console.info("Seed completed successfully:");
    users.forEach((user) => {
      console.info(`- ${user.email} (project ${user.projectId})`);
    });
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    if (process.env.KEEP_SEED_USERS !== "true") {
      await cleanup(users);
    }
  }
}

main().catch((error) => {
  process.exitCode = 1;
});
