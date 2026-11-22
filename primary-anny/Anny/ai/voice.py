"""
ANNY - MODULE 05: NEURAL VOICE AI
Description: Local speech-to-text and text-to-speech interface.
"""

import pyttsx3
import speech_recognition as sr
from typing import Optional, List

class VoiceEngine:
    def __init__(self, voice_id: int = 0, rate: int = 150):
        self.tts = pyttsx3.init()
        self.recognizer = sr.Recognizer()
        self.config(voice_id, rate)

    def config(self, voice_id: int, rate: int):
        """Configure voice parameters."""
        voices = self.tts.getProperty('voices')
        if voice_id < len(voices):
            self.tts.setProperty('voice', voices[voice_id].id)
        self.tts.setProperty('rate', rate)

    def speak(self, text: str):
        """Produces synthesized speech."""
        print(f"Anny (Vocalize): {text}")
        self.tts.say(text)
        self.tts.runAndWait()

    def listen(self, duration: int = 5) -> Optional[str]:
        """Listens for a voice command and processes via STT."""
        with sr.Microphone() as source:
            print("Status: Listening for command...")
            self.recognizer.adjust_for_ambient_noise(source)
            try:
                audio = self.recognizer.listen(source, timeout=duration)
                text = self.recognizer.recognize_google(audio)
                print(f"Detected: {text}")
                return text
            except sr.WaitTimeoutError:
                print("Warning: Listen timed out.")
            except sr.UnknownValueError:
                print("Warning: Audio unrecognizable.")
            except Exception as e:
                print(f"Error: {str(e)}")
        return None

    def get_available_voices(self) -> List[str]:
        """Lists all system voices."""
        voices = self.tts.getProperty('voices')
        return [voice.name for voice in voices]

if __name__ == "__main__":
    engine = VoiceEngine()
    engine.speak("System initialized. Vocal pathways established.")
    # To test locally:
    # cmd = engine.listen()
    # if cmd: engine.speak(f"Processing command: {cmd}")
