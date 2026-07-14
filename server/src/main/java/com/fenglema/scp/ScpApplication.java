package com.fenglema.scp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScpApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScpApplication.class, args);
    }
}
