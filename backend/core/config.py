
import os
from dotenv import load_dotenv


load_dotenv()

MODEL = os.getenv("LC_MODEL", "gemini-1.5-flash")

TZ = os.getenv("TZ", "UTC")
