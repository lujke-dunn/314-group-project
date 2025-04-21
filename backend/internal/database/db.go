package database

import (
	"fmt"
	"log"
	"os"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB *gorm.DB
)

// Initialize sets up the database connection
func Initialize() (*gorm.DB, error) {
	var err error

	// Set up logger for GORM
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			LogLevel: logger.Info,
			Colorful: true,
		},
	)

	// Create SQLite database connection
	dbPath := "./event_management.db"
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: newLogger,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	fmt.Println("Database connected successfully")
	return DB, nil
}

// GetDB returns the database connection
func GetDB() *gorm.DB {
	return DB
}