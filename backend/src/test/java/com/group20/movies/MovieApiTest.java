package com.group20.movies;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    @Test
    void rejectsAnonymousAndNonOwnerReviewWrites() throws Exception {
        String input = """
                {"stars":4,"content":"测试四星短评。"}
                """;
        http.perform(put("/api/movies/6/review").contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isUnauthorized());
        MockHttpSession author = login("demo1");
        MockHttpSession other = login("demo2");
        http.perform(put("/api/movies/6/review").session(author).contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stars").value(4))
                .andExpect(jsonPath("$.userId").value(1));
        var json = new tools.jackson.databind.json.JsonMapper();
        var review = http.perform(get("/api/movies/6/review").session(author))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        String route = "/api/movies/6/reviews/" + json.readTree(review).path("id").asLong();
        http.perform(put(route).session(other).contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        http.perform(delete(route).session(other)).andExpect(status().isForbidden());
        http.perform(delete(route).session(author)).andExpect(status().isNoContent());
        http.perform(get("/api/movies/6/reviews")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void combinesFiltersAndExcludesOnlyTheCurrentUsersWatchedMovies() throws Exception {
        MockHttpSession first = login("demo1");
        MockHttpSession second = login("demo2");
        http.perform(put("/api/movies/1/status").session(first).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"WATCHED\"}")).andExpect(status().isOk());
        String route = "/api/movies?keyword=Shawshank&region=美国&genre=犯罪&minRating=9&maxRating=10&sort=rating_desc&unwatched=true";
        http.perform(get(route).session(first)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        http.perform(get(route).session(second)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].id").value(1));
        http.perform(put("/api/movies/1/status").session(first).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":null}")).andExpect(status().isOk());
        http.perform(get(route).session(first)).andExpect(jsonPath("$.total").value(1));
    }

    private MockHttpSession login(String username) throws Exception {
        var request = http.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"demo123"}
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn().getRequest();
        return (MockHttpSession) request.getSession(false);
    }
}
