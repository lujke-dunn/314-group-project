package models

import (
	"gorm.io/gorm"
)

type NotificationType string

const (
	NotificationTypeEventUpdate NotificationType = "event_update"
	NotificationTypeRegistration NotificationType = "registration"
	NotificationTypePayment NotificationType = "payment"
	NotificationTypeReminder NotificationType = "reminder"
)

type Notification struct {
	Base
	UserID      uint             `json:"user_id"`
	EventID     *uint            `json:"event_id,omitempty"`
	Title       string           `gorm:"type:varchar(255);not null" json:"title"`
	Message     string           `gorm:"type:text;not null" json:"message"`
	IsRead      bool             `gorm:"default:false" json:"is_read"`
	Type        NotificationType `gorm:"type:varchar(20);not null" json:"type"`
	
	User        User             `gorm:"foreignKey:UserID" json:"-"`
	Event       *Event           `gorm:"foreignKey:EventID" json:"-"`
}

func (Notification) TableName() string {
	return "notifications"
}

func (n *Notification) MarkAsRead(db *gorm.DB) error {
	n.IsRead = true
	return db.Save(n).Error
}

func (n *Notification) MarkAsUnread(db *gorm.DB) error {
	n.IsRead = false
	return db.Save(n).Error
}

func FindNotificationsByUser(db *gorm.DB, userID uint) ([]Notification, error) {
	var notifications []Notification
	result := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications)
	return notifications, result.Error
}

func FindUnreadNotificationsByUser(db *gorm.DB, userID uint) ([]Notification, error) {
	var notifications []Notification
	result := db.Where("user_id = ? AND is_read = ?", userID, false).Order("created_at DESC").Find(&notifications)
	return notifications, result.Error
}

func CreateNotification(db *gorm.DB, userID uint, eventID *uint, title, message string, notificationType NotificationType) (*Notification, error) {
	notification := Notification{
		UserID:  userID,
		EventID: eventID,
		Title:   title,
		Message: message,
		IsRead:  false,
		Type:    notificationType,
	}
	
	result := db.Create(&notification)
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &notification, nil
}