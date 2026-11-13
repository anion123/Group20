package com.group20.movies;

import java.math.BigDecimal;

record MovieQuery(int page, int size, String keyword, String region, String genre,
                  BigDecimal minRating, BigDecimal maxRating, String sort, String chart) {
}
