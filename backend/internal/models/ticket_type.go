package models

import (
	"time"

	"gorm.io/gorm"
)

type TicketType struct {
	Base
	EventID           uint       `json:"event_id"`
	Name              string     `gorm:"type:varchar(100);not null" json:"name"`
	Description       string     `gorm:"type:text" json:"description"`
	Price             float64    `gorm:"type:numeric(10,2);not null" json:"price"`
	QuantityAvailable int        `gorm:"not null" json:"quantity_available"`
	IsVIP             bool       `gorm:"column:is_vip;default:false" json:"is_vip"`
	SaleStartDate     *time.Time `gorm:"type:datetime" json:"sale_start_date,omitempty"`
	SaleEndDate       *time.Time `gorm:"type:datetime" json:"sale_end_date,omitempty"`

	//Relationships
	Event         Event          `gorm:"foreignKey:EventID" json:"-"`
	Registrations []Registration `gorm:"foreignKey:TicketTypeID" json:"-"`
}

func (TicketType) TableName() string {
	return "ticket_types"
}

func (t *TicketType) IsOnSale() bool {
	now := time.Now()

	if t.SaleStartDate == nil && t.SaleEndDate == nil {
		return true
	}

	if t.SaleStartDate != nil && now.Before(*t.SaleStartDate) {
		return false
	}

	if t.SaleEndDate != nil && now.After(*t.SaleEndDate) {
		return false
	}

	return true
}

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

func FindTicketTypeByID(db *gorm.DB, id uint) (*TicketType, error) {
	var ticketType TicketType
	result := db.First(&ticketType, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &ticketType, nil
}

func FindTicketTypesByEvent(db *gorm.DB, eventID uint) ([]TicketType, error) {
	var ticketTypes []TicketType
	result := db.Where("event_id = ?", eventID).Order("price").Find(&ticketTypes)
	return ticketTypes, result.Error
}

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
