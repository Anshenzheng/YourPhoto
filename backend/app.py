import os
import uuid
import secrets
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image

from config import Config
from models import db, Room, Photo

app = Flask(__name__)
app.config.from_object(Config)

# 配置CORS - 允许所有来源和所有方法
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
}, supports_credentials=True)

db.init_app(app)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_room_code():
    return secrets.token_hex(4).upper()[:8]

def create_upload_dirs():
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

# 统一处理OPTIONS请求
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

# 房间管理 API
@app.route('/api/rooms', methods=['GET', 'OPTIONS'])
def get_rooms():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    rooms = Room.query.order_by(Room.created_at.desc()).all()
    return jsonify({
        'success': True,
        'rooms': [room.to_dict() for room in rooms]
    })

@app.route('/api/rooms/<int:room_id>', methods=['GET', 'OPTIONS'])
def get_room(room_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.get_or_404(room_id)
    return jsonify({
        'success': True,
        'room': room.to_dict()
    })

@app.route('/api/rooms/code/<code>', methods=['GET', 'OPTIONS'])
def get_room_by_code(code):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.filter_by(code=code).first_or_404()
    return jsonify({
        'success': True,
        'room': room.to_dict()
    })

@app.route('/api/rooms', methods=['POST', 'OPTIONS'])
def create_room():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({
            'success': False,
            'message': '房间名称不能为空'
        }), 400
    
    code = generate_room_code()
    while Room.query.filter_by(code=code).first():
        code = generate_room_code()
    
    room = Room(
        name=data['name'],
        code=code,
        require_approval=data.get('require_approval', True),
        carousel_interval=data.get('carousel_interval', 5000),
        display_mode=data.get('display_mode', 'carousel')
    )
    db.session.add(room)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'room': room.to_dict()
    }), 201

@app.route('/api/rooms/<int:room_id>', methods=['PUT', 'OPTIONS'])
def update_room(room_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.get_or_404(room_id)
    data = request.get_json()
    
    if data.get('name'):
        room.name = data['name']
    if 'require_approval' in data:
        room.require_approval = data['require_approval']
    if data.get('carousel_interval'):
        room.carousel_interval = data['carousel_interval']
    if data.get('display_mode'):
        room.display_mode = data['display_mode']
    if 'is_active' in data:
        room.is_active = data['is_active']
    
    db.session.commit()
    return jsonify({
        'success': True,
        'room': room.to_dict()
    })

@app.route('/api/rooms/<int:room_id>', methods=['DELETE', 'OPTIONS'])
def delete_room(room_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.get_or_404(room_id)
    
    # 删除房间的所有照片文件
    for photo in room.photos:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], photo.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.session.delete(room)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '房间已删除'
    })

# 照片管理 API
@app.route('/api/rooms/<int:room_id>/photos', methods=['GET', 'OPTIONS'])
def get_photos(room_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.get_or_404(room_id)
    status = request.args.get('status', 'approved')
    
    photos = Photo.query.filter_by(room_id=room_id)
    
    if status != 'all':
        photos = photos.filter_by(status=status)
    
    photos = photos.order_by(Photo.uploaded_at.desc()).all()
    
    return jsonify({
        'success': True,
        'photos': [photo.to_dict() for photo in photos]
    })

@app.route('/api/rooms/<room_code>/upload', methods=['POST', 'OPTIONS'])
def upload_photo(room_code):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    room = Room.query.filter_by(code=room_code).first_or_404()
    
    if 'photo' not in request.files:
        return jsonify({
            'success': False,
            'message': '没有上传文件'
        }), 400
    
    file = request.files['photo']
    
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': '没有选择文件'
        }), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'message': '不支持的文件格式'
        }), 400
    
    create_upload_dirs()
    
    # 生成唯一文件名
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    file.save(file_path)
    
    # 压缩图片
    try:
        with Image.open(file_path) as img:
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            img.thumbnail((1920, 1920))
            img.save(file_path, 'JPEG' if ext in ['.jpg', '.jpeg'] else ext[1:].upper())
    except Exception as e:
        print(f"图片压缩失败: {e}")
    
    # 确定照片状态
    status = 'approved' if not room.require_approval else 'pending'
    
    photo = Photo(
        filename=filename,
        original_name=secure_filename(file.filename),
        room_id=room.id,
        uploader_ip=request.remote_addr,
        status=status,
        approved_at=datetime.utcnow() if status == 'approved' else None
    )
    db.session.add(photo)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '上传成功' if status == 'approved' else '上传成功，等待审核',
        'photo': photo.to_dict()
    }), 201

@app.route('/api/photos/<int:photo_id>/approve', methods=['POST', 'OPTIONS'])
def approve_photo(photo_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    photo = Photo.query.get_or_404(photo_id)
    photo.status = 'approved'
    photo.approved_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'photo': photo.to_dict()
    })

@app.route('/api/photos/<int:photo_id>/reject', methods=['POST', 'OPTIONS'])
def reject_photo(photo_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    photo = Photo.query.get_or_404(photo_id)
    photo.status = 'rejected'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'photo': photo.to_dict()
    })

@app.route('/api/photos/<int:photo_id>', methods=['DELETE', 'OPTIONS'])
def delete_photo(photo_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    photo = Photo.query.get_or_404(photo_id)
    
    # 删除文件
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], photo.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.session.delete(photo)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '照片已删除'
    })

# 照片文件服务 - 添加CORS头
@app.route('/uploads/<filename>')
def serve_photo(filename):
    response = make_response(send_from_directory(app.config['UPLOAD_FOLDER'], filename))
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

# 添加错误处理器
@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        'success': False,
        'message': 'Method Not Allowed'
    }), 405

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Resource Not Found'
    }), 404

# 创建数据库表
with app.app_context():
    db.create_all()
    create_upload_dirs()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
