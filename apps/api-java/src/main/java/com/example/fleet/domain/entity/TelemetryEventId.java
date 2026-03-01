package com.example.fleet.domain.entity;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key for TelemetryEvent.
 * Required because the partitioned table's PK is (id, recorded_at).
 */
public class TelemetryEventId implements Serializable {

    private UUID id;
    private Instant recordedAt;

    public TelemetryEventId() {}

    public TelemetryEventId(UUID id, Instant recordedAt) {
        this.id = id;
        this.recordedAt = recordedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TelemetryEventId other)) return false;
        return Objects.equals(id, other.id) && Objects.equals(recordedAt, other.recordedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, recordedAt);
    }
}
