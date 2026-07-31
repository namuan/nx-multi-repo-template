package com.example.fleet;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = FleetApplication.class)
@ActiveProfiles("test")
class FleetApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring application context starts successfully
    }
}
