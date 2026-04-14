import os
import json
import logging
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from app.core.config import GOOGLE_OAUTH_CREDENTIALS_FILE, GOOGLE_DRIVE_FOLDER_ID

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.file']

# Path to store the refresh token after first-time auth
TOKEN_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'credentials', 'token.json')


def _get_drive_service():
    """
    Build and return an authenticated Google Drive service using OAuth2.
    On first run, it opens a browser for user consent.
    After that, uses the saved refresh token automatically.
    """
    if not GOOGLE_OAUTH_CREDENTIALS_FILE:
        raise ValueError("GOOGLE_OAUTH_CREDENTIALS_FILE environment variable is not set")
    if not os.path.exists(GOOGLE_OAUTH_CREDENTIALS_FILE):
        raise FileNotFoundError(f"OAuth credentials file not found: {GOOGLE_OAUTH_CREDENTIALS_FILE}")

    creds = None

    # Load existing token if available
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # If no valid credentials, do the OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Refreshing expired OAuth token...")
            creds.refresh(Request())
        else:
            logger.info("Starting OAuth2 authorization flow (first-time setup)...")
            flow = InstalledAppFlow.from_client_secrets_file(
                GOOGLE_OAUTH_CREDENTIALS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=9090)
            logger.info("OAuth2 authorization successful!")

        # Save the token for future runs
        os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
        logger.info(f"Token saved to {TOKEN_FILE}")

    service = build('drive', 'v3', credentials=creds)
    return service


def upload_to_drive(file_path: str, filename: str) -> str:
    """
    Upload a local file to the configured Google Drive folder.

    Args:
        file_path: Absolute path to the local file to upload.
        filename: The name the file should have in Google Drive.

    Returns:
        The web view link of the uploaded file.
    """
    if not GOOGLE_DRIVE_FOLDER_ID:
        raise ValueError("GOOGLE_DRIVE_FOLDER_ID environment variable is not set")

    service = _get_drive_service()

    file_metadata = {
        'name': filename,
        'parents': [GOOGLE_DRIVE_FOLDER_ID]
    }

    # Determine MIME type based on extension
    extension = os.path.splitext(filename)[1].lower()
    mime_map = {
        '.webm': 'video/webm',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
    }
    mime_type = mime_map.get(extension, 'video/webm')

    media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)

    logger.info(f"Uploading '{filename}' to Google Drive folder {GOOGLE_DRIVE_FOLDER_ID}...")

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink'
    ).execute()

    web_link = file.get('webViewLink', f"https://drive.google.com/file/d/{file.get('id')}/view")
    logger.info(f"Upload successful! Drive link: {web_link}")

    return web_link
