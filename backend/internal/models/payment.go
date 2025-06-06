package models

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

type PaymentMethod string

const (
	PaymentMethodCreditCard PaymentMethod = "credit_card"
	PaymentMethodPaypal PaymentMethod = "paypal"
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"
	PaymentMethodOther PaymentMethod = "other"
)

type Payment struct {
	Base
	RegistrationID uint          `json:"registration_id"`
	Amount         float64       `gorm:"type:decimal(10,2);not null" json:"amount"`
	Status         PaymentStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Method         PaymentMethod `gorm:"type:varchar(20)" json:"method"`
	TransactionID  string        `gorm:"type:varchar(255)" json:"transaction_id"`
	PaymentDate    *time.Time    `json:"payment_date,omitempty"`

	Registration Registration `gorm:"foreignKey:RegistrationID" json:"-"`
}


func (Payment) TableName() string {
	return "payments"
}


func (p *Payment) Process(db *gorm.DB) error {
	p.Status = PaymentStatusCompleted
	now := time.Now()
	p.PaymentDate = &now

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(p).Error; err != nil {
			return err
		}

		var registration Registration
		if err := tx.First(&registration, p.RegistrationID).Error; err != nil {
			return err
		}

		registration.Status = RegistrationStatusConfirmed
		if err := tx.Save(&registration).Error; err != nil {
			return err
		}

		return nil
	})

	return err
}

func (p *Payment) Refund(db *gorm.DB) error {
	if p.Status != PaymentStatusCompleted {
		return errors.New("only completed payments can be refunded")
	}

	p.Status = PaymentStatusRefunded

	err := db.Transaction(func(tx *gorm.DB) error {
		// Save the payment
		if err := tx.Save(p).Error; err != nil {
			return err
		}

		var registration Registration
		if err := tx.First(&registration, p.RegistrationID).Error; err != nil {
			return err
		}

		registration.Status = RegistrationStatusCanceled
		if err := tx.Save(&registration).Error; err != nil {
			return err
		}

		return nil
	})

	return err
}

func FindPaymentByID(db *gorm.DB, id uint) (*Payment, error) {
	var payment Payment
	result := db.First(&payment, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &payment, nil
}

func FindPaymentsByRegistration(db *gorm.DB, registrationID uint) ([]Payment, error) {
	var payments []Payment
	result := db.Where("registration_id = ?", registrationID).Order("created_at DESC").Find(&payments)
	return payments, result.Error
}

func CreatePayment(db *gorm.DB, registrationID uint, amount float64, method PaymentMethod, transactionID string) (*Payment, error) {
	payment := Payment{
		RegistrationID: registrationID,
		Amount:         amount,
		Status:         PaymentStatusPending,
		Method:         method,
		TransactionID:  transactionID,
	}

	result := db.Create(&payment)
	if result.Error != nil {
		return nil, result.Error
	}

	return &payment, nil
}
