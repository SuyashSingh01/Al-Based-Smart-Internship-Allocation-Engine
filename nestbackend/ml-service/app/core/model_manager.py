import os
import joblib
import numpy as np
from pathlib import Path
from loguru import logger
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import StandardScaler
from typing import Optional

from app.core.config import settings

class ModelManager:
    def __init__(self):
        self.skill_encoder: Optional[SentenceTransformer] = None
        self.scaler: Optional[StandardScaler] = None
        self.model_path = Path(settings.MODEL_PATH)
        self.model_path.mkdir(parents=True, exist_ok=True)
        
    async def load_models(self):
        try:
            logger.info("Loading sentence transformer model...")
            self.skill_encoder = SentenceTransformer('all-MiniLM-L6-v2')
            
            scaler_path = self.model_path / "scaler.pkl"
            if scaler_path.exists():
                logger.info("Loading existing scaler...")
                self.scaler = joblib.load(scaler_path)
            else:
                logger.info("Creating new scaler...")
                self.scaler = StandardScaler()
                
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    async def cleanup(self):
        logger.info("Cleaning up model resources...")
        self.skill_encoder = None
        self.scaler = None
    
    def save_scaler(self):
        scaler_path = self.model_path / "scaler.pkl"
        joblib.dump(self.scaler, scaler_path)
        logger.info(f"Scaler saved to {scaler_path}")
    
    def encode_skills(self, skills: list[str]) -> np.ndarray:
        if not self.skill_encoder:
            raise RuntimeError("Skill encoder not loaded")
        
        if not skills:
            return np.zeros((1, 384))
        
        embeddings = self.skill_encoder.encode(skills)
        return np.mean(embeddings, axis=0).reshape(1, -1)
    
    def get_skill_encoder(self) -> SentenceTransformer:
        if not self.skill_encoder:
            raise RuntimeError("Skill encoder not loaded")
        return self.skill_encoder
    
    def get_scaler(self) -> StandardScaler:
        if not self.scaler:
            raise RuntimeError("Scaler not loaded")
        return self.scaler
