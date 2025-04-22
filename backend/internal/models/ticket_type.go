// ticket_type.go
package models

import (
	"time"

	"gorm.io/gorm"
)

// TicketType represents a type of ticket for an event
type TicketType struct {
	Base
	EventID           uint       `json:"event_id"`
	Name              string     `gorm:"type:varchar(100);not null" json:"name"`
	Description       string     `gorm:"type:text" json:"description"`
	Price             float64    `gorm:"type:numeric(10,2);not null" json:"price"`
	QuantityAvailable int        `gorm:"not null" json:"quantity_available"`
	IsVIP             bool       `gorm:"default:false" json:"is_vip"`
	SaleStartDate     *time.Time `gorm:"type:datetime" json:"sale_start_date,omitempty"`
	SaleEndDate       *time.Time `gorm:"type:datetime" json:"sale_end_date,omitempty"`

	//Relationships
	Event         Event          `gorm:"foreignKey:EventID" json:"-"`
	Registrations []Registration `gorm:"foreignKey:TicketTypeID" json:"-"`
}

// TableName specifies the table name for TicketType model
func (TicketType) TableName() string {
	return "ticket_types"
}

// IsOnSale checks if the ticket is currently on sale
func (t *TicketType) IsOnSale() bool {
	now := time.Now()

	// If no sale dates are specified, then always on sale
	if t.SaleStartDate == nil && t.SaleEndDate == nil {
		return true
	}

	// Check start date if specified
	if t.SaleStartDate != nil && now.Before(*t.SaleStartDate) {
		return false
	}

	// Check end date if specified
	if t.SaleEndDate != nil && now.After(*t.SaleEndDate) {
		return false
	}

	return true
}

// GetAvailableQuantity returns the number of tickets still available
func (t *TicketType) GetAvailableQuantity(db *gorm.DB) (int, error) {
	var soldCount int64

	err := db.Model(&Registration{}).
		Where("ticket_type_id = ? AND status != ?", t.ID, "canceled").
		Count(&soldCount).Error

	if err != nil {
		return 0, err
	}

	return t.QuantityAvailable - int(soldCount), nil
}

// FindTicketTypeByID finds a ticket type by ID
func FindTicketTypeByID(db *gorm.DB, id uint) (*TicketType, error) {
	var ticketType TicketType
	result := db.First(&ticketType, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &ticketType, nil
}

// FindTicketTypesByEvent finds all ticket types for an event
func FindTicketTypesByEvent(db *gorm.DB, eventID uint) ([]TicketType, error) {
	var ticketTypes []TicketType
	result := db.Where("event_id = ?", eventID).Order("price").Find(&ticketTypes)
	return ticketTypes, result.Error
}

// CreateTicketType creates a new ticket type for an event
func CreateTicketType(db *gorm.DB, eventID uint, name, description string, price float64, quantity int, isVIP bool, saleStart, saleEnd *time.Time) (*TicketType, error) {
	ticketType := TicketType{
		EventID:           eventID,
		Name:              name,
		Description:       description,
		Price:             price,
		QuantityAvailable: quantity,
		IsVIP:             isVIP,
		SaleStartDate:     saleStart,
		SaleEndDate:       saleEnd,
	}

	result := db.Create(&ticketType)
	if result.Error != nil {
		return nil, result.Error
	}

	return &ticketType, nil
}
