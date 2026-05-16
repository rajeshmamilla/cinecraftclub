-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    profile_pic_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_interests (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    interest_id INT REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, interest_id)
);

-- ============================================
-- MOVIES (Cached from TMDB)
-- ============================================
CREATE TABLE movies (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id INT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    overview TEXT,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    release_date DATE,
    original_language VARCHAR(10),
    runtime INT,
    vote_average DECIMAL(3,1),
    vote_count INT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tmdb_id ON movies (tmdb_id);
CREATE INDEX idx_title ON movies (title);

CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE movie_genres (
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, movie_id)
);
CREATE INDEX idx_user_reviews ON reviews(user_id);
CREATE INDEX idx_movie_reviews ON reviews(movie_id);

-- ============================================
-- DISCUSSION GROUPS
-- ============================================
CREATE TABLE discussion_groups (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    creator_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_movie_groups ON discussion_groups(movie_id);
CREATE INDEX idx_creator ON discussion_groups(creator_id);

CREATE TABLE group_members (
    group_id BIGINT REFERENCES discussion_groups(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'member', -- 'creator', 'moderator', 'member'
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_user_groups ON group_members(user_id);

-- ============================================
-- DISCUSSIONS & COMMENTS
-- ============================================
CREATE TABLE discussions (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT REFERENCES discussion_groups(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_group_discussions ON discussions(group_id);
CREATE INDEX idx_user_discussions ON discussions(user_id);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    discussion_id BIGINT REFERENCES discussions(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_discussion_comments ON comments(discussion_id);
CREATE INDEX idx_user_comments ON comments(user_id);

-- ============================================
-- ENGAGEMENT
-- ============================================
CREATE TABLE review_likes (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    review_id BIGINT REFERENCES reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, review_id)
);

CREATE TABLE discussion_likes (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    discussion_id BIGINT REFERENCES discussions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, discussion_id)
);
