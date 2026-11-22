class OnlineBrain:
    def __init__(self):
        self.apis = {
            "groq": {"url": "https://api.groq.com/openai/v1/chat/completions", "key": None},
            "google": {"url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", "key": None},
            "huggingface": {"url": "https://api-inference.huggingface.co/models/", "key": None}
        }
        self.current_api = "groq"  # Default
    
    def set_key(self, api_name, key):
        if api_name in self.apis:
            self.apis[api_name]["key"] = key
    
    def think(self, prompt, model="llama-3.3-70b-versatile", temperature=0.7):
        import requests
        
        if self.current_api == "groq" and self.apis["groq"]["key"]:
            headers = {"Authorization": f"Bearer {self.apis['groq']['key']}", "Content-Type": "application/json"}
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature
            }
            try:
                r = requests.post(self.apis["groq"]["url"], headers=headers, json=payload, timeout=60)
                data = r.json()
                return {"response": data["choices"][0]["message"]["content"], "source": "groq", "model": model}
            except Exception as e:
                return {"error": str(e), "fallback": True}
        
        elif self.current_api == "google" and self.apis["google"]["key"]:
            # Google AI Studio free tier
            url = f"{self.apis['google']['url']}?key={self.apis['google']['key']}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            try:
                r = requests.post(url, json=payload, timeout=60)
                data = r.json()
                return {"response": data["candidates"][0]["content"]["parts"][0]["text"], "source": "google", "model": "gemini-2.0-flash"}
            except Exception as e:
                return {"error": str(e), "fallback": True}
        
        return {"error": "No online API configured", "fallback": True}
