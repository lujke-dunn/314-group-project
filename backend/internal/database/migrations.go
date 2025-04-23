// migrations.go
package database

import (
	"fmt"
	"lujke-dunn/314-group-project/backend/internal/models"
)

// MigrateSchema creates tables based on the schemas provided in models
func MigrateSchema() error {
	if DB == nil {
		return nil
	}

	// Enable foreign keys
	DB.Exec("PRAGMA foreign_keys = ON")

	// First, migrate basic models without dependencies
	if err := DB.AutoMigrate(&models.User{}); err != nil {
		return fmt.Errorf("failed to migrate user model: %w ", err)
	}

	if err := DB.AutoMigrate(&models.EventCategory{}); err != nil {
		return fmt.Errorf("failed to migrate event cat model %w", err)
	}

	if err := DB.AutoMigrate(&models.Event{}); err != nil {
		return fmt.Errorf("failed to migrate event model %w", err)
	}

	err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS ticket_types (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			event_id INTEGER NOT NULL,
			name VARCHAR(100) NOT NULL,
			description TEXT,
			price NUMERIC(10,2) NOT NULL,
			quantity_available INTEGER NOT NULL,
			is_vip BOOLEAN DEFAULT 0,
			sale_start_date DATETIME,
			sale_end_date DATETIME,
			FOREIGN KEY (event_id) REFERENCES events(id)
		);
		CREATE INDEX IF NOT EXISTS idx_ticket_types_deleted_at ON ticket_types(deleted_at);
	`).Error

	if err != nil {
		return fmt.Errorf("failed to create ticket_types table: %w", err)
	}

	//return nil

	// Comment out the rest for now so sad migration no workok

	err = DB.Exec(`
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME,
            updated_at DATETIME,
            deleted_at DATETIME,
            user_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            ticket_type_id INTEGER NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
        );
        CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at ON registrations(deleted_at);
    `).Error

	if err != nil {
		return fmt.Errorf("failed to create registrations table: %w", err)
	}

	err = DB.Exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME,
            updated_at DATETIME,
            deleted_at DATETIME,
            registration_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            method VARCHAR(20),
            transaction_id VARCHAR(255),
            payment_date DATETIME,
            FOREIGN KEY (registration_id) REFERENCES registrations(id)
        );
        CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
    `).Error

	if err != nil {
		return fmt.Errorf("failed to create payments table: %w", err)
	}

	err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS event_feedbacks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME, 
			event_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			rating INTEGER NOT NULL, 
			comment TEXT,
			FOREIGN KEY (event_id) REFERENCES events(id),
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`).Error

	if err != nil {
		return fmt.Errorf("failed to create event feedback table: %w", err)
	}

	return nil

	/*

		if err := DB.AutoMigrate(&models.Notification{}); err != nil {
			return err
		}

		if err := DB.AutoMigrate(&models.EventFeedback{}); err != nil {
			return err
		}

		return nil
	*/
}
