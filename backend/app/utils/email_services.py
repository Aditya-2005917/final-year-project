import os
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")


def _send_email(to_email: str, subject: str, body: str):
    """Internal helper to send a plain-text email."""
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ SMTP credentials not configured. Skipping email dispatch.")
        return False

    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())

        print(f"✅ Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"❌ SMTP Error sending email to {to_email}: {e}")
        return False


def send_reset_email_async(target_email: str, verification_token: str):
    """
    Sends a password reset OTP email in a background thread
    so the API response is not blocked.
    """
    def send():
        body = (
            f"Hello,\n\n"
            f"Your security verification code to reset your AURA Estate password is:\n\n"
            f"    {verification_token}\n\n"
            f"This code will expire in 15 minutes.\n\n"
            f"If you did not request a password reset, please ignore this email.\n\n"
            f"Best regards,\n"
            f"AURA Estate Intelligence Team"
        )
        _send_email(
            to_email=target_email,
            subject="🔒 AURA Estate – Password Reset Code",
            body=body
        )

    threading.Thread(target=send, daemon=True).start()


def send_welcome_email_async(target_email: str, user_name: str = "User"):
    """Optional welcome email after successful signup."""
    def send():
        body = (
            f"Hello {user_name},\n\n"
            f"Welcome to AURA Estate Intelligence!\n\n"
            f"You can now:\n"
            f"• Run AI-powered property valuations\n"
            f"• Save reports to your watchlist\n"
            f"• Chat with our real-estate AI advisor\n"
            f"• Download and email professional PDF reports\n\n"
            f"Happy analysing!\n\n"
            f"Best regards,\n"
            f"AURA Estate Team"
        )
        _send_email(
            to_email=target_email,
            subject="👋 Welcome to AURA Estate Intelligence",
            body=body
        )

    threading.Thread(target=send, daemon=True).start()