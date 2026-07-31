package com.example.fleet.controller;

import com.example.fleet.action.AuthActions;
import com.example.fleet.dto.request.LoginRequest;
import com.example.fleet.dto.request.RegisterTenantRequest;
import com.example.fleet.dto.response.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthActions authActions;

    public AuthController(AuthActions authActions) {
        this.authActions = authActions;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest req, HttpServletRequest httpReq) {
        return ResponseEntity.ok(authActions.login(req, httpReq.getRemoteAddr()));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterTenantRequest req, HttpServletRequest httpReq) {
        return ResponseEntity.status(201)
                .body(authActions.registerTenant(req, httpReq.getRemoteAddr()));
    }
}
