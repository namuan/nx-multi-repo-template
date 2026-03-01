package com.example.fleet.controller;

import com.example.fleet.domain.entity.Alert;
import com.example.fleet.domain.entity.AlertRule;
import com.example.fleet.dto.request.CreateAlertRuleRequest;
import com.example.fleet.security.TenantContext;
import com.example.fleet.service.AlertService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<Page<Alert>> listAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                alertService.getAlerts(currentTenantId(), PageRequest.of(page, size)));
    }

    @GetMapping("/alerts/unacknowledged")
    public ResponseEntity<List<Alert>> unacknowledged() {
        return ResponseEntity.ok(alertService.getUnacknowledgedAlerts(currentTenantId()));
    }

    @GetMapping("/alerts/count")
    public ResponseEntity<CountResponse> count() {
        return ResponseEntity.ok(
                new CountResponse(alertService.getUnacknowledgedCount(currentTenantId())));
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Alert> acknowledge(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(alertService.acknowledge(ctx.tenantId(), id, ctx.userId(), null));
    }

    // ── Alert Rules ───────────────────────────────────────────────────────────

    @GetMapping("/alert-rules")
    public ResponseEntity<List<AlertRule>> listRules() {
        return ResponseEntity.ok(alertService.getRules(currentTenantId()));
    }

    @PostMapping("/alert-rules")
    public ResponseEntity<AlertRule> createRule(@Valid @RequestBody CreateAlertRuleRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.status(201).body(
                alertService.createRule(ctx.tenantId(), req, ctx.userId(), null));
    }

    @PatchMapping("/alert-rules/{id}/toggle")
    public ResponseEntity<AlertRule> toggleRule(@PathVariable UUID id, @RequestParam boolean active) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(alertService.toggleRule(ctx.tenantId(), id, active, ctx.userId(), null));
    }

    @DeleteMapping("/alert-rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        alertService.deleteRule(ctx.tenantId(), id, ctx.userId(), null);
        return ResponseEntity.noContent().build();
    }

    private UUID currentTenantId() {
        return TenantContext.get().tenantId();
    }

    record CountResponse(long count) {}
}
