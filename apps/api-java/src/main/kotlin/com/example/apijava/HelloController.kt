package com.example.apijava

import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class MessageResponse(val message: String)

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = ["*"])
class HelloController {
    @GetMapping("/hello")
    fun hello(): MessageResponse = MessageResponse(message = "Hello from Java API!")
}
