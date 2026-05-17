from azure.communication.email import EmailClient
from app.core.config import settings
import os

def send_email(to_email: str, subject: str, message: str):
    connection_string = os.environ.get("COMMUNICATION_SERVICES_CONNECTION_STRING") or settings.COMMUNICATION_SERVICES_CONNECTION_STRING
    
    if not connection_string:
        print("Azure Communication connection string missing. Would have sent:")
        print(f"To: {to_email}\nSubject: {subject}\nMessage: {message}")
        return

    try:
        client = EmailClient.from_connection_string(connection_string)

        email_message = {
            "senderAddress": "DoNotReply@9f2d5323-3f87-45ef-bfea-7ed37fcc10a8.azurecomm.net",
            "recipients": {
                "to": [{"address": to_email}],
            },
            "content": {
                "subject": subject,
                "plainText": message,
                "html": message if "<html>" in message else f"<html><body>{message}</body></html>"
            }
        }

        poller = client.begin_send(email_message)
        result = poller.result()
        print(f"Email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
