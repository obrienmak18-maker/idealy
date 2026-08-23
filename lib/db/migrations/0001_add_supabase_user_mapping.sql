ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseUserId" uuid;
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_unique" ON "User" ("supabaseUserId");
