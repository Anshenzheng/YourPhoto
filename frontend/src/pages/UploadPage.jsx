import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Upload, X, Check, Image as ImageIcon, 
  Loader2, ArrowLeft, Trash2, Plus
} from 'lucide-react'
import { roomApi, photoApi } from '../services/api'

const UploadPage = () => {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadComplete, setUploadComplete] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // 获取房间信息
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true)
        const result = await roomApi.getByCode(roomCode)
        if (result.success) {
          setRoom(result.room)
          setError(null)
        } else {
          setError('房间不存在')
        }
      } catch (err) {
        setError('获取房间信息失败，请检查链接是否正确')
      } finally {
        setLoading(false)
      }
    }

    if (roomCode) {
      fetchRoom()
    }
  }, [roomCode])

  // 处理文件选择
  const handleFileSelect = useCallback((files) => {
    const newFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/')
      if (!isValid) {
        alert(`不支持的文件格式: ${file.name}`)
      }
      return isValid
    })

    if (newFiles.length === 0) return

    const combinedFiles = [...selectedFiles, ...newFiles].slice(0, 10)
    setSelectedFiles(combinedFiles)

    // 生成预览图
    const newPreviews = newFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }))
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 10))
  }, [selectedFiles])

  // 移除选中的文件
  const removeFile = (index) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)

    const newPreviews = [...previews]
    URL.revokeObjectURL(newPreviews[index].url)
    newPreviews.splice(index, 1)
    setPreviews(newPreviews)
  }

  // 拖拽事件处理
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // 上传照片
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return

    setUploading(true)
    setUploadProgress({})
    setUploadComplete([])

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }))
        
        const result = await photoApi.upload(
          roomCode, 
          file,
          (percent) => {
            setUploadProgress(prev => ({ ...prev, [i]: percent }))
          }
        )

        if (result.success) {
          setUploadComplete(prev => [...prev, i])
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error(`上传失败: ${file.name}`, error)
        setUploadProgress(prev => ({ ...prev, [i]: 'error' }))
      }
    }

    setTimeout(() => {
      setUploading(false)
      setSelectedFiles([])
      previews.forEach(p => URL.revokeObjectURL(p.url))
      setPreviews([])
      setUploadProgress({})
      setUploadComplete([])
    }, 2000)
  }

  // 打开文件选择器
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">房间不存在</h2>
          <p className="text-gray-600 mb-6">{error || '请检查链接是否正确'}</p>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            返回管理后台
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-800">{room.name}</h1>
              <p className="text-xs text-gray-500">
                {room.require_approval ? '上传后需要管理员审核' : '上传后直接展示'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 上传区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileSelector}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : previews.length > 0
                ? 'border-blue-300 bg-blue-50/50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isDragging ? 'bg-blue-200' : 'bg-blue-100'
              }`}>
                <Upload className={`w-8 h-8 ${
                  isDragging ? 'text-blue-700' : 'text-blue-600'
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {isDragging ? '松开上传' : '点击或拖拽上传照片'}
              </h3>
              <p className="text-sm text-gray-500">
                支持 JPG、PNG、GIF、WEBP 格式，最多10张
              </p>
              <p className="text-xs text-gray-400 mt-2">
                📱 手机端点击可直接调用相机拍照
              </p>
            </div>
          </div>
        </motion.div>

        {/* 预览区域 */}
        <AnimatePresence>
          {previews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  已选择 {previews.length} 张照片
                </h3>
                {selectedFiles.length < 10 && (
                  <button
                    onClick={openFileSelector}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    添加更多
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previews.map((preview, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                    {/* 上传进度覆盖层 */}
                    {uploadProgress[index] !== undefined && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        {uploadProgress[index] === 'error' ? (
                          <>
                            <X className="w-8 h-8 text-red-500 mb-2" />
                            <span className="text-white text-sm">上传失败</span>
                          </>
                        ) : uploadComplete.includes(index) ? (
                          <>
                            <Check className="w-8 h-8 text-green-500 mb-2" />
                            <span className="text-white text-sm">上传成功</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 relative">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.3)"
                                  strokeWidth="4"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeDasharray={125.6}
                                  strokeDashoffset={125.6 - (125.6 * (uploadProgress[index] || 0) / 100)}
                                  className="transition-all duration-150"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
                                {uploadProgress[index] || 0}%
                              </span>
                            </div>
                            <span className="text-white text-xs mt-2">上传中...</span>
                          </>
                        )}
                      </div>
                    )}
                    {/* 删除按钮 */}
                    {uploadProgress[index] === undefined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 上传按钮 */}
        {previews.length > 0 && !uploading && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleUpload}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 active:scale-98"
          >
            <span className="flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              上传 {previews.length} 张照片
            </span>
          </motion.button>
        )}

        {/* 上传中状态 */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full py-4 bg-gray-400 text-white font-semibold rounded-2xl text-center cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              上传中...
            </span>
          </motion.div>
        )}

        {/* 提示信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            {room.require_approval
              ? '照片上传后需要管理员审核，审核通过后将在大屏展示'
              : '照片上传后将直接在大屏展示'
            }
          </p>
        </motion.div>
      </main>
    </div>
  )
}

export default UploadPage
