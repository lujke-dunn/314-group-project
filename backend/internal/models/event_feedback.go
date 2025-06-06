package models

import (
	"errors"
	"gorm.io/gorm"
)

type EventFeedback struct {
	Base
	EventID     uint   `json:"event_id"`
	UserID      uint   `json:"user_id"`
	Rating      int    `gorm:"not null" json:"rating"`
	Comment     string `gorm:"type:text" json:"comment"`
	
	Event       Event  `gorm:"foreignKey:EventID" json:"-"`
	User        User   `gorm:"foreignKey:UserID" json:"-"`
}

func (EventFeedback) TableName() string {
	return "event_feedbacks"
}

func (f *EventFeedback) BeforeCreate(tx *gorm.DB) error {
	// Validate rating range (1-5)
	if f.Rating < 1 || f.Rating > 5 {
		return errors.New("rating must be between 1 and 5")
	}
	
	// Check if user has already provided feedback for this event
	var count int64
	tx.Model(&EventFeedback{}).Where("event_id = ? AND user_id = ?", f.EventID, f.UserID).Count(&count)
	if count > 0 {
		return errors.New("user has already provided feedback for this event")
	}
	
	return nil
}

func FindFeedbackByEventAndUser(db *gorm.DB, eventID, userID uint) (*EventFeedback, error) {
	var feedback EventFeedback
	result := db.Where("event_id = ? AND user_id = ?", eventID, userID).First(&feedback)
	if result.Error != nil {
		return nil, result.Error
	}
	return &feedback, nil
}

func FindFeedbackByEvent(db *gorm.DB, eventID uint) ([]EventFeedback, error) {
	var feedbacks []EventFeedback
	result := db.Where("event_id = ?", eventID).Order("created_at DESC").Find(&feedbacks)
	return feedbacks, result.Error
}

func GetAverageRatingForEvent(db *gorm.DB, eventID uint) (float64, error) {
	var result struct {
		AvgRating float64
	}
	
	err := db.Model(&EventFeedback{}).
		Select("COALESCE(AVG(rating), 0) as avg_rating").
		Where("event_id = ?", eventID).
		Scan(&result).Error
	
	return result.AvgRating, err
}

func CreateFeedback(db *gorm.DB, eventID, userID uint, rating int, comment string) (*EventFeedback, error) {
	feedback := EventFeedback{
		EventID: eventID,
		UserID:  userID,
		Rating:  rating,
		Comment: comment,
	}
	
	result := db.Create(&feedback)
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &feedback, nil
}