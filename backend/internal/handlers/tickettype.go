package handlers

import (
	"gorm.io/gorm"
)

type TicketTypeHandler struct {
	db *gorm.DB
}

func NewTicketTypeHandler() *TicketTypeHandler {

}
