package com.group20.movies;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = MovieController.class)
class MovieErrors {
    record ApiError(String error, String message) {}

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> apiError(ResponseStatusException exception) {
        String code = switch (exception.getStatusCode().value()) {
            case 404 -> "NOT_FOUND";
            case 401 -> "UNAUTHORIZED";
            default -> "INVALID_ARGUMENT";
        };
        return ResponseEntity.status(exception.getStatusCode()).body(new ApiError(code, exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> invalidType(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("INVALID_ARGUMENT", "参数格式不正确：" + exception.getName()));
    }
}
