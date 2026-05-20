CREATE TABLE IF NOT EXISTS movie_ratings (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'movie',
    movie_title VARCHAR(255),
    poster_path VARCHAR(255),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_movie_rating UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_ratings_user_id ON movie_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_ratings_movie_id ON movie_ratings(movie_id);
