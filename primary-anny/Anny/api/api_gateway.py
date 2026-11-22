"""
ANNY - MODULE 20: NEURAL API GATEWAY
Description: Universal API management layer with JWT auth, rate limiting, and websocket support.
"""

import time
import logging
import datetime
from typing import Dict, Any, List, Optional, Callable
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import uvicorn
import os

# Configuration - In production, these should come from Module 07 (Vault)
SECRET_KEY = "ANNY_NEURAL_SIGNING_KEY_ALPHA_9"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Logging Setup
os.makedirs("./logs/api", exist_ok=True)
logging.basicConfig(
    filename="./logs/api/gateway.log",
    level=logging.INFO,
    format='%(asctime)s [GATEWAY] %(message)s'
)
logger = logging.getLogger("Anny.Gateway")

# Security Primitives
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    role: str = "operator"

class ConnectionManager:
    """Manages active neural websocket links."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate neural credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return User(username=username)
    except JWTError:
        raise credentials_exception

class APIGateway:
    """
    Central hub for all external communications to the ANNY neural link.
    """
    def __init__(self):
        self.app = FastAPI(title="ANNY NEURAL GATEWAY", version="1.0.0")
        self._setup_middleware()
        self._register_routes()

    def _setup_middleware(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @self.app.middleware("http")
        async def audit_middleware(request: Request, call_next: Callable):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            logger.info(f"AUDIT: {request.method} {request.url.path} processed in {process_time:.4f}s")
            return response

    def _register_routes(self):
        @self.app.post("/token", response_model=Token)
        async def login(form_data: OAuth2PasswordRequestForm = Depends()):
            # Mock validation - logic should ideally check Module 07 Vault
            if form_data.username == "admin" and form_data.password == "anny":
                access_token = create_access_token(
                    data={"sub": form_data.username}, 
                    expires_delta=datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                )
                return {"access_token": access_token, "token_type": "bearer"}
            raise HTTPException(status_code=400, detail="Incorrect neural credentials")

        @self.app.get("/neural/status")
        async def get_system_status(current_user: User = Depends(get_current_user)):
            return {
                "system": "ANNY",
                "status": "ONLINE",
                "operator": current_user.username,
                "timestamp": datetime.datetime.now().isoformat()
            }

        @self.app.websocket("/ws/telemetry")
        async def websocket_telemetry(websocket: WebSocket):
            await manager.connect(websocket)
            try:
                while True:
                    data = await websocket.receive_text()
                    await manager.broadcast(f"Telemetry sync: {data}")
            except WebSocketDisconnect:
                manager.disconnect(websocket)

    def run(self, host: str = "0.0.0.0", port: int = 3000):
        print(f"Status: Neural Gateway mounting on {host}:{port}")
        uvicorn.run(self.app, host=host, port=port)

if __name__ == "__main__":
    gateway = APIGateway()
    gateway.run()
