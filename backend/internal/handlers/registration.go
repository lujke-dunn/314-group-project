package handlers

import (
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RegistrationHandler struct {
	db *gorm.DB
}

func NewRegistrationHandler() *RegistrationHandler {
	return &RegistrationHandler{
		db: database.GetDB(),
	}
}

func (h *RegistrationHandler) CreateRegistration(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		EventID      uint `json:"event_id" binding:"required"`
		TicketTypeID uint `json:"ticket_type_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var event models.Event
	if err := h.db.First(&event, input.EventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if !event.IsPublished || event.IsCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Event is not available for registration"})
		return
	}

	var ticketType models.TicketType
	if err := h.db.Where("id = ? AND event_id = ?", input.TicketTypeID, input.EventID).First(&ticketType).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket type not found for this event"})
		return
	}

	availableQuantity, err := ticketType.GetAvailableQuantity(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check ticket availability"})
		return
	}

	if availableQuantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No tickets available"})
		return
	}

	if !ticketType.IsOnSale() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tickets are not currently on sale"})
		return
	}

	registration, err := models.CreateRegistration(h.db, userID.(uint), input.EventID, input.TicketTypeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create registration"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Registration created successfully",
		"registration": registration,
	})
}

func (h *RegistrationHandler) GetUserRegistrations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	registrations, err := models.FindRegistrationsByUser(h.db, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch registration"})
		return
	}

	var enhancedRegistrations []gin.H
	for _, reg := range registrations {
		var event models.Event
		var ticketType models.TicketType

		h.db.First(&event, reg.EventID)
		h.db.First(&ticketType, reg.TicketTypeID)

		enhancedRegistrations = append(enhancedRegistrations, gin.H{
			"id":             reg.ID,
			"event_id":       reg.EventID,
			"ticket_type_id": reg.TicketTypeID,
			"status":         reg.Status,
			"total_price":    reg.TotalPrice,
			"created_at":     reg.CreatedAt,
			"event_title":    event.Title,
			"ticket_name":    ticketType.Name,
		})
	}

	c.JSON(http.StatusOK, enhancedRegistrations)
	return
}

func (h *RegistrationHandler) GetRegistrationDetails(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration ID"})
		return
	}

	registrationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Registration not found"})
		return
	}

	registration, err := models.FindRegistrationByID(h.db, uint(registrationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}

	if registration.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view this registration"})
			return
		}
	}

	var event models.Event
	var ticketType models.TicketType
	h.db.First(&event, registration.EventID)
	h.db.First(&ticketType, registration.TicketTypeID)

	payments, _ := registration.GetPayments(h.db)

	c.JSON(http.StatusOK, gin.H{
		"registration": registration,
		"event": gin.H{
			"id":             event.ID,
			"title":          event.Title,
			"start_datetime": event.StartDatetime,
			"end_datetime":   event.EndDatetime,
			"venue":          event.Venue,
			"address":        event.Address,
			"city":           event.City,
			"state":          event.State,
			"is_virtual":     event.IsVirtual,
		},
		"ticket_type": gin.H{
			"id":     ticketType.ID,
			"name":   ticketType.Name,
			"price":  ticketType.Price,
			"is_vip": ticketType.IsVIP,
		},
		"payments": payments,
	})
}

func (h *RegistrationHandler) CancelRegistration(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	registrationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration ID"})
		return
	}

	// Get the registration
	registration, err := models.FindRegistrationByID(h.db, uint(registrationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}

	// Check if the registration belongs to the user
	if registration.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to cancel this registration"})
			return
		}
	}

	// Check if registration is already canceled
	if registration.Status == models.RegistrationStatusCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Registration is already canceled"})
		return
	}

	// Cancel the registration
	if err := registration.Cancel(h.db); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel registration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Registration canceled successfully",
		"registration": registration,
	})
}
