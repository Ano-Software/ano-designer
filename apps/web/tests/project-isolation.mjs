import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !anonKey || !serviceRole) {
  console.error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE."
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const timestamp = Date.now();
const password = `Test@${timestamp}`;
const emailA = `isolation-a+${timestamp}@example.com`;
const emailB = `isolation-b+${timestamp}@example.com`;

let userARecord;
let userBRecord;
let projectAId;
let projectBId;

async function createTestUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw error ?? new Error(`Failed to create user ${email}`);
  }

  return data.user;
}

async function signIn(email) {
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to sign in ${email}`);
  }

  return { client, user: data.user };
}

async function ensureCleanup() {
  if (projectAId) {
    await admin.from("projects").delete().eq("id", projectAId);
  }
  if (projectBId) {
    await admin.from("projects").delete().eq("id", projectBId);
  }
  if (userARecord) {
    await admin.auth.admin.deleteUser(userARecord.id, true);
  }
  if (userBRecord) {
    await admin.auth.admin.deleteUser(userBRecord.id, true);
  }
}

async function run() {
  userARecord = await createTestUser(emailA);
  userBRecord = await createTestUser(emailB);

  const { client: clientA, user: userA } = await signIn(emailA);
  const { client: clientB, user: userB } = await signIn(emailB);

  const insertA = await clientA
    .from("projects")
    .insert({ name: "Project A", owner_id: userA.id })
    .select("id")
    .single();

  if (insertA.error || !insertA.data) {
    throw insertA.error ?? new Error("Could not insert project for user A");
  }

  projectAId = insertA.data.id;

  const insertB = await clientB
    .from("projects")
    .insert({ name: "Project B", owner_id: userB.id })
    .select("id")
    .single();

  if (insertB.error || !insertB.data) {
    throw insertB.error ?? new Error("Could not insert project for user B");
  }

  projectBId = insertB.data.id;

  const listA = await clientA
    .from("projects")
    .select("id, owner_id")
    .order("created_at", { ascending: false });

  if (listA.error) {
    throw listA.error;
  }

  if (!listA.data || listA.data.some((row) => row.owner_id !== userA.id)) {
    throw new Error("Isolation failed: user A received project from another user");
  }

  const crossLookup = await clientA
    .from("projects")
    .select("id")
    .eq("id", projectBId)
    .maybeSingle();

  if (crossLookup.data) {
    throw new Error("Isolation failed: user A fetched project B by id");
  }

  const updateAttempt = await clientA
    .from("projects")
    .update({ name: "Hacked" })
    .eq("id", projectBId)
    .select("id")
    .maybeSingle();

  if (updateAttempt.data || !updateAttempt.error) {
    throw new Error("Isolation failed: user A updated project B");
  }

  const deleteAttempt = await clientA
    .from("projects")
    .delete()
    .eq("id", projectBId)
    .select("id")
    .maybeSingle();

  if (deleteAttempt.data || !deleteAttempt.error) {
    throw new Error("Isolation failed: user A deleted project B");
  }

  console.log("Isolation checks passed.");
}

run()
  .catch((error) => {
    console.error("Isolation check failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await ensureCleanup();
  });
