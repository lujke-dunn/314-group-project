package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"
	"strconv"
	
	"lujke-dunn/314-group-project/backend/internal/config"
	"lujke-dunn/314-group-project/backend/internal/database"
	"lujke-dunn/314-group-project/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

var venues = []string{
	"Sydney Opera House", "ANZ Stadium", "Darling Harbour Convention Centre", 
	"Royal Botanic Gardens Sydney", "Luna Park Sydney", "Carriageworks",
	"Sydney Town Hall", "International Convention Centre Sydney", "The Star Event Centre",
	"Barangaroo Reserve", "Centennial Park", "Sydney Cricket Ground",
	"Allianz Stadium", "Museum of Contemporary Art", "Art Gallery of NSW",
	"Powerhouse Museum", "Sydney Observatory", "Hyde Park Barracks",
	"The Rocks Discovery Museum", "Sydney Harbour Bridge", "Circular Quay",
	"Bondi Beach Pavilion", "Manly Beach", "Coogee Beach", "Bronte Beach",
}

var eventTitles = []string{
	"Sydney Harbour NYE Spectacular", "Vivid Sydney Light Festival", "Sydney Food & Wine Festival",
	"Sydney Writers' Festival", "Sculpture by the Sea", "Sydney Festival",
	"Good Food Month", "Open House Sydney", "Sydney Design Festival",
	"Mardi Gras Parade", "Sydney Royal Easter Show", "Night Noodle Markets",
	"Carriageworks Farmers Markets", "Sydney Comedy Festival", "Sydney Film Festival",
	"ANZAC Day March", "Australia Day Celebrations", "Chinese New Year Festival",
	"Sydney Morning Herald Half Marathon", "City to Surf Fun Run", "Sydney to Hobart Yacht Race",
	"Rolex Sydney Hobart", "Festival of the Winds", "Cherry Blossom Festival",
	"Sydney International Art Series", "Biennale of Sydney", "Sydney Contemporary Art Fair",
	"Sydney Design Week", "Smart Cities Week", "Sydney Startup Hub Demo Day",
}

var eventDescriptions = []string{
	"Join us for an unforgettable experience in the heart of Sydney with stunning harbour views.",
	"Discover the vibrant culture and community spirit that makes Sydney unique.",
	"Experience world-class entertainment and dining in one of Sydney's most iconic locations.",
	"Connect with fellow Sydneysiders and visitors from around the world at this spectacular event.",
	"Immerse yourself in the arts, culture, and natural beauty that Sydney has to offer.",
	"Celebrate the diversity and creativity that makes Sydney Australia's cultural capital.",
	"Enjoy premium food, drinks, and entertainment with breathtaking Sydney skyline views.",
	"Network with professionals and creatives in Sydney's thriving business community.",
	"Experience the best of Sydney's outdoor lifestyle and scenic waterfront locations.",
	"Join thousands of locals and visitors for this signature Sydney event experience.",
}

var firstNames = []string{
	"James", "Sarah", "Michael", "Emma", "David", "Olivia", "Chris", "Cody", "Daniel", "Isabella",
	"Matthew", "Charlotte", "Andrew", "Amelia", "Joshua", "Mia", "Ryan", "Harper", "Nathan", "Evelyn",
	"Lucas", "Abigail", "Benjamin", "Emily", "Jack", "Elizabeth", "Mason", "Sofia", "Ethan", "Jingle",
}

var lastNames = []string{
	"Smith", "Johnson", "Williams", "Brown", "Jones", "Dunn", "Miller", "Davis", "O'Reilly", "Nguyen",
	"Un", "Cameron", "Gonzalez", "Wilson", "Anderson", "Thomas", "Gai", "Moore", "Jackson", "Martin",
	"Tran", "Widjaja", "Thompson", "White", "Harris", "Warren", "Clark", "Fillion", "Lewis", "Black",
}

var ticketTypes = []string{
	"General Admission", "VIP Experience", "Early Bird", "Student Discount", "Senior Discount",
	"Premium Access", "Standard Entry", "Family Package", "Group Booking", "Corporate Package",
}

func main() {
	// Initialize configuration
	config.LoadConfig()
	
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

	// Clear existing data
	fmt.Println("🧹 Clearing existing data...")
	db := database.GetDB()
	
	// Delete in order to respect foreign key constraints
	db.Exec("DELETE FROM registrations")
	db.Exec("DELETE FROM ticket_types") 
	db.Exec("DELETE FROM events")
	db.Exec("DELETE FROM users")
	
	// Reset auto-increment counters
	db.Exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'events', 'ticket_types', 'registrations')")


	err = generateData()
	if err != nil {
		log.Fatalf("Failed to generate data: %v", err)
	}
}

func generateData() error {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())
	
	fmt.Println("Generating themed test data...")
	
	// Create 10 event organizers
	fmt.Println("Creating 10 event organizers...")
	var organizers []models.User
	
	for i := 1; i <= 10; i++ {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		
		user := models.User{
			Email:        fmt.Sprintf("organizer%d@events.com.au", i),
			PasswordHash: string(hashedPassword),
			FirstName:    firstNames[rand.Intn(len(firstNames))],
			LastName:     lastNames[rand.Intn(len(lastNames))],
			Phone:        fmt.Sprintf("04%d%d %d%d%d %d%d%d", 
				rand.Intn(10), rand.Intn(10), rand.Intn(10), rand.Intn(10), rand.Intn(10),
				rand.Intn(10), rand.Intn(10), rand.Intn(10)),
			IsAdmin:      false,
			IsOrganizer:  true,
		}
		
		if err := database.GetDB().Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create organizer %d: %v", i, err)
		}
		organizers = append(organizers, user)
	}
	
	// Create 50 regular users
	fmt.Println("Creating 50 regular users...")
	var regularUsers []models.User
	
	for i := 1; i <= 50; i++ {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		
		user := models.User{
			Email:        fmt.Sprintf("user%d@gmail.com", i),
			PasswordHash: string(hashedPassword),
			FirstName:    firstNames[rand.Intn(len(firstNames))],
			LastName:     lastNames[rand.Intn(len(lastNames))],
			Phone:        fmt.Sprintf("04%d%d %d%d%d %d%d%d", 
				rand.Intn(10), rand.Intn(10), rand.Intn(10), rand.Intn(10), rand.Intn(10),
				rand.Intn(10), rand.Intn(10), rand.Intn(10)),
			IsAdmin:      false,
			IsOrganizer:  false,
		}
		
		if err := database.GetDB().Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create user %d: %v", i, err)
		}
		regularUsers = append(regularUsers, user)
	}
	
	// Create 25 events (2-3 events per organizer)
	fmt.Println("Creating 25 events...")
	var events []models.Event
	
	for i := 1; i <= 25; i++ {
		organizer := organizers[rand.Intn(len(organizers))]
		
		// Generate random dates within next 6 months
		startDate := time.Now().AddDate(0, 0, rand.Intn(180))
		endDate := startDate.Add(time.Duration(rand.Intn(8)+1) * time.Hour)
		
		// Generate random postcode in 2000 to 2099 range
		postcode := strconv.Itoa(2000 + rand.Intn(200))
		
		event := models.Event{
			UserID:        organizer.ID,
			Title:         eventTitles[rand.Intn(len(eventTitles))],
			Description:   eventDescriptions[rand.Intn(len(eventDescriptions))],
			Venue:         venues[rand.Intn(len(venues))],
			StartDatetime: startDate,
			EndDatetime:   endDate,
			City:          "Sydney",
			State:         "NSW",
			ZipCode:       postcode,
			Country:       "Australia",
			IsVirtual:     rand.Float32() < 0.2, // 20% virtual events
			IsPublished:   true,
			IsCanceled:    false,
		}
		
		if err := database.GetDB().Create(&event).Error; err != nil {
			return fmt.Errorf("failed to create event %d: %v", i, err)
		}
		events = append(events, event)
	}
	
	// Create ticket types for each event
	fmt.Println("Creating ticket types...")
	var allTicketTypes []models.TicketType
	
	for _, event := range events {
		numTicketTypes := rand.Intn(3) + 1 // 1-3 ticket types per event
		
		for j := 0; j < numTicketTypes; j++ {
			price := float64(rand.Intn(200) + 10) // $10-$210
			if j == 0 {
				price = float64(rand.Intn(50) + 10) // First ticket type is cheaper
			}
			
			ticketType := models.TicketType{
				EventID:           event.ID,
				Name:              ticketTypes[rand.Intn(len(ticketTypes))],
				Description:       "Includes access to all event activities and amenities",
				Price:             price,
				QuantityAvailable: rand.Intn(100) + 20, // 20-120 tickets
				IsVIP:             j > 0 && rand.Float32() < 0.3, // 30% chance for non-first tickets
			}
			
			if err := database.GetDB().Create(&ticketType).Error; err != nil {
				return fmt.Errorf("failed to create ticket type: %v", err)
			}
			allTicketTypes = append(allTicketTypes, ticketType)
		}
	}
	
	// Create 100 registrations
	fmt.Println("Creating 100 registrations...")
	
	for i := 1; i <= 100; i++ {
		user := regularUsers[rand.Intn(len(regularUsers))]
		ticketType := allTicketTypes[rand.Intn(len(allTicketTypes))]
		
		// Get event for this ticket type
		var event models.Event
		database.GetDB().First(&event, ticketType.EventID)
		
		registration := models.Registration{
			UserID:       user.ID,
			EventID:      event.ID,
			TicketTypeID: ticketType.ID,
			TotalPrice:   ticketType.Price,
			Status:       models.RegistrationStatusConfirmed,
		}
		
		if err := database.GetDB().Create(&registration).Error; err != nil {
			return fmt.Errorf("failed to create registration %d: %v", i, err)
		}
	}
	
	fmt.Println("SUCCESS: test data generation complete!")
	fmt.Println("Generated:")
	fmt.Println("   - 10 Event Organizers")
	fmt.Println("   - 50 Regular Users") 
	fmt.Println("   - 25 Events")
	fmt.Println("   - 100 Event Registrations")
	fmt.Println("Default password for all users: password123")
	fmt.Println("")
	fmt.Println("Test Accounts:")
	fmt.Println("   Organizers: organizer1@events.com.au to organizer10@events.com.au")
	fmt.Println("   Users: user1@gmail.com to user50@gmail.com")
	
	return nil
}