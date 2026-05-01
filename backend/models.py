from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List

db = SQLAlchemy()

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    require_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    carousel_interval: Mapped[int] = mapped_column(Integer, default=5000)  # milliseconds
    display_mode: Mapped[str] = mapped_column(String(20), default='carousel')  # carousel or waterfall
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    photos: Mapped[List['Photo']] = relationship('Photo', back_populates='room', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'require_approval': self.require_approval,
            'carousel_interval': self.carousel_interval,
            'display_mode': self.display_mode,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Photo(db.Model):
    __tablename__ = 'photos'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey('rooms.id'), nullable=False, index=True)
    uploader_ip: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='pending')  # pending, approved, rejected
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    room: Mapped['Room'] = relationship('Room', back_populates='photos')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_name': self.original_name,
            'room_id': self.room_id,
            'uploader_ip': self.uploader_ip,
            'status': self.status,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None
        }
