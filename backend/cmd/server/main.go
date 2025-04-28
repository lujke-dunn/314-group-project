// el main server entry point

package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	//"github.com/golang-jwt/jwt/v5"
	"lujke-dunn/314-group-project/backend/internal/database"
	//"lujke-dunn/314-group-project/backend/internal/models"
	"lujke-dunn/314-group-project/backend/internal/handlers"
	"lujke-dunn/314-group-project/backend/internal/middleware"
	//"gorm.io/gorm"
)

func main() {
	// Set up Gin
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // Your Vite dev server URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// Initialize database
	_, err := database.Initialize()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Migrate database schema
	err = database.MigrateSchema()
	if err != nil {
		log.Fatalf("Failed to migrate database schema: %v", err)
	}

	// Create handlers
	userHandler := handlers.NewUserHandler()
	eventHandler := handlers.NewEventHandler()
	ticketTypeHandler := handlers.NewTicketTypeHandler()
	registrationHandler := handlers.NewRegistrationHandler()
	paymentHandler := handlers.NewPaymentHandler()
	feedbackHandler := handlers.NewFeedbackHandler()
	statisticsHandler := handlers.NewStatisticsHandler()

	// health check route / check if server alive
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Event Management System API is running",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// Public routes
	r.POST("/register", userHandler.RegisterUser)
	r.POST("/login", userHandler.LoginUser)
	r.GET("/events/:id/ticket-types", ticketTypeHandler.GetTicketTypes)
	r.GET("/events", eventHandler.ListEvents)
	r.GET("/events/:id", eventHandler.GetEvent)
	// Protected routes
	authorized := r.Group("/")
	authorized.Use(middleware.AuthMiddleware())
	{
		// User routes
		authorized.GET("/profile", userHandler.GetProfile)
		authorized.PUT("/profile", userHandler.UpdateProfile)
		authorized.POST("/change-password", userHandler.ChangePassword)
		authorized.POST("/registrations", registrationHandler.CreateRegistration)
		authorized.GET("/registrations", registrationHandler.GetUserRegistrations)
		authorized.GET("/registrations/:id", registrationHandler.GetRegistrationDetails)
		authorized.PUT("/registrations/:id/cancel", registrationHandler.CancelRegistration)

		authorized.POST("/registrations/:id/payments", paymentHandler.ProcessPayment)
		authorized.GET("/registrations/:id/payments", paymentHandler.GetPayments)

		authorized.POST("/events/:id/feedback", feedbackHandler.CreateFeedback)
		authorized.GET("/events/:id/feedback", feedbackHandler.GetEventFeedback)
		authorized.GET("/feedback", feedbackHandler.GetUserFeedback)
		authorized.PUT("/feedback/:id", feedbackHandler.UpdateFeedback)
		authorized.DELETE("/feedback/:id", feedbackHandler.DeleteFeedback)

		// Admin routes
		admin := authorized.Group("/admin")
		admin.Use(middleware.AdminRequired())
		{
			admin.GET("/users", userHandler.ListUsers)
			admin.GET("/users/:id", userHandler.GetUserByID)
			admin.GET("/stats", statisticsHandler.GetSystemStats)
		}

		authorized.POST("/events/create", eventHandler.CreateEvent)
		authorized.PUT("/events/:id/publish", eventHandler.PublishEvent)

		// Organizer routes - specifically for event management
		organizer := authorized.Group("/events")
		organizer.Use(middleware.OrganizerRequired())
		{

			organizer.PUT("/:id", eventHandler.UpdateEvent)
			organizer.DELETE("/:id", eventHandler.DeleteEvent)
			organizer.PUT("/:id/cancel", eventHandler.CancelEvent)
			organizer.POST("/:id/ticket-types", ticketTypeHandler.CreateTicketType)
			organizer.PUT("/:id/ticket-types/:ticket_id", ticketTypeHandler.UpdateTicketType)
			organizer.DELETE("/:id/ticket-types/:ticket_id", ticketTypeHandler.DeleteTicketType)
			organizer.GET("/stats", statisticsHandler.GetEventStats)
		}
	}

	// Run the server
	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
