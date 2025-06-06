package models

import (
	"gorm.io/gorm"
)


type EventCategory struct {
	Base
	Name        string  `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Events      []Event `gorm:"foreignKey:CategoryID" json:"-"`
}



func (EventCategory) TableName() string {
	return "event_categories"
}


func (c *EventCategory) GetEvents(db *gorm.DB) ([]Event, error) {
	var events []Event
	result := db.Where("category_id = ? AND is_published = ? AND is_canceled = ?",
		c.ID, true, false).
		Order("start_datetime").
		Find(&events)

	return events, result.Error
}


func FindCategoryByID(db *gorm.DB, id uint) (*EventCategory, error) {
	var category EventCategory
	result := db.First(&category, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}


func FindCategoryByName(db *gorm.DB, name string) (*EventCategory, error) {
	var category EventCategory
	result := db.Where("name = ?", name).First(&category)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}


func GetAllCategories(db *gorm.DB) ([]EventCategory, error) {
	var categories []EventCategory
	result := db.Order("name").Find(&categories)
	return categories, result.Error
}
