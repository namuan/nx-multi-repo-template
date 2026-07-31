package com.example.fleet.controller;

import com.example.fleet.action.AlertActions;
import com.example.fleet.domain.entity.Alert;
import com.example.fleet.domain.entity.AlertRule;
import com.example.fleet.dto.request.CreateAlertRuleRequest;
import com.example.fleet.dto.response.PageResponse;
import com.example.fleet.security.TenantContext;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification =
                "Service dependency is managed by Spring and not mutated by this controller.")
public class AlertController {

    private final AlertActions alertActions;

    public AlertController(AlertActions alertActions) {
        this.alertActions = alertActions;
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<PageResponse<Alert>> listAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                PageResponse.from(
                        alertActions.getAlerts(currentTenantId(), PageRequest.of(page, size))));
    }

    @GetMapping("/alerts/unacknowledged")
    public ResponseEntity<List<Alert>> unacknowledged() {
        return ResponseEntity.ok(alertActions.getUnacknowledgedAlerts(currentTenantId()));
    }

    @GetMapping("/alerts/count")
    public ResponseEntity<CountResponse> count() {
        return ResponseEntity.ok(
                new CountResponse(alertActions.getUnacknowledgedCount(currentTenantId())));
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Alert> acknowledge(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(alertActions.acknowledge(ctx.tenantId(), id, ctx.userId(), null));
    }

    // ── Alert Rules ───────────────────────────────────────────────────────────

    @GetMapping("/alert-rules")
    public ResponseEntity<List<AlertRule>> listRules() {
        return ResponseEntity.ok(alertActions.getRules(currentTenantId()));
    }

    @PostMapping("/alert-rules")
    public ResponseEntity<AlertRule> createRule(@Valid @RequestBody CreateAlertRuleRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.status(201)
                .body(alertActions.createRule(ctx.tenantId(), req, ctx.userId(), null));
    }

    @PatchMapping("/alert-rules/{id}/toggle")
    public ResponseEntity<AlertRule> toggleRule(
            @PathVariable UUID id, @RequestParam boolean active) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(
                alertActions.toggleRule(ctx.tenantId(), id, active, ctx.userId(), null));
    }

    @DeleteMapping("/alert-rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        alertActions.deleteRule(ctx.tenantId(), id, ctx.userId(), null);
        return ResponseEntity.noContent().build();
    }

    private UUID currentTenantId() {
        return TenantContext.get().tenantId();
    }

    record CountResponse(long count) {}
}
