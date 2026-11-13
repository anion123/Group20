package com.group20.movies;

import java.util.List;

record MoviePage(List<Movie> items, int page, int size, long total) {
}
