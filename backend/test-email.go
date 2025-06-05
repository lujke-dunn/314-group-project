package main

import (
	"fmt"
	"log"
	"gopkg.in/gomail.v2"
)

func main() {
	m := gomail.NewMessage()
	m.SetHeader("From", "314eventbooker@gmail.com")
	m.SetHeader("To", "lukedunn011@gmail.com")
	m.SetHeader("Subject", "Test Email from Event Management System")
	m.SetBody("text/html", `
		<h1>Test Email</h1>
		<p>This is a test email to verify SMTP configuration is working correctly.</p>
		<p>If you receive this, email sending is configured properly!</p>
	`)

	d := gomail.NewDialer("smtp.gmail.com", 587, "314eventbooker@gmail.com", "jjdtmvcqzwlagzqt")

	fmt.Println("Attempting to send test email...")
	if err := d.DialAndSend(m); err != nil {
		log.Fatal("Failed to send email:", err)
	}
	fmt.Println("Test email sent successfully!")
}