package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"lujke-dunn/314-group-project/backend/internal/config"
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/handlers"
	"lujke-dunn/314-group-project/backend/internal/middleware"
	"lujke-dunn/314-group-project/backend/internal/services"
)

func main() {
	// load configuration
	cfg := config.LoadConfig()

	// initialize email service
	emailService := services.NewEmailService(&cfg.SMTP)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // vite dev server
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// initialize database
	_, err := database.Initialize()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// migrate database schema
	err = database.MigrateSchema()
	if err != nil {
		log.Fatalf("Failed to migrate database schema: %v", err)
	}

	// create handlers
	userHandler := handlers.NewUserHandler()
	eventHandler := handlers.NewEventHandler(emailService)
	ticketTypeHandler := handlers.NewTicketTypeHandler()
	registrationHandler := handlers.NewRegistrationHandler(emailService)
	paymentHandler := handlers.NewPaymentHandler(emailService)
	feedbackHandler := handlers.NewFeedbackHandler()
	statisticsHandler := handlers.NewStatisticsHandler()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Event Management System API is running",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// public routes
	r.POST("/register", userHandler.RegisterUser)
	r.POST("/login", userHandler.LoginUser)
	r.GET("/events/:id/ticket-types", ticketTypeHandler.GetTicketTypes)
	r.GET("/events", eventHandler.ListEvents)
	// protected routes
	authorized := r.Group("/")
	authorized.Use(middleware.AuthMiddleware())
	{
		// user routes
		authorized.GET("/profile", userHandler.GetProfile)
		authorized.PUT("/profile", userHandler.UpdateProfile)
		authorized.POST("/change-password", userHandler.ChangePassword)
		authorized.POST("/become-organizer", userHandler.BecomeOrganizer)
		authorized.POST("/registrations", registrationHandler.CreateRegistration)
		authorized.GET("/registrations", registrationHandler.GetUserRegistrations)
		authorized.GET("/registrations/:id", registrationHandler.GetRegistrationDetails)
		authorized.PUT("/registrations/:id/cancel", registrationHandler.CancelRegistration)
		authorized.GET("/events/:id/registrations", registrationHandler.GetEventRegistrations)
		authorized.PUT("/registrations/:id/status", registrationHandler.UpdateRegistrationStatus)

		authorized.POST("/registrations/:id/payments", paymentHandler.ProcessPayment)
		authorized.GET("/registrations/:id/payments", paymentHandler.GetPayments)

		authorized.POST("/events/:id/feedback", feedbackHandler.CreateFeedback)
		authorized.GET("/events/:id/feedback", feedbackHandler.GetEventFeedback)
		authorized.GET("/feedback", feedbackHandler.GetUserFeedback)
		authorized.PUT("/feedback/:id", feedbackHandler.UpdateFeedback)
		authorized.DELETE("/feedback/:id", feedbackHandler.DeleteFeedback)

		// admin routes
		admin := authorized.Group("/admin")
		admin.Use(middleware.AdminRequired())
		{
			admin.GET("/users", userHandler.ListUsers)
			admin.GET("/users/:id", userHandler.GetUserByID)
			admin.GET("/stats", statisticsHandler.GetSystemStats)
		}

		authorized.GET("/events/:id", eventHandler.GetEvent)
		authorized.GET("/my-events", eventHandler.GetUserEvents)
		authorized.POST("/events/create", eventHandler.CreateEvent)
		authorized.PUT("/events/:id/publish", eventHandler.PublishEvent)

		// organizer routes specifically for event management
		organizer := authorized.Group("/")
		organizer.Use(middleware.OrganizerRequired())
		{
			organizer.PUT("/events/:id", eventHandler.UpdateEvent)
			organizer.DELETE("/events/:id", eventHandler.DeleteEvent)
			organizer.PUT("/events/:id/cancel", eventHandler.CancelEvent)
			organizer.POST("/events/:id/ticket-types", ticketTypeHandler.CreateTicketType)
			organizer.PUT("/events/:id/ticket-types/:ticket_id", ticketTypeHandler.UpdateTicketType)
			organizer.DELETE("/events/:id/ticket-types/:ticket_id", ticketTypeHandler.DeleteTicketType)
			organizer.GET("/events/stats", statisticsHandler.GetEventStats)
		}
	}

	// run the server
	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
