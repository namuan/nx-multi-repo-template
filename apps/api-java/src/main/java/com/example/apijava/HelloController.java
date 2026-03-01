package com.example.apijava;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HelloController {

  @GetMapping("/hello")
  public MessageResponse hello() {
    return new MessageResponse("Hello from Java API!");
  }
}
