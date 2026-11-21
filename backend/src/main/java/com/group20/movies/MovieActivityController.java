package com.group20.movies;

import jakarta.servlet.http.HttpServletRequest;
import tools.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/movies/{movieId}")
class MovieActivityController {
    private final MovieActivityRepository activity;
    private final MovieRepository movies;

    MovieActivityController(MovieActivityRepository activity, MovieRepository movies) {
        this.activity = activity;
        this.movies = movies;
    }

    enum Status { WANT, WATCHED }

    record MovieStatus(int movieId, Status status) {}
    record ReviewRequest(int stars, String content) {}

    @GetMapping("/status")
    MovieStatus getStatus(@PathVariable int movieId, HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        checkMovie(movieId);
        return new MovieStatus(movieId, activity.status(movieId, userId));
    }

    @PutMapping("/status")
    MovieStatus putStatus(@PathVariable int movieId, @RequestBody JsonNode body,
                          HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        checkMovie(movieId);
        var value = body.get("status");
        if (value == null || !(value.isNull() || value.isString())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status 须为 WANT、WATCHED 或 null。");
        }
        Status status = null;
        if (!value.isNull()) {
            try {
                status = Status.valueOf(value.asString());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status 须为 WANT、WATCHED 或 null。");
            }
        }
        activity.setStatus(movieId, userId, status);
        return new MovieStatus(movieId, status);
    }

    @GetMapping("/reviews")
    MovieActivityRepository.ReviewPage reviews(@PathVariable int movieId,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "0") int stars, @RequestParam(defaultValue = "false") boolean mine,
            HttpServletRequest request) {
        checkMovie(movieId);
        if (page < 1 || size < 1 || size > 250 || !(stars == 0 || stars == 1 || stars == 3 || stars == 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "短评分页或星级筛选参数无效。");
        }
        Integer userId = mine ? SessionController.requireUser(request).id() : null;
        return activity.reviews(movieId, page, size, stars, userId);
    }

    @GetMapping("/review")
    MovieActivityRepository.Review myReview(@PathVariable int movieId, HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        checkMovie(movieId);
        return activity.review(movieId, userId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "你还没有发表短评。"));
    }

    @PutMapping("/review")
    MovieActivityRepository.Review saveReview(@PathVariable int movieId, @RequestBody JsonNode body,
                                              HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        checkMovie(movieId);
        var input = reviewInput(body);
        return activity.saveReview(movieId, userId, input.stars(), input.content());
    }

    @DeleteMapping("/review")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteReview(@PathVariable int movieId, HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        checkMovie(movieId);
        activity.deleteReview(movieId, userId);
    }

    @PutMapping("/reviews/{reviewId}")
    MovieActivityRepository.Review updateReview(@PathVariable int movieId, @PathVariable long reviewId,
                                                @RequestBody JsonNode body, HttpServletRequest request) {
        int userId = checkReviewOwner(movieId, reviewId, request);
        var input = reviewInput(body);
        return activity.updateReview(movieId, reviewId, userId, input.stars(), input.content()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到这条短评。"));
    }

    @DeleteMapping("/reviews/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteReviewById(@PathVariable int movieId, @PathVariable long reviewId, HttpServletRequest request) {
        int userId = checkReviewOwner(movieId, reviewId, request);
        activity.deleteReviewById(movieId, reviewId, userId);
    }

    private int checkReviewOwner(int movieId, long reviewId, HttpServletRequest request) {
        int userId = SessionController.requireUser(request).id();
        int owner = activity.reviewOwner(movieId, reviewId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到这条短评。"));
        if (owner != userId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能修改或删除自己的短评。");
        }
        return userId;
    }

    private ReviewRequest reviewInput(JsonNode body) {
        var stars = body.path("stars");
        var text = body.path("content");
        String content = text.isString() ? text.asString().strip() : "";
        if (!stars.isIntegralNumber() || !stars.canConvertToInt() || stars.asInt() < 1 || stars.asInt() > 5
                || content.isEmpty() || content.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请给出 1 至 5 星及 1 至 500 字的短评。");
        }
        return new ReviewRequest(stars.asInt(), content);
    }

    private void checkMovie(int movieId) {
        if (movies.findById(movieId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到这部电影。");
        }
    }
}
