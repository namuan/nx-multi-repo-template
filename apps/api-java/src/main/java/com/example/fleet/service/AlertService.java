package com.example.fleet.service;

import com.example.fleet.domain.entity.Alert;
import com.example.fleet.domain.entity.AlertRule;
import com.example.fleet.dto.request.CreateAlertRuleRequest;
import com.example.fleet.repository.AlertRepository;
import com.example.fleet.repository.AlertRuleRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AlertService {

    private final AlertRepository alertRepo;
    private final AlertRuleRepository ruleRepo;
    private final AuditLogService auditLog;

    public AlertService(
            AlertRepository alertRepo, AlertRuleRepository ruleRepo, AuditLogService auditLog) {
        this.alertRepo = alertRepo;
        this.ruleRepo = ruleRepo;
        this.auditLog = auditLog;
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    public Page<Alert> getAlerts(UUID tenantId, Pageable pageable) {
        return alertRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
    }

    public List<Alert> getUnacknowledgedAlerts(UUID tenantId) {
        return alertRepo.findAllByTenantIdAndAcknowledgedFalseOrderByCreatedAtDesc(tenantId);
    }

    public long getUnacknowledgedCount(UUID tenantId) {
        return alertRepo.countUnacknowledgedByTenantId(tenantId);
    }

    public Alert acknowledge(UUID tenantId, UUID alertId, UUID actorId, String actorEmail) {
        Alert alert =
                alertRepo
                        .findByIdAndTenantId(alertId, tenantId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Alert not found"));

        if (alert.isAcknowledged()) {
            return alert;
        }

        alert.setAcknowledged(true);
        alert.setAcknowledgedBy(actorId);
        alert.setAcknowledgedAt(Instant.now());
        alert = alertRepo.save(alert);

        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "ALERT_ACKNOWLEDGED",
                "alert",
                alertId.toString(),
                null,
                null);
        return alert;
    }

    // ── Alert Rules ───────────────────────────────────────────────────────────

    public List<AlertRule> getRules(UUID tenantId) {
        return ruleRepo.findAllByTenantId(tenantId);
    }

    public AlertRule createRule(
            UUID tenantId, CreateAlertRuleRequest req, UUID actorId, String actorEmail) {
        AlertRule rule = new AlertRule();
        rule.setTenantId(tenantId);
        rule.setName(req.name());
        rule.setType(req.type());
        rule.setThreshold(req.threshold());
        rule.setSeverity(req.severity() != null ? req.severity() : "warning");
        rule = ruleRepo.save(rule);

        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "ALERT_RULE_CREATED",
                "alert_rule",
                rule.getId().toString(),
                null,
                null);
        return rule;
    }

    public AlertRule toggleRule(
            UUID tenantId, UUID ruleId, boolean active, UUID actorId, String actorEmail) {
        AlertRule rule =
                ruleRepo.findByIdAndTenantId(ruleId, tenantId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Rule not found"));
        rule.setActive(active);
        rule = ruleRepo.save(rule);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                active ? "ALERT_RULE_ENABLED" : "ALERT_RULE_DISABLED",
                "alert_rule",
                ruleId.toString(),
                null,
                null);
        return rule;
    }

    public void deleteRule(UUID tenantId, UUID ruleId, UUID actorId, String actorEmail) {
        AlertRule rule =
                ruleRepo.findByIdAndTenantId(ruleId, tenantId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Rule not found"));
        ruleRepo.delete(rule);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "ALERT_RULE_DELETED",
                "alert_rule",
                ruleId.toString(),
                null,
                null);
    }
}
