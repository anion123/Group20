package com.group20.movies;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
class MovieRepository {
    private static final RowMapper<Movie> MOVIE = (row, index) -> new Movie(
            row.getInt("id"), row.getString("title"), row.getString("original_title"),
            row.getInt("release_year"), row.getString("region"),
            Arrays.stream((Object[]) row.getArray("genres").getArray()).map(String.class::cast).toList(),
            row.getString("director"), row.getBigDecimal("original_rating"),
            row.getObject("top_rank", Integer.class), row.getObject("new_chart_rank", Integer.class),
            row.getString("poster_url"), row.getString("synopsis"), row.getString("media_type"),
            row.getString("release_status"), row.getBoolean("playable")
    );

    private final JdbcClient jdbc;

    MovieRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Optional<Movie> findById(int id) {
        return jdbc.sql("SELECT * FROM movie WHERE id = ?").param(id).query(MOVIE).optional();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public MoviePage findPage(MovieQuery query) {
        var conditions = new ArrayList<String>();
        var params = new ArrayList<Object>();
        if (!query.keyword().isEmpty()) {
            conditions.add("LOCATE(?, search_text) > 0");
            params.add(query.keyword().toLowerCase(Locale.ROOT));
        }
        if (!query.region().isEmpty()) {
            conditions.add("region = ?");
            params.add(query.region());
        }
        if (!query.genre().isEmpty()) {
            conditions.add("ARRAY_CONTAINS(genres, ?)");
            params.add(query.genre());
        }
        if (query.minRating() != null) {
            conditions.add("original_rating >= ?");
            params.add(query.minRating());
        }
        if (query.maxRating() != null) {
            conditions.add("original_rating <= ?");
            params.add(query.maxRating());
        }
        if (query.sort().equals("rank")) {
            conditions.add("top_rank IS NOT NULL");
        }
        if (query.chart().equals("new")) {
            conditions.add("new_chart_rank IS NOT NULL");
        }

        String from = " FROM movie";
        if (!conditions.isEmpty()) {
            from += " WHERE " + String.join(" AND ", conditions);
        }
        long total = jdbc.sql("SELECT COUNT(*)" + from).params(params).query(Long.class).single();
        long offset = (long) (query.page() - 1) * query.size();
        if (offset >= total) {
            return new MoviePage(List.of(), query.page(), query.size(), total);
        }

        String order = query.chart().equals("new") ? "new_chart_rank, id" : switch (query.sort()) {
            case "rank" -> "top_rank, id";
            case "rating_desc" -> "original_rating DESC NULLS LAST, id";
            case "year_desc" -> "release_year DESC, id";
            default -> "id";
        };
        params.add(query.size());
        params.add(offset);
        var items = jdbc.sql("SELECT *" + from + " ORDER BY " + order + " LIMIT ? OFFSET ?")
                .params(params).query(MOVIE).list();
        return new MoviePage(items, query.page(), query.size(), total);
    }

    @Transactional
    public void seedIfEmpty(List<Movie> movies) {
        if (jdbc.sql("SELECT COUNT(*) FROM movie").query(Long.class).single() != 0) {
            return;
        }
        for (Movie movie : movies) {
            String searchText = String.join(" ", movie.title(), movie.originalTitle(), movie.director(),
                    movie.region(), String.join(" ", movie.genres())).toLowerCase(Locale.ROOT);
            jdbc.sql("""
                    INSERT INTO movie (id, title, original_title, release_year, region, genres, director,
                                       original_rating, top_rank, new_chart_rank, poster_url, synopsis,
                                       media_type, release_status, playable, search_text)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """)
                    .params(Arrays.asList(movie.id(), movie.title(), movie.originalTitle(), movie.year(),
                            movie.region(), new SqlArrayValue("VARCHAR", movie.genres().toArray()),
                            movie.director(), movie.originalRating(), movie.rank(), movie.newChartRank(),
                            movie.posterUrl(), movie.synopsis(), movie.mediaType(), movie.releaseStatus(),
                            movie.playable(), searchText))
                    .update();
        }
    }
}
