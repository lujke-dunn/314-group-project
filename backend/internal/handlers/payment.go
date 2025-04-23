package handlers

import (
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	db *gorm.DB
}

func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{
		db: database.GetDB(),
	}
}

func (h *PaymentHandler) ProcessPayment(c *gin.Context) {
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

	registration, err := models.FindRegistrationByID(h.db, uint(registrationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}

	if registration.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to process payment for this registration"})
		return
	}

	if registration.Status == models.RegistrationStatusConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Registration is already confirmed"})
		return
	}

	if registration.Status == models.RegistrationStatusCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot process payment for canceled registration"})
		return
	}

	var input struct {
		Method        models.PaymentMethod `json:"method" binding:"required"`
		TransactionID string               `json:"transaction_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payment, err := models.CreatePayment(h.db, registration.ID, registration.TotalPrice, input.Method, input.TransactionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
		return
	}

	if err := payment.Process(h.db); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process payment: " + err.Error()})
		return
	}

	updatedRegistration, _ := models.FindRegistrationByID(h.db, registration.ID)

	models.CreateNotification(
		h.db,
		userID.(uint),
		&registration.EventID,
		"Registration Confirmed",
		"Your registration has been confirmed. Thank you for your payment",
		models.NotificationTypePayment,
	)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Payment processed successfully",
		"payment":      payment,
		"registration": updatedRegistration,
	})
}

func (h *PaymentHandler) GetPayments(c *gin.Context) {
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

	registration, err := models.FindRegistrationByID(h.db, uint(registrationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}

	if registration.UserID != userID.(uint) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view payments for this registration"})
			return
		}
	}

	payments, err := models.FindPaymentsByRegistration(h.db, registration.ID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view payments for this registration"})
		return
	}

	c.JSON(http.StatusOK, payments)
}
