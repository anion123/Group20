CREATE TABLE IF NOT EXISTS movie (
    id INTEGER PRIMARY KEY,
    title VARCHAR NOT NULL,
    original_title VARCHAR NOT NULL,
    release_year INTEGER NOT NULL,
    region VARCHAR NOT NULL,
    genres VARCHAR ARRAY NOT NULL,
    director VARCHAR NOT NULL,
    original_rating DECIMAL(3,1),
    top_rank INTEGER,
    new_chart_rank INTEGER,
    poster_url VARCHAR NOT NULL,
    synopsis VARCHAR NOT NULL,
    media_type VARCHAR NOT NULL,
    release_status VARCHAR NOT NULL,
    playable BOOLEAN NOT NULL,
    search_text VARCHAR NOT NULL
);
