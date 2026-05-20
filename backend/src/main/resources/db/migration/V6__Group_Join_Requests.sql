CREATE TABLE IF NOT EXISTS group_join_requests (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES movie_groups(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_user_request UNIQUE (group_id, user_id)
);
