package services

import (
	"bytes"
	"fmt"
	"html/template"
	"lujke-dunn/314-group-project/backend/internal/config"
	"lujke-dunn/314-group-project/backend/internal/models"

	"gopkg.in/gomail.v2"
)

type EmailService struct {
	config *config.SMTPConfig
}

func NewEmailService(cfg *config.SMTPConfig) *EmailService {
	return &EmailService{
		config: cfg,
	}
}

func (s *EmailService) SendNotificationEmail(user *models.User, notification *models.Notification) error {
	subject := s.getSubjectForNotificationType(string(notification.Type))
	body, err := s.renderEmailBody(notification)
	if err != nil {
		return fmt.Errorf("failed to render email body: %w", err)
	}

	return s.sendEmail(user.Email, subject, body)
}

func (s *EmailService) sendEmail(to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.config.From)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(s.config.Host, s.config.Port, s.config.Username, s.config.Password)

	return d.DialAndSend(m)
}

func (s *EmailService) sendEmailWithQR(to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.config.From)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(s.config.Host, s.config.Port, s.config.Username, s.config.Password)

	return d.DialAndSend(m)
}

func (s *EmailService) getSubjectForNotificationType(notificationType string) string {
	switch notificationType {
	case "event_update":
		return "Event Update Notification"
	case "registration":
		return "Registration Confirmation"
	case "payment":
		return "Payment Confirmation"
	case "reminder":
		return "Event Reminder"
	default:
		return "Notification from Event Management System"
	}
}

func (s *EmailService) renderEmailBody(notification *models.Notification) (string, error) {
	tmplStr := `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Event Management System</h1>
    </div>
    <div class="content">
        <h2>{{.Title}}</h2>
        <p>{{.Content}}</p>
        {{if .EventID}}
        <p><a href="#" class="button">View Event Details</a></p>
        {{end}}
    </div>
    <div class="footer">
        <p>This is an automated message from the Event Management System.</p>
        <p>Please do not reply to this email.</p>
    </div>
</body>
</html>
`

	tmpl, err := template.New("email").Parse(tmplStr)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, notification)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (s *EmailService) SendRegistrationConfirmation(user *models.User, eventName string, ticketType string) error {
	subject := "Registration Confirmation - " + eventName
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .details {
            background-color: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
        }
        .qr-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .qr-code {
            max-width: 200px;
            height: auto;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Registration Confirmed! &#x2705;</h1>
    </div>
    <div class="content">
        <p>Dear %s,</p>
        <p>Your registration for <strong>%s</strong> has been confirmed!</p>
        <div class="details">
            <h3>Registration Details:</h3>
            <p><strong>Event:</strong> %s</p>
            <p><strong>Ticket Type:</strong> %s</p>
            <p><strong>Status:</strong> Confirmed</p>
        </div>
        <div class="qr-section">
            <h3>Your Ticket QR Code</h3>
            <img src="https://i.imgur.com/9zQX5jE.png" alt="Ticket QR Code" class="qr-code">
            <p><small>Present this QR code at the event entrance</small></p>
        </div>
        <p>We look forward to seeing you at the event!</p>
    </div>
    <div class="footer">
        <p>This is an automated confirmation email.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>
`, user.FirstName, eventName, eventName, ticketType)

	return s.sendEmail(user.Email, subject, body)
}

func (s *EmailService) SendEventUpdateNotification(user *models.User, eventName string, updateMessage string) error {
	subject := "Event Update - " + eventName
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #FF9800;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .update-box {
            background-color: #FFF3CD;
            border: 1px solid #FFEAA7;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Event Update &#x1F4E2;</h1>
    </div>
    <div class="content">
        <p>Dear %s,</p>
        <p>There has been an update to the event: <strong>%s</strong></p>
        <div class="update-box">
            <h3>Update Details:</h3>
            <p>%s</p>
        </div>
        <p>Please review this update as it may affect your attendance.</p>
    </div>
    <div class="footer">
        <p>This is an automated notification from the Event Management System.</p>
    </div>
</body>
</html>
`, user.FirstName, eventName, updateMessage)

	return s.sendEmail(user.Email, subject, body)
}

func (s *EmailService) SendPaymentConfirmation(user *models.User, eventName string, amount float64) error {
	subject := "Payment Confirmation - " + eventName
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2196F3;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .payment-details {
            background-color: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #2196F3;
        }
        .amount {
            font-size: 24px;
            color: #2196F3;
            font-weight: bold;
        }
        .qr-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .qr-code {
            max-width: 200px;
            height: auto;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment Successful! &#x1F4B0;</h1>
    </div>
    <div class="content">
        <p>Dear %s,</p>
        <p>Your payment has been successfully processed!</p>
        <div class="payment-details">
            <h3>Payment Details:</h3>
            <p><strong>Event:</strong> %s</p>
            <p><strong>Amount Paid:</strong> <span class="amount">$%.2f</span></p>
            <p><strong>Status:</strong> Completed</p>
        </div>
        <div class="qr-section">
            <h3>Your Ticket QR Code</h3>
            <img src="cid:qrcode" alt="Ticket QR Code" class="qr-code">
            <p><small>Present this QR code at the event entrance</small></p>
        </div>
        <p>Thank you for your payment. Your registration is now complete.</p>
    </div>
    <div class="footer">
        <p>This is an automated payment confirmation.</p>
        <p>Please keep this email for your records.</p>
    </div>
</body>
</html>
`, user.FirstName, eventName, amount)

	return s.sendEmailWithQR(user.Email, subject, body)
}

func (s *EmailService) SendEventCreatedConfirmation(user *models.User, event *models.Event) error {
	subject := "Event Created Successfully - " + event.Title
	
	locationInfo := ""
	if event.IsVirtual {
		locationInfo = "Virtual Event"
	} else {
		locationInfo = fmt.Sprintf("%s<br>%s, %s %s", event.Venue, event.City, event.State, event.ZipCode)
		if event.Address != "" {
			locationInfo = event.Address + "<br>" + locationInfo
		}
	}
	
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .event-details {
            background-color: white;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .detail-row {
            margin: 10px 0;
            display: flex;
            align-items: flex-start;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #555;
        }
        .detail-value {
            flex: 1;
            color: #333;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            background-color: #FFC107;
            color: #333;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Event Created Successfully! &#x1F389;</h1>
    </div>
    <div class="content">
        <p>Dear %s,</p>
        <p>Your event has been created successfully! Here are the details:</p>
        
        <div class="event-details">
            <h2 style="margin-top: 0; color: #4CAF50;">%s</h2>
            
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="status-badge">Published</span></span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">%s</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Date & Time:</span>
                <span class="detail-value">
                    Start: %s<br>
                    End: %s
                </span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">%s</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Event ID:</span>
                <span class="detail-value">#%d</span>
            </div>
        </div>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Add ticket types to your event</li>
            <li>Share your event with potential attendees</li>
            <li>Monitor registrations through your dashboard</li>
        </ul>
        
        <center>
            <a href="#" class="button">Manage Your Event</a>
        </center>
    </div>
    <div class="footer">
        <p>This is an automated confirmation of your event creation.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>
`, user.FirstName, event.Title, event.Description, 
   event.StartDatetime.Format("Monday, January 2, 2006 at 3:04 PM"),
   event.EndDatetime.Format("Monday, January 2, 2006 at 3:04 PM"),
   locationInfo, event.ID)

	return s.sendEmail(user.Email, subject, body)
}

func (s *EmailService) SendRegistrationCancellationNotification(user *models.User, eventName string, ticketType string, reason string) error {
	subject := "Registration Cancelled - " + eventName
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #DC3545;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
        }
        .details {
            background-color: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #DC3545;
        }
        .reason-box {
            background-color: #F8D7DA;
            border: 1px solid #F5C6CB;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007BFF;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Registration Cancelled &#x274C;</h1>
    </div>
    <div class="content">
        <p>Dear %s,</p>
        <p>We regret to inform you that your registration for <strong>%s</strong> has been cancelled by the event organizer.</p>
        <div class="details">
            <h3>Cancelled Registration Details:</h3>
            <p><strong>Event:</strong> %s</p>
            <p><strong>Ticket Type:</strong> %s</p>
            <p><strong>Status:</strong> Cancelled</p>
        </div>
        %s
        <p>If you believe this cancellation was made in error or if you have any questions, please contact the event organizer or our support team.</p>
        <center>
            <a href="#" class="button">Browse Other Events</a>
        </center>
    </div>
    <div class="footer">
        <p>This is an automated notification from the Event Management System.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>
`, user.FirstName, eventName, eventName, ticketType, func() string {
		if reason != "" {
			return fmt.Sprintf(`<div class="reason-box">
            <h4>Reason for Cancellation:</h4>
            <p>%s</p>
        </div>`, reason)
		}
		return ""
	}())

	return s.sendEmail(user.Email, subject, body)
}