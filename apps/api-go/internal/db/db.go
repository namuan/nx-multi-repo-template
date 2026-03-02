// Package db provides database connectivity helpers.
package db

import (
	"database/sql"
	"fmt"
	"time"

	// Register postgres driver for database/sql.
	_ "github.com/lib/pq"
)

// Connect opens and validates a PostgreSQL connection.
func Connect(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return db, nil
}
