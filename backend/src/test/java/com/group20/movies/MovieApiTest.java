package com.group20.movies;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:movies-test")
@AutoConfigureMockMvc
class MovieApiTest {
    @Autowired
    private MockMvc http;

    @Test
    void listUsesOneBasedPagesAndStableTotals() throws Exception {
        http.perform(get("/api/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(25))
                .andExpect(jsonPath("$.items.length()").value(25))
                .andExpect(jsonPath("$.items[0].id").value(1));
        http.perform(get("/api/movies").param("page", "2").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items[0].id").value(2))
                .andExpect(jsonPath("$.total").value(89));
        http.perform(get("/api/movies").param("size", "250"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(89));
        http.perform(get("/api/movies").param("page", "2147483647"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.total").value(89));
    }

    @Test
    void searchesAcrossMovieFieldsAndAppliesFiltersBeforePaging() throws Exception {
        http.perform(get("/api/movies").param("keyword", "  SHAWSHANK ")
                        .param("region", "美国").param("genre", "犯罪").param("minRating", "9.7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.total").value(1));
        http.perform(get("/api/movies").param("keyword", "詹姆斯·卡梅隆").param("maxRating", "9.5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(3));
        http.perform(get("/api/movies").param("keyword", "%_"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void keepsRankAndNewChartSeparate() throws Exception {
        http.perform(get("/api/movies").param("sort", "rank").param("page", "2").param("size", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].rank").value(26));
        http.perform(get("/api/movies").param("chart", "new").param("page", "2").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.items[0].id").value(103))
                .andExpect(jsonPath("$.items[0].newChartRank").value(3))
                .andExpect(jsonPath("$.items[0].rank").value((Object) null));
    }

    @Test
    void returnsFrozenFieldsAndPreservesFrontendMetadata() throws Exception {
        http.perform(get("/api/movies/6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("给阿嬷的情书"))
                .andExpect(jsonPath("$.genres[1]").value("家庭"))
                .andExpect(jsonPath("$.originalRating").value(9.3))
                .andExpect(jsonPath("$.rank").value((Object) null))
                .andExpect(jsonPath("$.newChartRank").value((Object) null));
        http.perform(get("/api/movies/256"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mediaType").value("tv"))
                .andExpect(jsonPath("$.releaseStatus").value("showing"))
                .andExpect(jsonPath("$.playable").isBoolean());
        http.perform(get("/api/movies/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
        http.perform(get("/api/movies/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_ARGUMENT"));
    }

    @Test
    void validatesQueryParameters() throws Exception {
        for (String[] pair : new String[][]{{"page", "0"}, {"size", "251"}, {"page", "text"},
                {"sort", "random"}, {"chart", "old"}, {"minRating", "-1"}, {"maxRating", "11"}}) {
            http.perform(get("/api/movies").param(pair[0], pair[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("INVALID_ARGUMENT"))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
        http.perform(get("/api/movies").param("minRating", "8").param("maxRating", "7"))
                .andExpect(status().isBadRequest());
        http.perform(get("/api/movies").param("unwatched", "true"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void servesTheExistingFrontendOnTheApiOrigin() throws Exception {
        http.perform(get("/")).andExpect(status().isOk());
        http.perform(get("/search.html")).andExpect(status().isOk());
        http.perform(get("/assets/data/demo-movies.json")).andExpect(status().isOk());
    }
}
