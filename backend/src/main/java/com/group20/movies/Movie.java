package com.group20.movies;

import java.math.BigDecimal;
import java.util.List;

record Movie(int id, String title, String originalTitle, int year, String region, List<String> genres,
             String director, BigDecimal originalRating, Integer rank, Integer newChartRank,
             String posterUrl, String synopsis, String mediaType, String releaseStatus, boolean playable) {
}
