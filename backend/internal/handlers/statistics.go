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

type StatisticsHandler struct {
	db *gorm.DB
}

func NewStatisticsHandler() *StatisticsHandler {
	return &StatisticsHandler{
		db: database.GetDB(),
	}
}

func (h *StatisticsHandler) GetSystemStats(c *gin.Context) {
	isAdmin, exists := c.Get("isAdmin")
	if !exists || !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var totalUsers int64
	h.db.Model(&models.User{}).Count(&totalUsers)

	var totalEvents int64
	h.db.Model(&models.User{}).Count(&totalEvents)

	var publishedEvents int64
	h.db.Model(&models.Event{}).Where("is_published = ?", true).Count(&publishedEvents)

	var totalRegistrations int64
	h.db.Model(&models.Registration{}).Count(&totalRegistrations)

	var confirmedRegistrations int64
	h.db.Model(&models.Registration{}).Where("status = ?", models.RegistrationStatusConfirmed).Count(&confirmedRegistrations)

	var totalRevenue float64
	h.db.Model(&models.Payment{}).Where("status = ?", models.PaymentStatusCompleted).Select("COALESCE(SUM(amount), 0)").Scan(&totalRevenue)

	var newUsers int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	h.db.Model(&models.User{}).Where("created_at >= ?", thirtyDaysAgo).Count(&newUsers)

	var newEvents int64
	h.db.Model(&models.Event{}).Where("created_at >= ?", thirtyDaysAgo).Count(&newEvents)

	c.JSON(http.StatusOK, gin.H{
		"total_users":             totalUsers,
		"total_events":            totalEvents,
		"published_events":        publishedEvents,
		"total_registrations":     totalRegistrations,
		"confirmed_registrations": confirmedRegistrations,
		"total_revenue":           totalRevenue,
		"new_users_last_30_days":  newUsers,
		"new_events_last_30_days": newEvents,
	})
}

func (h *StatisticsHandler) GetEventStats(c *gin.Context) {
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

	var event models.Event
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if event.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this events stats"})
			return
		}
	}

	// return registration stats by status pending, confirmed, and cancelled
	var pendingCount, confirmedCount, cancelledCount int64
	h.db.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, models.RegistrationStatusPending).Count(&pendingCount)
	h.db.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, models.RegistrationStatusConfirmed).Count(&confirmedCount)
	h.db.Model(&models.Registration{}).Where("event_id = ? AND status = ?", eventID, models.RegistrationStatusCanceled).Count(&cancelledCount)

	type TicketSalesByType struct {
		TicketTypeID uint    `json:"ticket_type_id"`
		Name         string  `json:"name"`
		Sold         int64   `json:"sold"`
		Available    int     `json:"available"`
		Revenue      float64 `json:"revenue"`
	}

	var ticketSales []TicketSalesByType

	h.db.Table("ticket_types").
		Select("ticket_types.id as ticket_type_id, ticket_types.name, COUNT(registrations.id) as available, COALESCE(SUM(registrations.total_price), 0) as revenue").
		Joins("LEFT JOIN registrations ON ticket_types.id = registrations.ticket_type_id AND registrations.status != 'canceled'").
		Where("ticket_types.event_id = ?", eventID).
		Group("ticket_types.id").
		Scan(&ticketSales)

	var totalRevenue float64
	h.db.Model(&models.Registration{}).
		Where("event_id = ? AND status = ?", eventID, models.RegistrationStatusConfirmed).
		Select("COALESCE(SUM(total_price), 0)").
		Scan(&totalRevenue)

	var feedbackCount int64
	var avgRating float64

	h.db.Model(&models.EventFeedback{}).Where("event_id = ?", eventID).Count(&feedbackCount)
	h.db.Model(&models.EventFeedback{}).Where("event_id = ?", eventID).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating)

	type RatingDistribution struct {
		Rating int   `json:"rating"`
		Count  int64 `json:"count"`
	}

	var ratingDistribution []RatingDistribution
	for i := 1; i <= 5; i++ {
		var count int64
		h.db.Model(&models.EventFeedback{}).Where("event_id = ? AND rating = ?", eventID, i).Count(&count)
		ratingDistribution = append(ratingDistribution, RatingDistribution{Rating: i, Count: count})
	}

	type RegistrationOverTime struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}

	var registrationsOverTime []RegistrationOverTime

	h.db.Table("registrations").
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("event_id = ?", eventID).
		Group("DATE(created_at)").
		Order("date").
		Scan(&registrationsOverTime)

	c.JSON(http.StatusOK, gin.H{
		"event_id":    event.ID,
		"event_title": event.Title,
		"registrations": gin.H{
			"total":     pendingCount + confirmedCount + cancelledCount,
			"pending":   pendingCount,
			"confirmed": confirmedCount,
			"cancelled": cancelledCount,
		},
		"ticket_sales":  ticketSales,
		"total_revenue": totalRevenue,
		"feedback": gin.H{
			"count":               feedbackCount,
			"average_rating":      avgRating,
			"rating_distribution": ratingDistribution,
		},
		"registrations_over_time": registrationsOverTime,
	})
}
