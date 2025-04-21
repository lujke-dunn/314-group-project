// base model which will be the base case for all the models. 

package models

import (
	"time"
	"gorm.io/gorm"
)

type Base struct {
	ID    uint `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` 
}
