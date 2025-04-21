// registration.go
package models

import (
	"errors"

	"gorm.io/gorm"
)

// RegistrationStatus defines the status of a registration
type RegistrationStatus string

const (
	RegistrationStatusPending   RegistrationStatus = "pending"
	RegistrationStatusConfirmed RegistrationStatus = "confirmed"
	RegistrationStatusCanceled  RegistrationStatus = "canceled"
)

// Registration represents a user's registration for an event
type Registration struct {
	Base
	UserID       uint               `json:"user_id"`
	EventID      uint               `json:"event_id"`
	TicketTypeID uint               `json:"ticket_type_id"`
	TotalPrice   float64            `gorm:"type:decimal(10,2);not null" json:"total_price"`
	Status       RegistrationStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`

	// Relationships
	User       User       `gorm:"foreignKey:UserID" json:"-"`
	Event      Event      `gorm:"foreignKey:EventID" json:"-"`
	TicketType TicketType `gorm:"foreignKey:TicketTypeID" json:"-"`
	Payments   []Payment  `gorm:"foreignKey:RegistrationID" json:"payments,omitempty"`
}

// TableName specifies the table name for Registration model
func (Registration) TableName() string {
	return "registrations"
}

// BeforeCreate is a GORM hook that's called before creating a registration
func (r *Registration) BeforeCreate(tx *gorm.DB) error {
	// Check if tickets are available
	var ticketType TicketType
	if err := tx.First(&ticketType, r.TicketTypeID).Error; err != nil {
		return err
	}

	availableQuantity, err := ticketType.GetAvailableQuantity(tx)
	if err != nil {
		return err
	}

	if availableQuantity <= 0 {
		return errors.New("no tickets available")
	}

	// Check if the ticket is on sale
	if !ticketType.IsOnSale() {
		return errors.New("tickets not on sale")
	}

	// Set the total price from the ticket type
	r.TotalPrice = ticketType.Price

	return nil
}

// Confirm confirms the registration
func (r *Registration) Confirm(db *gorm.DB) error {
	r.Status = RegistrationStatusConfirmed
	return db.Save(r).Error
}

// Cancel cancels the registration
func (r *Registration) Cancel(db *gorm.DB) error {
	r.Status = RegistrationStatusCanceled
	return db.Save(r).Error
}

// GetPayments returns payments for this registration
func (r *Registration) GetPayments(db *gorm.DB) ([]Payment, error) {
	var payments []Payment
	result := db.Where("registration_id = ?", r.ID).Find(&payments)
	return payments, result.Error
}

// FindRegistrationByID finds a registration by ID
func FindRegistrationByID(db *gorm.DB, id uint) (*Registration, error) {
	var registration Registration
	result := db.First(&registration, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &registration, nil
}

// FindRegistrationsByUser finds registrations by user
func FindRegistrationsByUser(db *gorm.DB, userID uint) ([]Registration, error) {
	var registrations []Registration
	result := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&registrations)
	return registrations, result.Error
}

// FindRegistrationsByEvent finds registrations by event
func FindRegistrationsByEvent(db *gorm.DB, eventID uint) ([]Registration, error) {
	var registrations []Registration
	result := db.Where("event_id = ?", eventID).Order("created_at DESC").Find(&registrations)
	return registrations, result.Error
}

// CreateRegistration creates a new registration
func CreateRegistration(db *gorm.DB, userID, eventID, ticketTypeID uint) (*Registration, error) {
	// Check if the ticket type belongs to the event
	var ticketType TicketType
	if err := db.Where("id = ? AND event_id = ?", ticketTypeID, eventID).First(&ticketType).Error; err != nil {
		return nil, errors.New("invalid ticket type for this event")
	}

	// Create the registration
	registration := Registration{
		UserID:       userID,
		EventID:      eventID,
		TicketTypeID: ticketTypeID,
		TotalPrice:   ticketType.Price,
		Status:       RegistrationStatusPending,
	}

	result := db.Create(&registration)
	if result.Error != nil {
		return nil, result.Error
	}

	return &registration, nil
}
