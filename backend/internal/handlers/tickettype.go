package handlers

import (
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TicketTypeHandler struct {
	db *gorm.DB
}

func NewTicketTypeHandler() *TicketTypeHandler {
	return &TicketTypeHandler{
		db: database.GetDB(),
	}
}

func (h *TicketTypeHandler) CreateTicketType(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to create a ticket type for this event"})
			return
		}
	}

	var input struct {
		Name              string     `json:"name" binding:"required"`
		Description       string     `json:"description"`
		Price             float64    `json:"price" binding:"required"`
		QuantityAvailable int        `json:"quantity_available" binding:"required"`
		IsVIP             bool       `json:"is_vip"`
		SaleStartDate     *time.Time `json:"sale_start_date"`
		SaleEndDate       *time.Time `json:"sale_end_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Price < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Price cannot be negative"})
		return
	}

	if input.QuantityAvailable <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity available must be positive"})
		return
	}

	if input.SaleStartDate != nil && input.SaleEndDate != nil {
		if input.SaleEndDate.Before(*input.SaleStartDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sale end date must be after sale start date"})
			return
		}
	}

	ticketType := models.TicketType{
		EventID:           uint(eventID),
		Name:              input.Name,
		Description:       input.Description,
		Price:             input.Price,
		QuantityAvailable: input.QuantityAvailable,
		IsVIP:             input.IsVIP,
		SaleStartDate:     input.SaleStartDate,
		SaleEndDate:       input.SaleEndDate,
	}

	if err := h.db.Create(&ticketType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket type"})
		return
	}
	c.JSON(http.StatusCreated, ticketType)
}

func (h *TicketTypeHandler) GetTicketTypes(c *gin.Context) {
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if !event.IsPublished {
		userID, exists := c.Get("userID")
		if !exists || userID.(uint) != event.UserID {
			isAdmin, exists := c.Get("isAdmin")
			if !exists || !isAdmin.(bool) {
				c.JSON(http.StatusForbidden, gin.H{"error": "Event not published"})
				return
			}
		}
	}

	var ticketTypes []models.TicketType
	if err := h.db.Where("event_id = ?", eventID).Find(&ticketTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ticket types"})
		return
	}

	type TicketTypeWithAvailability struct {
		models.TicketType
		AvailableQuantity int `json:"available_quantity"`
		SoldQuantity      int `json:"sold_quantity"`
	}

	var enrichedTicketTypes []TicketTypeWithAvailability
	for _, ticket := range ticketTypes {
		availableQty, err := ticket.GetAvailableQuantity(h.db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate ticket availability"})
			return
		}

		soldQty := ticket.QuantityAvailable - availableQty
		enrichedTicketTypes = append(enrichedTicketTypes, TicketTypeWithAvailability{
			TicketType:        ticket,
			AvailableQuantity: availableQty,
			SoldQuantity:      soldQty,
		})
	}

	c.JSON(http.StatusOK, enrichedTicketTypes)
}

func (h *TicketTypeHandler) UpdateTicketType(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	ticketID, err := strconv.ParseUint(c.Param("ticket_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket type ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update ticket types for this event"})
			return
		}
	}

	var ticketType models.TicketType
	if err := h.db.Where("id = ? and event_id = ?", ticketID, eventID).First(&ticketType).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket type not found for this event"})
		return
	}

	var input struct {
		Name              string     `json:"name"`
		Description       string     `json:"description"`
		Price             *float64   `json:"price"`
		QuantityAvailable *int       `json:"quantity_available"`
		IsVIP             *bool      `json:"is_vip"`
		SaleStartDate     *time.Time `json:"sale_start_date"`
		SaleEndDate       *time.Time `json:"sale_end_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		ticketType.Name = input.Name
	}

	if input.Description != "" {
		ticketType.Description = input.Description
	}

	if input.Price != nil {
		if *input.Price < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Price must be positive"})
		}
		ticketType.Price = *input.Price
	}

	if input.QuantityAvailable != nil {
		if *input.QuantityAvailable <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity available must be positive"})
			return
		}
		ticketType.QuantityAvailable = *input.QuantityAvailable
	}

	if input.IsVIP != nil {
		ticketType.IsVIP = *input.IsVIP
	}

	if input.SaleStartDate != nil {
		ticketType.SaleStartDate = input.SaleStartDate
	}

	if input.SaleEndDate != nil {
		ticketType.SaleEndDate = input.SaleEndDate
	}

	if ticketType.SaleStartDate != nil && ticketType.SaleEndDate != nil {
		if ticketType.SaleEndDate.Before(*ticketType.SaleStartDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sale end date must be after sale start date"})
			return
		}
	}

	if err := h.db.Save(&ticketType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket type"})
		return
	}

	c.JSON(http.StatusOK, ticketType)
}

func (h *TicketTypeHandler) DeleteTicketType(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	ticketID, err := strconv.ParseUint(c.Param("ticket_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket type ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete ticketTypes for events"})
			return
		}
	}

	var ticketType models.TicketType
	if err := h.db.Where("id = ? AND event_id = ?", ticketID, eventID).First(&ticketType).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket type not found for this event"})
		return
	}

	var count int64
	h.db.Model(&models.Registration{}).Where("ticket_type_id = ?", ticketID).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete ticket type with existing registrations"})
		return
	}

	if err := h.db.Delete(&ticketType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ticket type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket type deleted successfully"})
}
