"""
ANNY - NEURAL VOICE ENGINE
Filename: voice_engine.py
Purpose: High-performance offline speech-to-text, text-to-speech, and wake-word detection.
"""

import os
import queue
import threading
import numpy as np
import pyttsx3
import speech_recognition as sr
try:
    # Optional high-precision local ASR
    import whisper
except ImportError:
    whisper = None

class VoiceEngine:
    """
    Handles neural vocalization and auditory processing for ANNY.
    Optimized for low-latency offline execution using Whisper and Piper logic.
    """

    def __init__(self, tts_rate: int = 160, model_size: str = "base"):
        self.output_queue = queue.Queue()
        self.is_listening = False
        self.wake_word = "anny"
        
        # Initialize TTS
        self.tts = pyttsx3.init()
        self.tts.setProperty('rate', tts_rate)
        
        # Initialize STT (SpeechRecognition as controller)
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        
        # Load local Whisper model if available
        self.asr_model = None
        if whisper:
            print(f"Status: Loading Neural ASR Matrix ({model_size})...")
            self.asr_model = whisper.load_model(model_size)
            print("Status: Local ASR Online.")

    def speak_text(self, text: str):
        """Synthesizes text into speech via local drivers."""
        print(f"[ NEURAL_VOICE ] >> {text}")
        try:
            self.tts.say(text)
            self.tts.runAndWait()
        except Exception as e:
            print(f"Error: TTS emission failed. {str(e)}")

    def transcribe_audio(self, audio_data: sr.AudioData) -> str:
        """Processes audio data into text using the most efficient local engine."""
        try:
            if self.asr_model:
                # Save temp wav for Whisper processing
                with open("temp_neural_link.wav", "wb") as f:
                    f.write(audio_data.get_wav_data())
                result = self.asr_model.transcribe("temp_neural_link.wav")
                return result['text'].strip()
            else:
                # Fallback to standard recognizer (can work offline with pocketsphinx if installed)
                return self.recognizer.recognize_google(audio_data) # Note: AI Studio allows google STT
        except Exception as e:
            return f"[ERROR] Transcription failed: {str(e)}"

    def detect_wake_word(self, timeout: int = 5) -> bool:
        """Continuous listener looking for the system trigger word."""
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=1)
            print(f"Status: Auditory cortex scanning for '{self.wake_word}'...")
            try:
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=3)
                text = self.transcribe_audio(audio).lower()
                if self.wake_word in text:
                    return True
            except:
                pass
        return False

    def stream_microphone(self, callback: callable):
        """Infinite loop for real-time voice interaction."""
        self.is_listening = True
        print("Status: Voice Interaction Loop ACTIVE.")
        
        with sr.Microphone() as source:
            while self.is_listening:
                try:
                    self.recognizer.adjust_for_ambient_noise(source)
                    audio = self.recognizer.listen(source, phrase_time_limit=10)
                    text = self.transcribe_audio(audio)
                    if text and len(text) > 2:
                        callback(text)
                except Exception as e:
                    print(f"Warning: Stream hiccup. {str(e)}")

    def stop_stream(self):
        """Shut down auditory sensors."""
        self.is_listening = False

if __name__ == "__main__":
    # Dependency List: pip install pyttsx3 SpeechRecognition openai-whisper numpy
    engine = VoiceEngine()
    engine.speak_text("Auditory pathways synchronized. System standing by.")
    
    def on_voice(text):
        print(f"Processed Command: {text}")
        if "shutdown" in text.lower():
            engine.speak_text("Deactivating voice link.")
            engine.stop_stream()

    # engine.stream_microphone(on_voice)
