CREATE TABLE watchlist (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id INT NOT NULL,
    media_type VARCHAR(20),
    title VARCHAR(255),
    poster_path VARCHAR(255),
    overview TEXT,
    vote_average FLOAT,
    release_date VARCHAR(50),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
