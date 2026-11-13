package com.group20.movies;

import java.util.List;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Configuration
class MovieSeed {
    @Bean
    ApplicationRunner importDemoMovies(MovieRepository repository, JsonMapper json) {
        return args -> {
            var source = new ClassPathResource("static/assets/data/demo-movies.json");
            try (var input = source.getInputStream()) {
                List<Movie> movies = json.readValue(input, new TypeReference<List<Movie>>() {});
                repository.seedIfEmpty(movies);
            }
        };
    }
}
