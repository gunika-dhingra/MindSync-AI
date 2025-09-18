# core/config.py
import os
from dotenv import load_dotenv

# Load .env into environment variables
load_dotenv()

# Gemini model name (set in .env, fallback provided)
MODEL = os.getenv("LC_MODEL", "gemini-1.5-flash")

# Timezone string (used later if you normalize deadlines or format output)
TZ = os.getenv("TZ", "UTC")

# API key is read by langchain-google-genai automatically from GOOGLE_API_KEY
# so we don’t need to expose it directly here.
