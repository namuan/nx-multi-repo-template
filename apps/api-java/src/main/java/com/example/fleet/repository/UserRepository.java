package com.example.fleet.repository;

import com.example.fleet.domain.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    List<User> findAllByTenantId(UUID tenantId);

    boolean existsByEmail(String email);
}
