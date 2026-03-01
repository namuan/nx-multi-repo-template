package com.example.apijava

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(HelloController::class)
class HelloControllerTest {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `hello endpoint returns message`() {
        mockMvc.get("/api/hello")
            .andExpect {
                status { isOk() }
                jsonPath("$.message") { value("Hello from Java API!") }
            }
    }
}
