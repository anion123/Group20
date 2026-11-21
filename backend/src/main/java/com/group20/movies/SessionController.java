package com.group20.movies;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/session")
class SessionController {
    private static final String SESSION_USER = "group20.user";
    private final JdbcClient jdbc;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final String missingAccountHash = passwords.encode("missing-account");

    SessionController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    record User(int id, String displayName) {}
    record Credentials(String username, String password) {}
    record SessionResponse(User user) {}
    private record Account(User user, String hash) {}

    @PostMapping
    SessionResponse login(@RequestBody Credentials credentials, HttpServletRequest request) {
        String username = credentials.username();
        String password = credentials.password();
        if (username == null || username.isBlank() || username.length() > 64
                || password == null || password.isEmpty()
                || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入有效的用户名和密码。");
        }
        var account = jdbc.sql("SELECT id, display_name, password_hash FROM app_user WHERE username = ?")
                .param(username.strip())
                .query((row, n) -> new Account(new User(row.getInt("id"), row.getString("display_name")),
                        row.getString("password_hash")))
                .optional();
        boolean matches = passwords.matches(password, account.map(Account::hash).orElse(missingAccountHash));
        if (!matches || account.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码不正确。");
        }

        HttpSession previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        User user = account.orElseThrow().user();
        request.getSession(true).setAttribute(SESSION_USER, user);
        return new SessionResponse(user);
    }

    @GetMapping
    SessionResponse current(HttpServletRequest request) {
        return new SessionResponse(requireUser(request));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    static User requireUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(SESSION_USER) instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录。");
    }
}
