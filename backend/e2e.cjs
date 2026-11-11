const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const eps = [
  ["/me/context", 200], ["/me/profile", 403], ["/me/notifications?limit=1", 200],
  ["/dashboard/summary", 200], ["/staff", 200], ["/staff/dashboard", 200],
  ["/patients", 200], ["/audit-events?limit=5", 200], ["/access-requests", 200],
  ["/rights-requests", 200], ["/me/documents", 403], ["/me/representatives", 403],
  ["/security/sessions", 200], ["/admin/representatives", 200],
  ["/compliance", 200], ["/ai-risk/patients", 200]
];

async function run() {
  console.log("Logging in...");
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users.find(u => u.email === "bountymatage@gmail.com");
  if (user) await admin.auth.admin.updateUserById(user.id, { password: "password123" });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await sb.auth.signInWithPassword({ email: "bountymatage@gmail.com", password: "password123" });
  if (error) { console.error("Login failed:", error.message); process.exit(1); }

  const headers = { "Authorization": `Bearer ${data.session.access_token}`, "x-tenant-id": "ad0a4777-cee4-4e69-894a-410648d8b22a" };
  
  let pass = 0, fail = 0;
  console.log("\n=== Running E2E ===\n");

  for (const [path, expect] of eps) {
    try {
      const res = await fetch(`http://127.0.0.1:4000/v1${path}`, { headers });
      if (res.status === expect) {
        console.log(`✅ [PASS] ${path.padEnd(30)} -> ${res.status}`);
        pass++;
      } else {
        console.log(`❌ [FAIL] ${path.padEnd(30)} -> ${res.status} (Expected ${expect})`);
        fail++;
      }
    } catch (err) {
      console.log(`❌ [FAIL] ${path.padEnd(30)} -> ERR: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n=== Results: ${pass} Passed, ${fail} Failed ===`);
}

run().catch(console.error);