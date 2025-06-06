package handlers

import (
	"fmt"
	"log"
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"lujke-dunn/314-group-project/backend/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type EventHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewEventHandler(emailService *services.EmailService) *EventHandler {
	return &EventHandler{
		db:           database.GetDB(),
		emailService: emailService,
	}
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	isOrganizer, exists := c.Get("isOrganizer")
	if !exists || !isOrganizer.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Organizer privileges required"})
		return
	}

	var input struct {
		Title         string    `json:"title" binding:"required"`
		Description   string    `json:"description" binding:"required"`
		CategoryID    *uint     `json:"category_id"`
		Venue         string    `json:"venue" binding:"required"`
		StartDateTime time.Time `json:"start_datetime" binding:"required"`
		EndDateTime   time.Time `json:"end_datetime" binding:"required"`
		City          string    `json:"city"`
		State         string    `json:"state"`
		Address       string    `json:"address"`
		ZipCode       string    `json:"zip_code"`
		Country       string    `json:"country"`
		IsVirtual     bool      `json:"is_virtual"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// gotta be in the future
	if input.EndDateTime.Before(input.StartDateTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End datetime must be after start date and time"})
		return
	}

	event := models.Event{
		UserID:        userID.(uint),
		CategoryID:    input.CategoryID,
		Title:         input.Title,
		Description:   input.Description,
		Venue:         input.Venue,
		StartDatetime: input.StartDateTime,
		EndDatetime:   input.EndDateTime,
		City:          input.City,
		State:         input.State,
		Address:       input.Address,
		ZipCode:       input.ZipCode,
		Country:       input.Country,
		IsVirtual:     input.IsVirtual,
		IsPublished:   true,
		IsCanceled:    false,
	}

	if err := h.db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	h.db.First(&event, event.ID)
	
	// send email
	user, _ := models.FindUserByID(h.db, userID.(uint))
	if h.emailService != nil && user != nil {
		go func() {
			if err := h.emailService.SendEventCreatedConfirmation(user, &event); err != nil {
				log.Printf("Failed to send event creation email: %v", err)
			}
		}()
	}
	
	models.CreateNotification(
		h.db,
		userID.(uint),
		&event.ID,
		"Event Created Successfully",
		fmt.Sprintf("Your event '%s' has been created and published successfully!", event.Title),
		models.NotificationTypeEventUpdate,
	)
	
	c.JSON(http.StatusCreated, event)
}

func (h *EventHandler) GetEvent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, id).Error; err != nil {
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

	h.db.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, email")
	}).Preload("TicketTypes").First(&event, id)

	c.JSON(http.StatusOK, event)
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	var events []models.Event
	query := h.db.Where("is_published = ? AND is_canceled = ?", true, false).
		Preload("TicketTypes")

	if categoryID, err := strconv.ParseUint(c.Query("category_id"), 10, 32); err == nil {
		query = query.Where("category_id = ?", categoryID)
	}

	if city := c.Query("city"); city != "" {
		query = query.Where("city LIKE ?", "%"+city+"%")
	}

	const string_date_and_time_format = time.RFC3339
	if startDate := c.Query("start_date"); startDate != "" {
		if date, err := time.Parse(string_date_and_time_format, startDate); err == nil {
			query = query.Where("start_datetime >= ?", date)
		}
	}

	if endDate := c.Query("end_date"); endDate != "" {
		if date, err := time.Parse(string_date_and_time_format, endDate); err == nil {
			query = query.Where("start_datetime <= ?", date)
		}
	}

	if searchQuery := c.Query("query"); searchQuery != "" {
		query = query.Where("title LIKE ? OR DESCRIPTION LIKE ?",
			"%"+searchQuery+"%", "%"+searchQuery+"%")
	}

	// Handle event type filter (virtual/physical)
	if eventType := c.Query("event_type"); eventType != "" {
		if eventType == "virtual" {
			query = query.Where("is_virtual = ?", true)
		} else if eventType == "physical" {
			query = query.Where("is_virtual = ?", false)
		}
	}

	// Handle price range filters
	minPriceStr := c.Query("min_price")
	maxPriceStr := c.Query("max_price")
	
	if minPriceStr != "" || maxPriceStr != "" {
		subQuery := h.db.Table("ticket_types").
			Select("DISTINCT event_id").
			Where("ticket_types.deleted_at IS NULL")
		
		if minPriceStr != "" {
			if minPrice, err := strconv.ParseFloat(minPriceStr, 64); err == nil {
				subQuery = subQuery.Where("price >= ?", minPrice)
			}
		}
		
		if maxPriceStr != "" {
			if maxPrice, err := strconv.ParseFloat(maxPriceStr, 64); err == nil {
				subQuery = subQuery.Where("price <= ?", maxPrice)
			}
		}
		
		query = query.Where("id IN (?)", subQuery)
	}

	query = query.Order("start_datetime")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	offset := (page - 1) * perPage

	var total int64
	query.Model(&models.Event{}).Count(&total)

	result := query.Limit(perPage).Offset(offset).Find(&events)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"events":      events,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"total_pages": (int(total) + perPage - 1) / perPage,
	})
}

func (h *EventHandler) UpdateEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this event"})
			return
		}
	}

	var input struct {
		Title         string     `json:"title"`
		Description   string     `json:"description"`
		CategoryID    *uint      `json:"category_id"`
		Venue         string     `json:"venue"`
		StartDatetime *time.Time `json:"start_datetime"`
		EndDatetime   *time.Time `json:"end_datetime"`
		City          string     `json:"city"`
		State         string     `json:"state"`
		Address       string     `json:"address"`
		ZipCode       string     `json:"zip_code"`
		Country       string     `json:"country"`
		IsVirtual     *bool      `json:"is_virtual"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != "" {
		event.Title = input.Title
	}

	if input.Description != "" {
		event.Description = input.Description
	}

	if input.CategoryID != nil {
		event.CategoryID = input.CategoryID
	}

	if input.Venue != "" {
		event.Venue = input.Venue
	}

	if input.StartDatetime != nil {
		event.StartDatetime = *input.StartDatetime
	}

	if input.EndDatetime != nil {
		event.EndDatetime = *input.EndDatetime
	}

	if input.City != "" {
		event.City = input.City
	}

	if input.State != "" {
		event.State = input.State
	}

	if input.Address != "" {
		event.Address = input.Address
	}

	if input.ZipCode != "" {
		event.ZipCode = input.ZipCode
	}

	if input.IsVirtual != nil {
		event.IsVirtual = *input.IsVirtual
	}

	if event.EndDatetime.Before(event.StartDatetime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End datetime must be after start date"})
		return
	}

	if err := h.db.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, event)
}

func (h *EventHandler) PublishEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to publish this event"})
			return
		}
	}

	if event.IsPublished {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Event is already published"})
		return
	}

	if event.IsCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot publish a canceled event"})
		return
	}

	if err := event.Publish(h.db); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish event"})
		return
	}

	h.db.First(&event, id)

	c.JSON(http.StatusOK, gin.H{"message": "Event published successfully", "event": event})
}

func (h *EventHandler) CancelEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to cancel this event"})
			return
		}
	}

	if event.IsCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Event is already canceled"})
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		input.Reason = "Event canceled by organizer"
	}

	if err := event.Cancel(h.db); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel event"})
		return
	}

	// todo: notify registered attendees of cancellation

	c.JSON(http.StatusOK, gin.H{"message": "Event canceled successfully", "event": event})
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := h.db.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this event"})
			return
		}
	}

	if event.IsPublished {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Published events cannot be deleted. Please cancel the event instead."})
		return
	}

	if err := h.db.Delete(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

func (h *EventHandler) GetUserEvents(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var events []models.Event
	query := h.db.Where("user_id = ?", userID)

	query = query.Order("created_at DESC")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	offset := (page - 1) * perPage

	var total int64
	query.Model(&models.Event{}).Count(&total)

	result := query.Preload("TicketTypes").Limit(perPage).Offset(offset).Find(&events)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"total":  total,
		"page":   page,
		"per_page": perPage,
		"total_pages": (total + int64(perPage) - 1) / int64(perPage),
	})
}
