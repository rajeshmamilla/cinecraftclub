-- 1. Create a temporary table to map old integer IDs to new 8-character random string IDs
CREATE TABLE IF NOT EXISTS temp_group_id_map (
    old_id INT PRIMARY KEY,
    new_id VARCHAR(8) UNIQUE
);

-- Generate new unique 8-character random alphanumeric IDs for each existing group
INSERT INTO temp_group_id_map (old_id, new_id)
SELECT id, substring(md5(id::text || random()::text), 1, 8)
FROM movie_groups;

-- 2. Drop foreign key constraints
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_group_id_fkey;
ALTER TABLE group_join_requests DROP CONSTRAINT IF EXISTS group_join_requests_group_id_fkey;

-- Drop primary key cascade
ALTER TABLE movie_groups DROP CONSTRAINT IF EXISTS movie_groups_pkey CASCADE;

-- 3. Alter column types to VARCHAR(8) first so they can receive VARCHAR data
ALTER TABLE movie_groups ALTER COLUMN id TYPE VARCHAR(8) USING id::VARCHAR(8);
ALTER TABLE group_members ALTER COLUMN group_id TYPE VARCHAR(8) USING group_id::VARCHAR(8);
ALTER TABLE group_messages ALTER COLUMN group_id TYPE VARCHAR(8) USING group_id::VARCHAR(8);
ALTER TABLE group_join_requests ALTER COLUMN group_id TYPE VARCHAR(8) USING group_id::VARCHAR(8);

-- 4. Update the values in the tables using the temporary map
UPDATE movie_groups m
SET id = t.new_id
FROM temp_group_id_map t
WHERE m.id = t.old_id::VARCHAR(8);

UPDATE group_members m
SET group_id = t.new_id
FROM temp_group_id_map t
WHERE m.group_id = t.old_id::VARCHAR(8);

UPDATE group_messages m
SET group_id = t.new_id
FROM temp_group_id_map t
WHERE m.group_id = t.old_id::VARCHAR(8);

UPDATE group_join_requests m
SET group_id = t.new_id
FROM temp_group_id_map t
WHERE m.group_id = t.old_id::VARCHAR(8);

-- 5. Drop auto-increment sequence bindings on movie_groups.id
ALTER TABLE movie_groups ALTER COLUMN id DROP DEFAULT;

-- 6. Re-create primary key constraint on movie_groups
ALTER TABLE movie_groups ADD CONSTRAINT movie_groups_pkey PRIMARY KEY (id);

-- 7. Re-create foreign key constraints
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES movie_groups(id) ON DELETE CASCADE;
ALTER TABLE group_messages ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES movie_groups(id) ON DELETE CASCADE;
ALTER TABLE group_join_requests ADD CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES movie_groups(id) ON DELETE CASCADE;

-- 8. Clean up mapping table
DROP TABLE IF EXISTS temp_group_id_map;
