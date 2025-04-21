// event model
package models

import (
	"time"
	"gorm.io/gorm"
)

type Event struct {
	Base
	UserID         uint          `gorm:"not null" json:"user_id"`
	CategoryID     *uint         `json:"category_id"`
	Title          string        `gorm:"type:varchar(255);not null" json:"title"`
	Description    string        `gorm:"type:text" json:"description"`
	Venue          string        `gorm:"type:varchar(255)" json:"venue"`
	StartDatetime  time.Time     `json:"start_datetime"`
	EndDatetime    time.Time     `json:"end_datetime"`
	City           string        `gorm:"type:varchar(100)" json:"city"`
	State          string        `gorm:"type:varchar(100)" json:"state"`
	Address        string        `gorm:"type:varchar(255)" json:"address"`
	ZipCode        string        `gorm:"type:varchar(20)" json:"zip_code"`
	Country        string        `gorm:"type:varchar(100)" json:"country"`
	IsVirtual      bool          `gorm:"default:false" json:"is_virtual"`
	IsPublished    bool          `gorm:"default:false" json:"is_published"`
	IsCanceled     bool          `gorm:"default:false" json:"is_canceled"`
	
	// Relationships
	User           User          `gorm:"foreignKey:UserID" json:"-"`
	TicketTypes    []TicketType  `gorm:"foreignKey:EventID" json:"ticket_types,omitempty"`
	Updates        []EventUpdate `gorm:"foreignKey:EventID" json:"updates,omitempty"`
	Registrations  []Registration `gorm:"foreignKey:EventID" json:"registrations,omitempty"`
	Feedbacks      []EventFeedback `gorm:"foreignKey:EventID" json:"feedbacks,omitempty"`
}

func (Event) TableName() string {
	return "events"
}

// Publish marks the event as published
func (e *Event) Publish(db *gorm.DB) error {
	e.IsPublished = true
	return db.Save(e).Error
}

// Cancel marks the event as canceled
func (e *Event) Cancel(db *gorm.DB) error {
	e.IsCanceled = true
	return db.Save(e).Error
}

// AddTicketType adds a new ticket type to the event
func (e *Event) AddTicketType(db *gorm.DB, name, description string, price float64, quantityAvailable int, isVIP bool, saleStartDate, saleEndDate *time.Time) (*TicketType, error) {
	ticketType := TicketType{
		EventID:           e.ID,
		Name:              name,
		Description:       description,
		Price:             price,
		QuantityAvailable: quantityAvailable,
		IsVIP:             isVIP,
		SaleStartDate:     saleStartDate,
		SaleEndDate:       saleEndDate,
	}
	
	result := db.Create(&ticketType)
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &ticketType, nil
}

// FindEventByID finds an event by ID
func FindEventByID(db *gorm.DB, id uint) (*Event, error) {
	var event Event
	result := db.First(&event, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &event, nil
}

// FindEventsByUser finds events created by a specific user
func FindEventsByUser(db *gorm.DB, userID uint) ([]Event, error) {
	var events []Event
	result := db.Where("user_id = ?", userID).Find(&events)
	return events, result.Error
}

// FindPublishedEvents finds all published events
func FindPublishedEvents(db *gorm.DB) ([]Event, error) {
	var events []Event
	result := db.Where("is_published = ? AND is_canceled = ?", true, false).Find(&events)
	return events, result.Error
}

// FindUpcomingEvents finds upcoming events
func FindUpcomingEvents(db *gorm.DB, limit int) ([]Event, error) {
	var events []Event
	
	now := time.Now()
	result := db.Where("start_datetime > ? AND is_published = ? AND is_canceled = ?", 
		now, true, false).
		Order("start_datetime").
		Limit(limit).
		Find(&events)
	
	return events, result.Error
}