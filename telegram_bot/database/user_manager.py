import json
import os
from typing import Dict, Optional

class UserManager:
    def __init__(self, data_file: str = "users.json"):
        self.data_file = os.path.join(os.path.dirname(__file__), data_file)
        self.users: Dict[int, Dict] = self._load_users()
    
    def _load_users(self) -> Dict[int, Dict]:
        """Load users from JSON file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return {int(k): v for k, v in json.load(f).items()}
            except (json.JSONDecodeError, ValueError):
                return {}
        return {}
    
    def _save_users(self):
        """Save users to JSON file"""
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)
    
    def register_user(self, user_id: int, telegram_data: Dict, custom_name: str = None) -> bool:
        """Register a new user or update existing user"""
        user_data = {
            "telegram_id": user_id,
            "username": telegram_data.get("username"),
            "first_name": telegram_data.get("first_name"),
            "last_name": telegram_data.get("last_name"),
            "custom_name": custom_name or telegram_data.get("first_name"),
            "settings": {
                "notifications_enabled": True,
                "sleep_reminders": True,
                "wake_reminders": True
            },
            "registered": True
        }
        
        self.users[user_id] = user_data
        self._save_users()
        return True
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user data by ID"""
        return self.users.get(user_id)
    
    def is_registered(self, user_id: int) -> bool:
        """Check if user is registered"""
        user = self.get_user(user_id)
        return user is not None and user.get("registered", False)
    
    def update_user_name(self, user_id: int, custom_name: str) -> bool:
        """Update user's custom name"""
        if user_id in self.users:
            self.users[user_id]["custom_name"] = custom_name
            self._save_users()
            return True
        return False
    
    def update_user_settings(self, user_id: int, settings: Dict) -> bool:
        """Update user's notification settings"""
        if user_id in self.users:
            self.users[user_id]["settings"].update(settings)
            self._save_users()
            return True
        return False