package handlers

import (
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FeedbackHandler struct {
	db *gorm.DB
}

func NewFeedbackHandler() *FeedbackHandler {
	return &FeedbackHandler{
		db: database.GetDB(),
	}
}

func (h *FeedbackHandler) CreateFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
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

	var count int64
	if err := h.db.Model(&models.Registration{}).
		Where("user_id = ? AND event_id = ? AND status = ?",
			userID, eventID, models.RegistrationStatusConfirmed).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify attendance"})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must have attended the event to provide feedback"})
		return
	}

	var input struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingFeedback models.EventFeedback
	result := h.db.Where("event_id = ? AND user_id = ?", eventID, userID).First(&existingFeedback)
	if result.Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You have already provided feedback for this event"})
		return
	}

	feedback, err := models.CreateFeedback(h.db, uint(eventID), userID.(uint), input.Rating, input.Comment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Feedback submitted successfully",
		"feedback": feedback,
	})
}

func (h *FeedbackHandler) GetEventFeedback(c *gin.Context) {
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

	feedbacks, err := models.FindFeedbackByEvent(h.db, uint(eventID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feedback"})
		return
	}

	avgRating, _ := models.GetAverageRatingForEvent(h.db, uint(eventID))

	var enhancedFeedbacks []gin.H
	for _, feedback := range feedbacks {
		var user models.User
		h.db.Select("id, first_name, last_name").First(&user, feedback.UserID)

		enhancedFeedbacks = append(enhancedFeedbacks, gin.H{
			"id":         feedback.ID,
			"rating":     feedback.Rating,
			"comment":    feedback.Comment,
			"created_at": feedback.CreatedAt,
			"user": gin.H{
				"id":         user.ID,
				"first_name": user.FirstName,
				"last_name":  user.LastName,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"feedbacks":      enhancedFeedbacks,
		"count":          len(feedbacks),
		"average_rating": avgRating,
	})
}

func (h *FeedbackHandler) GetUserFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var feedbacks []models.EventFeedback
	if err := h.db.Where("user_id = ?", userID).Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feedback"})
		return
	}

	var enhancedFeedbacks []gin.H
	for _, feedback := range feedbacks {
		var event models.Event
		h.db.Select("id, title, venue, start_datetime").First(&event, feedback.EventID)

		enhancedFeedbacks = append(enhancedFeedbacks, gin.H{
			"id":         feedback.ID,
			"rating":     feedback.Rating,
			"comment":    feedback.Comment,
			"created_at": feedback.CreatedAt,
			"events": gin.H{
				"id":             event.ID,
				"title":          event.Title,
				"venue":          event.Venue,
				"start_datetime": event.StartDatetime,
			},
		})
	}

	c.JSON(http.StatusOK, enhancedFeedbacks)
}

func (h *FeedbackHandler) UpdateFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedbackID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var feedback models.EventFeedback
	if err := h.db.First(&feedback, feedbackID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	if feedback.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this feedback"})
		return
	}

	var input struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feedback.Rating = input.Rating
	feedback.Comment = input.Comment

	if err := h.db.Save(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feedback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Feedback updated successfully",
		"feedback": feedback,
	})
}

func (h *FeedbackHandler) DeleteFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedbackID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var feedback models.EventFeedback
	if err := h.db.First(&feedback, feedbackID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	if feedback.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this feedback"})
			return
		}
	}

	if err := h.db.Delete(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete feedback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback deleted successfully"})
}
