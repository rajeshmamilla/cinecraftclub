-- Make email and password nullable to support social logins and delayed email verification
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add provider columns for OAuth2 tracking
ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);

-- Make email unique only if it's not null (already handled by typical UNIQUE constraints in Postgres, but ensuring it)
-- Postgres UNIQUE constraints allow multiple NULLs by default.

-- We should also drop the UNIQUE constraint on email and recreate it to be safe, 
-- but Postgres inherently allows multiple NULL values in a UNIQUE column, so it's fine.
