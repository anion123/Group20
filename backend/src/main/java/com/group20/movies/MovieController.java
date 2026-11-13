package com.group20.movies;

import java.math.BigDecimal;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/movies")
class MovieController {
    private static final Set<String> SORTS = Set.of("", "rank", "rating_desc", "year_desc");
    private final MovieRepository repository;

    MovieController(MovieRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    MoviePage list(@RequestParam(defaultValue = "1") int page,
                   @RequestParam(defaultValue = "25") int size,
                   @RequestParam(defaultValue = "") String keyword,
                   @RequestParam(defaultValue = "") String region,
                   @RequestParam(defaultValue = "") String genre,
                   @RequestParam(required = false) BigDecimal minRating,
                   @RequestParam(required = false) BigDecimal maxRating,
                   @RequestParam(defaultValue = "") String sort,
                   @RequestParam(defaultValue = "") String chart,
                   @RequestParam(defaultValue = "false") boolean unwatched) {
        if (page < 1 || size < 1 || size > 250) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page 从 1 开始，size 必须在 1 到 250 之间。");
        }
        if (!SORTS.contains(sort) || !(chart.isEmpty() || chart.equals("new"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不支持的 sort 或 chart。");
        }
        if (invalidRating(minRating) || invalidRating(maxRating)
                || (minRating != null && maxRating != null && minRating.compareTo(maxRating) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "评分范围须在 0 到 10 之间，且最低分不得高于最高分。");
        }
        if (unwatched) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请登录后筛选未看过的电影。");
        }
        return repository.findPage(new MovieQuery(page, size, keyword.strip(), region.strip(), genre.strip(),
                minRating, maxRating, sort, chart));
    }

    @GetMapping("/{id}")
    Movie detail(@PathVariable int id) {
        return repository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到这部电影。"));
    }

    private static boolean invalidRating(BigDecimal rating) {
        return rating != null && (rating.signum() < 0 || rating.compareTo(BigDecimal.TEN) > 0);
    }
}
