ALTER TABLE movie_groups 
ADD COLUMN IF NOT EXISTS trending_keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS keywords_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_movie_groups_keywords 
ON movie_groups USING GIN (trending_keywords);

CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id INT NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('clap', 'film', 'thinking', 'hundred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (message_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
