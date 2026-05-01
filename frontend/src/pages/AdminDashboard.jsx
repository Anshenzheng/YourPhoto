import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Edit2, Check, X, Eye, Camera, Upload, Settings,
  Clock, Users, Image as ImageIcon, RefreshCw, Copy, ExternalLink,
  Sparkles, Loader2, Monitor
} from 'lucide-react'
import { roomApi, photoApi, getPhotoUrl } from '../services/api'

const AdminDashboard = () => {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photoStatus, setPhotoStatus] = useState('pending')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [initialLoading, setInitialLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    require_approval: true,
    carousel_interval: 5000,
    display_mode: 'carousel'
  })

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const fetchRooms = useCallback(async () => {
    try {
      const result = await roomApi.getAll()
      if (result.success) {
        setRooms(result.rooms)
      }
    } catch (error) {
      console.error('获取房间列表失败:', error)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  const fetchPhotos = useCallback(async (roomId) => {
    try {
      const result = await photoApi.getByRoom(roomId, photoStatus)
      if (result.success) {
        setPhotos(result.photos)
      }
    } catch (error) {
      console.error('获取照片列表失败:', error)
    }
  }, [photoStatus])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    if (selectedRoom) {
      fetchPhotos(selectedRoom.id)
    }
  }, [selectedRoom, photoStatus, fetchPhotos])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await roomApi.create(formData)
      if (result.success) {
        showMessage('success', '房间创建成功！')
        setShowCreateModal(false)
        resetForm()
        await fetchRooms()
        if (result.room) {
          setSelectedRoom(result.room)
        }
      } else {
        showMessage('error', result.message || '创建失败')
      }
    } catch (error) {
      console.error('创建房间错误:', error)
      showMessage('error', '创建房间失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRoom = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await roomApi.update(editingRoom.id, formData)
      if (result.success) {
        showMessage('success', '房间更新成功！')
        setShowEditModal(false)
        resetForm()
        fetchRooms()
        if (selectedRoom && selectedRoom.id === editingRoom.id) {
          setSelectedRoom(result.room)
        }
      } else {
        showMessage('error', result.message || '更新失败')
      }
    } catch (error) {
      showMessage('error', '更新房间失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('确定要删除这个房间吗？所有照片将被永久删除。')) {
      return
    }
    try {
      const result = await roomApi.delete(roomId)
      if (result.success) {
        showMessage('success', '房间删除成功！')
        if (selectedRoom && selectedRoom.id === roomId) {
          setSelectedRoom(null)
        }
        fetchRooms()
      } else {
        showMessage('error', result.message || '删除失败')
      }
    } catch (error) {
      showMessage('error', '删除房间失败，请重试')
    }
  }

  const handleApprovePhoto = async (photoId) => {
    try {
      const result = await photoApi.approve(photoId)
      if (result.success) {
        showMessage('success', '照片已审核通过')
        if (selectedRoom) fetchPhotos(selectedRoom.id)
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  const handleRejectPhoto = async (photoId) => {
    try {
      const result = await photoApi.reject(photoId)
      if (result.success) {
        showMessage('success', '照片已拒绝')
        if (selectedRoom) fetchPhotos(selectedRoom.id)
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('确定要删除这张照片吗？')) {
      return
    }
    try {
      const result = await photoApi.delete(photoId)
      if (result.success) {
        showMessage('success', '照片已删除')
        if (selectedRoom) fetchPhotos(selectedRoom.id)
      }
    } catch (error) {
      showMessage('error', '删除失败')
    }
  }

  const openEditModal = (room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      require_approval: room.require_approval,
      carousel_interval: room.carousel_interval,
      display_mode: room.display_mode
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      require_approval: true,
      carousel_interval: 5000,
      display_mode: 'carousel'
    })
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      showMessage('success', `${label}已复制到剪贴板`)
    })
  }

  const getUploadLink = (code) => {
    return `${window.location.origin}/upload/${code}`
  }

  const getDisplayLink = (code) => {
    return `${window.location.origin}/display/${code}`
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 无房间时的空状态页面
  if (rooms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
                message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">YourPhoto 管理后台</h1>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              创建房间
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Camera className="w-16 h-16 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-800" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              开始创建您的第一个照片房间
            </h2>
            <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto">
              创建一个照片房间，分享上传链接给现场用户，
              他们上传的照片将实时在大屏端展示
            </p>

            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
              <span className="text-lg font-semibold">创建第一个房间</span>
            </button>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">用户上传</h3>
                <p className="text-sm text-gray-500">
                  现场用户通过链接即可上传照片，无需登录
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">审核管理</h3>
                <p className="text-sm text-gray-500">
                  可配置审核机制，确保展示内容合适
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">大屏展示</h3>
                <p className="text-sm text-gray-500">
                  轮播或瀑布流模式，支持过渡动画和全屏
                </p>
              </div>
            </div>
          </motion.div>
        </main>

        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowCreateModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
              >
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="text-xl font-bold text-gray-800">创建新房间</h3>
                  <p className="text-sm text-gray-500 mt-1">配置房间参数开始使用</p>
                </div>
                <form onSubmit={handleCreateRoom} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      房间名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="例如：年会现场、婚礼照片墙"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="require_approval"
                      checked={formData.require_approval}
                      onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="require_approval" className="text-sm font-medium text-gray-700">
                        需要审核照片
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">开启后照片需审核通过才能展示</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      展示模式
                    </label>
                    <select
                      value={formData.display_mode}
                      onChange={(e) => setFormData({ ...formData, display_mode: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="carousel">🎠 轮播模式 - 单张全屏轮播展示</option>
                      <option value="waterfall">🌊 瀑布流模式 - 多列网格同时展示</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      轮播间隔
                    </label>
                    <select
                      value={formData.carousel_interval}
                      onChange={(e) => setFormData({ ...formData, carousel_interval: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value={3000}>⚡ 3 秒 - 快速切换</option>
                      <option value={5000}>⏱️ 5 秒 - 推荐</option>
                      <option value={8000}>🐢 8 秒 - 慢速浏览</option>
                      <option value={10000}>📷 10 秒 - 仔细观赏</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        resetForm()
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          创建中...
                        </span>
                      ) : (
                        '创建房间'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // 有房间时的正常布局
  return (
    <div className="min-h-screen bg-gray-100">
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
              message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">YourPhoto 管理后台</h1>
              <p className="text-xs text-gray-500">共 {rooms.length} 个房间</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRooms}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              创建房间
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-800">房间列表</h2>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">{room.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                          {room.code}
                        </span>
                        {room.require_approval && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            需审核
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(room)
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRoom(room.id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      {room.display_mode === 'carousel' ? '轮播' : '瀑布流'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {room.carousel_interval / 1000}秒
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {selectedRoom ? (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedRoom.name}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">房间码:</span>
                        <code className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-mono font-medium">
                          {selectedRoom.code}
                        </code>
                      </div>
                      {selectedRoom.require_approval && (
                        <span className="text-yellow-600 text-sm flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-lg">
                          <Eye className="w-4 h-4" />
                          需要审核
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800">用户上传链接</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getUploadLink(selectedRoom.code)}
                        className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(getUploadLink(selectedRoom.code), '上传链接')}
                        className="p-2.5 bg-white border border-green-200 hover:bg-green-50 rounded-lg transition-colors"
                        title="复制"
                      >
                        <Copy className="w-4 h-4 text-green-600" />
                      </button>
                      <a
                        href={`/upload/${selectedRoom.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white border border-green-200 hover:bg-green-50 rounded-lg transition-colors"
                        title="打开"
                      >
                        <ExternalLink className="w-4 h-4 text-green-600" />
                      </a>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800">大屏展示链接</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getDisplayLink(selectedRoom.code)}
                        className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(getDisplayLink(selectedRoom.code), '展示链接')}
                        className="p-2.5 bg-white border border-purple-200 hover:bg-purple-50 rounded-lg transition-colors"
                        title="复制"
                      >
                        <Copy className="w-4 h-4 text-purple-600" />
                      </button>
                      <a
                        href={`/display/${selectedRoom.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white border border-purple-200 hover:bg-purple-50 rounded-lg transition-colors"
                        title="打开"
                      >
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">照片管理</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPhotoStatus('pending')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        photoStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      待审核
                    </button>
                    <button
                      onClick={() => setPhotoStatus('approved')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        photoStatus === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      已通过
                    </button>
                    <button
                      onClick={() => setPhotoStatus('rejected')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        photoStatus === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      已拒绝
                    </button>
                    <button
                      onClick={() => selectedRoom && fetchPhotos(selectedRoom.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="刷新"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {photos.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">暂无{photoStatus === 'pending' ? '待审核' : photoStatus === 'approved' ? '已通过' : '已拒绝'}的照片</p>
                      {photoStatus === 'pending' && (
                        <p className="text-sm mt-2 text-gray-400">用户上传的照片将在这里等待审核</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo, index) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="relative group bg-gray-100 rounded-xl overflow-hidden aspect-square"
                        >
                          <img
                            src={getPhotoUrl(photo.filename)}
                            alt={photo.original_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex items-center gap-2">
                              {photoStatus === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprovePhoto(photo.id)}
                                    className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-lg"
                                    title="通过"
                                  >
                                    <Check className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectPhoto(photo.id)}
                                    className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors shadow-lg"
                                    title="拒绝"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                title="删除"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
                <Camera className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-xl font-medium text-gray-700">选择一个房间查看详情</h2>
              <p className="mt-2 text-gray-500">点击左侧房间列表或创建新房间</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            >
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-bold text-gray-800">创建新房间</h3>
                <p className="text-sm text-gray-500 mt-1">配置房间参数开始使用</p>
              </div>
              <form onSubmit={handleCreateRoom} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    房间名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="例如：年会现场、婚礼照片墙"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="require_approval_modal"
                    checked={formData.require_approval}
                    onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="require_approval_modal" className="text-sm font-medium text-gray-700">
                      需要审核照片
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">开启后照片需审核通过才能展示</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展示模式
                  </label>
                  <select
                    value={formData.display_mode}
                    onChange={(e) => setFormData({ ...formData, display_mode: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="carousel">🎠 轮播模式 - 单张全屏轮播展示</option>
                    <option value="waterfall">🌊 瀑布流模式 - 多列网格同时展示</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    轮播间隔
                  </label>
                  <select
                    value={formData.carousel_interval}
                    onChange={(e) => setFormData({ ...formData, carousel_interval: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value={3000}>⚡ 3 秒 - 快速切换</option>
                    <option value={5000}>⏱️ 5 秒 - 推荐</option>
                    <option value={8000}>🐢 8 秒 - 慢速浏览</option>
                    <option value={10000}>📷 10 秒 - 仔细观赏</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        创建中...
                      </span>
                    ) : (
                      '创建房间'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            >
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold text-gray-800">编辑房间</h3>
              </div>
              <form onSubmit={handleEditRoom} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    房间名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入房间名称"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="edit_require_approval"
                    checked={formData.require_approval}
                    onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="edit_require_approval" className="text-sm font-medium text-gray-700">
                      需要审核照片
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">开启后照片需审核通过才能展示</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展示模式
                  </label>
                  <select
                    value={formData.display_mode}
                    onChange={(e) => setFormData({ ...formData, display_mode: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="carousel">🎠 轮播模式</option>
                    <option value="waterfall">🌊 瀑布流模式</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    轮播间隔
                  </label>
                  <select
                    value={formData.carousel_interval}
                    onChange={(e) => setFormData({ ...formData, carousel_interval: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value={3000}>3 秒</option>
                    <option value={5000}>5 秒</option>
                    <option value={8000}>8 秒</option>
                    <option value={10000}>10 秒</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminDashboard
