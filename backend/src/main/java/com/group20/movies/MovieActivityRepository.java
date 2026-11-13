package com.group20.movies;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
class MovieActivityRepository {
    record Review(long id, int movieId, int userId, String author, int stars, String content,
                  String createdAt, String updatedAt) {}
    record ReviewPage(List<Review> items, int page, int size, long total) {}

    private static final String REVIEW_FROM = " FROM review r JOIN app_user u ON u.id = r.user_id WHERE r.movie_id = ?";
    private static final RowMapper<Review> REVIEW = (row, index) -> new Review(
            row.getLong("id"), row.getInt("movie_id"), row.getInt("user_id"), row.getString("display_name"),
            row.getInt("stars"), row.getString("content"),
            row.getObject("created_at", OffsetDateTime.class).toInstant().toString(),
            row.getObject("updated_at", OffsetDateTime.class).toInstant().toString());

    private final JdbcClient jdbc;

    MovieActivityRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    MovieActivityController.Status status(int movieId, int userId) {
        return jdbc.sql("SELECT status FROM user_movie WHERE movie_id = ? AND user_id = ?")
                .params(movieId, userId).query(String.class).optional()
                .map(MovieActivityController.Status::valueOf).orElse(null);
    }

    void setStatus(int movieId, int userId, MovieActivityController.Status status) {
        if (status == null) {
            jdbc.sql("DELETE FROM user_movie WHERE movie_id = ? AND user_id = ?").params(movieId, userId).update();
        } else {
            jdbc.sql("MERGE INTO user_movie (movie_id, user_id, status) KEY (movie_id, user_id) VALUES (?, ?, ?)")
                    .params(movieId, userId, status.name()).update();
        }
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReviewPage reviews(int movieId, int page, int size, int stars, Integer userId) {
        String from = REVIEW_FROM + switch (stars) {
            case 1 -> " AND r.stars <= 2";
            case 3 -> " AND r.stars = 3";
            case 5 -> " AND r.stars >= 4";
            default -> "";
        };
        List<Object> params = new ArrayList<>();
        params.add(movieId);
        if (userId != null) {
            from += " AND r.user_id = ?";
            params.add(userId);
        }
        long total = jdbc.sql("SELECT COUNT(*)" + from).params(params).query(Long.class).single();
        long offset = (long) (page - 1) * size;
        if (offset >= total) {
            return new ReviewPage(List.of(), page, size, total);
        }
        params.add(size);
        params.add(offset);
        var items = jdbc.sql("SELECT r.*, u.display_name" + from + " ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?")
                .params(params).query(REVIEW).list();
        return new ReviewPage(items, page, size, total);
    }

    Optional<Review> review(int movieId, int userId) {
        return jdbc.sql("SELECT r.*, u.display_name" + REVIEW_FROM + " AND r.user_id = ?")
                .params(movieId, userId).query(REVIEW).optional();
    }

    @Transactional
    public Review saveReview(int movieId, int userId, int stars, String content) {
        jdbc.sql("SELECT id FROM app_user WHERE id = ? FOR UPDATE").param(userId).query(Integer.class).single();
        jdbc.sql("""
                MERGE INTO review r
                USING (VALUES (CAST(? AS INTEGER), CAST(? AS INTEGER), CAST(? AS INTEGER), CAST(? AS VARCHAR))) v(movie_id, user_id, stars, content)
                ON r.movie_id = v.movie_id AND r.user_id = v.user_id
                WHEN MATCHED THEN UPDATE SET stars = v.stars, content = v.content, updated_at = CURRENT_TIMESTAMP
                WHEN NOT MATCHED THEN INSERT (movie_id, user_id, stars, content)
                    VALUES (v.movie_id, v.user_id, v.stars, v.content)
                """).params(movieId, userId, stars, content).update();
        return review(movieId, userId).orElseThrow();
    }

    @Transactional
    public Optional<Review> updateReview(int movieId, long reviewId, int userId, int stars, String content) {
        int updated = jdbc.sql("""
                UPDATE review SET stars = ?, content = ?, updated_at = CURRENT_TIMESTAMP
                WHERE movie_id = ? AND id = ? AND user_id = ?
                """).params(stars, content, movieId, reviewId, userId).update();
        return updated == 0 ? Optional.empty() : review(movieId, userId);
    }

    void deleteReview(int movieId, int userId) {
        jdbc.sql("DELETE FROM review WHERE movie_id = ? AND user_id = ?").params(movieId, userId).update();
    }

    Optional<Integer> reviewOwner(int movieId, long reviewId) {
        return jdbc.sql("SELECT user_id FROM review WHERE movie_id = ? AND id = ?")
                .params(movieId, reviewId).query(Integer.class).optional();
    }

    void deleteReviewById(int movieId, long reviewId, int userId) {
        jdbc.sql("DELETE FROM review WHERE movie_id = ? AND id = ? AND user_id = ?")
                .params(movieId, reviewId, userId).update();
    }
}
