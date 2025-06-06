package handlers

import (
	"net/http"
	"strconv"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		db: database.GetDB(),
	}
}

func (h *UserHandler) RegisterUser(c *gin.Context) {
	var input struct {
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=6"`
		FirstName string `json:"first_name" binding:"required"`
		LastName  string `json:"last_name" binding:"required"`
		Phone     string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// no duplicates pls
	existingUser, _ := models.FindUserByEmail(h.db, input.Email)
	if existingUser != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User with this email already exists"})
		return
	}

	// everyone gets to be special (organizer powers)
	user := models.User{
		Email:       input.Email,
		FirstName:   input.FirstName,
		LastName:    input.LastName,
		Phone:       input.Phone,
		IsOrganizer: true,
	}

	if err := user.SetPassword(input.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set password"})
		return
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":           user.ID,
		"email":        user.Email,
		"first_name":   user.FirstName,
		"last_name":    user.LastName,
		"phone":        user.Phone,
		"is_organizer": user.IsOrganizer,
		"created_at":   user.CreatedAt,
	})
}

func (h *UserHandler) LoginUser(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := models.FindUserByEmail(h.db, input.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !user.CheckPassword(input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":     user.ID,
		"email":       user.Email,
		"is_admin":    user.IsAdmin,
		"is_organizer": user.IsOrganizer,
	})

	tokenString, err := token.SignedString([]byte("dogpark"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"first_name":   user.FirstName,
			"last_name":    user.LastName,
			"is_admin":     user.IsAdmin,
			"is_organizer": user.IsOrganizer,
		},
	})
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := models.FindUserByID(h.db, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"email":        user.Email,
		"first_name":   user.FirstName,
		"last_name":    user.LastName,
		"phone":        user.Phone,
		"is_admin":     user.IsAdmin,
		"is_organizer": user.IsOrganizer,
		"created_at":   user.CreatedAt,
		"updated_at":   user.UpdatedAt,
	})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := models.FindUserByID(h.db, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var input struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Phone     string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.FirstName != "" {
		user.FirstName = input.FirstName
	}
	if input.LastName != "" {
		user.LastName = input.LastName
	}
	if input.Phone != "" {
		user.Phone = input.Phone
	}

	if err := h.db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"email":        user.Email,
		"first_name":   user.FirstName,
		"last_name":    user.LastName,
		"phone":        user.Phone,
		"is_admin":     user.IsAdmin,
		"is_organizer": user.IsOrganizer,
		"updated_at":   user.UpdatedAt,
	})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := models.FindUserByID(h.db, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var input struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !user.CheckPassword(input.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	if err := user.SetPassword(input.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set new password"})
		return
	}

	if err := h.db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func (h *UserHandler) BecomeOrganizer(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := models.FindUserByID(h.db, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.IsOrganizer {
		c.JSON(http.StatusOK, gin.H{"message": "You are already an organizer"})
		return
	}

	user.IsOrganizer = true
	if err := h.db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      user.ID,
		"email":        user.Email,
		"is_admin":     user.IsAdmin,
		"is_organizer": user.IsOrganizer,
	})

	tokenString, err := token.SignedString([]byte("dogpark"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully became an organizer",
		"token":   tokenString,
		"user": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"first_name":   user.FirstName,
			"last_name":    user.LastName,
			"is_organizer": user.IsOrganizer,
		},
	})
}

func (h *UserHandler) GetUserByID(c *gin.Context) {
	isAdmin, exists := c.Get("isAdmin")
	if !exists || !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// find user by id
	user, err := models.FindUserByID(h.db, uint(userID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"email":        user.Email,
		"first_name":   user.FirstName,
		"last_name":    user.LastName,
		"phone":        user.Phone,
		"is_admin":     user.IsAdmin,
		"is_organizer": user.IsOrganizer,
		"created_at":   user.CreatedAt,
		"updated_at":   user.UpdatedAt,
	})
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	isAdmin, exists := c.Get("isAdmin")
	if !exists || !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var users []models.User
	if err := h.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	var response []gin.H
	for _, user := range users {
		response = append(response, gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"first_name":   user.FirstName,
			"last_name":    user.LastName,
			"phone":        user.Phone,
			"is_admin":     user.IsAdmin,
			"is_organizer": user.IsOrganizer,
			"created_at":   user.CreatedAt,
			"updated_at":   user.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}
