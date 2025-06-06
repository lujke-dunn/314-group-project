package models

import (
	"gorm.io/gorm"
)

type EventUpdate struct {
	Base
	EventID     uint   `json:"event_id"`
	Title       string `gorm:"type:varchar(255);not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`
	

	Event Event `gorm:"foreignKey:EventID" json:"-"`
}

func (EventUpdate) TableName() string {
	return "event_updates"
}

func FindUpdatesByEvent(db *gorm.DB, eventID uint) ([]EventUpdate, error) {
	var updates []EventUpdate
	result := db.Where("event_id = ?", eventID).Order("created_at DESC").Find(&updates)
	return updates, result.Error
}

func FindUpdateByID(db *gorm.DB, id uint) (*EventUpdate, error) {
	var update EventUpdate
	result := db.First(&update, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &update, nil
}

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