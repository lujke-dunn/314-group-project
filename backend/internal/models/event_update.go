// eventupdate.go
package models

import (
	"gorm.io/gorm"
)

// EventUpdate represents an update or announcement for an event
type EventUpdate struct {
	Base
	EventID     uint   `json:"event_id"`
	Title       string `gorm:"type:varchar(255);not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`
	
	// Relationships
	Event Event `gorm:"foreignKey:EventID" json:"-"`
}

// TableName specifies the table name for EventUpdate model
func (EventUpdate) TableName() string {
	return "event_updates"
}

// FindUpdatesByEvent finds updates for a specific event
func FindUpdatesByEvent(db *gorm.DB, eventID uint) ([]EventUpdate, error) {
	var updates []EventUpdate
	result := db.Where("event_id = ?", eventID).Order("created_at DESC").Find(&updates)
	return updates, result.Error
}

// FindUpdateByID finds an update by ID
func FindUpdateByID(db *gorm.DB, id uint) (*EventUpdate, error) {
	var update EventUpdate
	result := db.First(&update, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &update, nil
}

// CreateEventUpdate creates a new update for an event
func CreateEventUpdate(db *gorm.DB, eventID uint, title, description string) (*EventUpdate, error) {
	update := EventUpdate{
		EventID:     eventID,
		Title:       title,
		Description: description,
	}
	
	result := db.Create(&update)
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &update, nil
}