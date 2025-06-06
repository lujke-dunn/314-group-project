
package models

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	Base
	Email        string        `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	PasswordHash string        `gorm:"type:varchar(100);not null" json:"-"`
	FirstName    string        `gorm:"type:varchar(100)" json:"first_name"`
	LastName     string        `gorm:"type:varchar(100)" json:"last_name"`
	Phone        string        `gorm:"type:varchar(20)" json:"phone"`
	IsAdmin      bool          `gorm:"default:false" json:"is_admin"`
	IsOrganizer  bool          `gorm:"default:false" json:"is_organizer"`
	Events       []Event       `gorm:"foreignKey:UserID" json:"-"`
	Registrations []Registration `gorm:"foreignKey:UserID" json:"-"`
	Feedbacks    []EventFeedback `gorm:"foreignKey:UserID" json:"-"`
	Notifications []Notification  `gorm:"foreignKey:UserID" json:"-"`
}

func (User) TableName() string {
	return "users"
}

func (u *User) BeforeSave(tx *gorm.DB) error {
	if u.PasswordHash != "" && len(u.PasswordHash) != 60 {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.PasswordHash), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.PasswordHash = string(hash)
	}
	return nil
}

func (u *User) SetPassword(password string) error {
	if password == "" {
		return errors.New("Password cannot be empty")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	u.PasswordHash = string(hash)
	return nil 
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

func (u *User) GetCreatedEvents(db *gorm.DB) ([]Event, error) {
	var events []Event
	result := db.Where("user_id = ?", u.ID).Find(&events)
	return events, result.Error
}

func (u *User) GetRegisteredEvents(db *gorm.DB) ([]Event, error) {
	var events []Event
	result := db.Joins("JOIN registrations ON registrations.event_id = events.id").
		Where("registrations.user_id = ?", u.ID).
		Find(&events)
	return events, result.Error
}

func FindUserByEmail(db *gorm.DB, email string) (*User, error) {
	var user User
	result := db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func FindUserByID(db *gorm.DB, id uint) (*User, error) {
	var user User
	result := db.First(&user, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}
