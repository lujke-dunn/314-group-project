package database

import (
	"lujke-dunn/314-group-project/backend/internal/models"
)

// Creates tanles based on the schemas provided in models
func MigrateSchema() error {
	if DB == nil {
		return nil
	}
	
	err := DB.AutoMigrate(
		&models.User{},
		&models.Event{},
		&models.EventCategory{},
		&models.TicketType{},
		&models.Registration{},
		&models.Payment{},
		&models.Notification{},
		&models.EventUpdate{},
		&models.EventFeedback{},
	)

	return err
}