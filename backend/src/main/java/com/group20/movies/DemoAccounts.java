package com.group20.movies;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
class DemoAccounts {
    @Bean
    ApplicationRunner importDemoAccounts(JdbcClient jdbc, TransactionTemplate transaction) {
        return args -> transaction.executeWithoutResult(result -> {
            var passwords = new BCryptPasswordEncoder();
            for (int id = 1; id <= 3; id++) {
                String username = "demo" + id;
                if (jdbc.sql("SELECT id FROM app_user WHERE username = ?").param(username).query(Integer.class).optional().isEmpty()) {
                    jdbc.sql("INSERT INTO app_user (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)")
                            .params(id, username, "演示用户" + id, passwords.encode("demo123")).update();
                }
            }
        });
    }
}
