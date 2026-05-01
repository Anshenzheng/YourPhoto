import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, Pause, Play, ChevronLeft, ChevronRight, 
  Grid, Layout, Eye, Camera, X, RefreshCw, Maximize,
  Settings, Monitor
} from 'lucide-react'
import { roomApi, photoApi, getPhotoUrl } from '../services/api'

const DisplayPage = () => {
  const { roomCode } = useParams()
  const [room, setRoom] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showControls, setShowControls] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayMode, setDisplayMode] = useState('carousel')
  const [carouselInterval, setCarouselInterval] = useState(5000)
  const [showSettings, setShowSettings] = useState(false)
  const controlTimeoutRef = useRef(null)
  const carouselRef = useRef(null)

  // 获取房间信息和照片
  const fetchData = useCallback(async () => {
    try {
      const roomResult = await roomApi.getByCode(roomCode)
      if (roomResult.success) {
        setRoom(roomResult.room)
        setDisplayMode(roomResult.room.display_mode)
        setCarouselInterval(roomResult.room.carousel_interval)
      }

      const photosResult = await photoApi.getByRoom(roomResult.room.id, 'approved')
      if (photosResult.success) {
        setPhotos(photosResult.photos.reverse())
      }
      setError(null)
    } catch (err) {
      setError('获取数据失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }, [roomCode])

  useEffect(() => {
    fetchData()
    // 定时刷新照片列表
    const refreshInterval = setInterval(fetchData, 10000)
    return () => clearInterval(refreshInterval)
  }, [fetchData])

  // 自动轮播
  useEffect(() => {
    if (!isPlaying || photos.length === 0 || displayMode !== 'carousel') {
      if (carouselRef.current) {
        clearInterval(carouselRef.current)
      }
      return
    }

    carouselRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, carouselInterval)

    return () => {
      if (carouselRef.current) {
        clearInterval(carouselRef.current)
      }
    }
  }, [isPlaying, photos.length, carouselInterval, displayMode])

  // 鼠标移动显示控制栏
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlTimeoutRef.current) {
      clearTimeout(controlTimeoutRef.current)
    }
    controlTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  // 切换到上一张
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  // 切换到下一张
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  // 切换显示模式
  const toggleDisplayMode = () => {
    setDisplayMode((prev) => (prev === 'carousel' ? 'waterfall' : 'carousel'))
  }

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
          <p className="mt-6 text-gray-400 text-lg">加载中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">房间不存在</h2>
          <p className="text-gray-400">{error || '请检查链接是否正确'}</p>
        </motion.div>
      </div>
    )
  }

  // 无照片状态
  if (photos.length === 0) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
        onMouseMove={handleMouseMove}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-12 h-12 text-white/50" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">{room.name}</h2>
          <p className="text-gray-400 text-lg">等待照片上传...</p>
          <p className="text-gray-500 mt-2">房间码: {room.code}</p>
          <button
            onClick={fetchData}
            className="mt-6 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <RefreshCw className="w-5 h-5" />
            刷新
          </button>
        </motion.div>

        {/* 控制栏 */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4"
            >
              <span className="text-white/80 text-sm">{room.name}</span>
              <span className="text-white/50 text-sm">|</span>
              <span className="text-white/80 text-sm">暂无照片</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* 轮播模式 */}
      {displayMode === 'carousel' && (
        <div className="relative w-full h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <img
                src={getPhotoUrl(photos[currentIndex].filename)}
                alt={`照片 ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </motion.div>
          </AnimatePresence>

          {/* 背景模糊效果 */}
          <div className="absolute inset-0 -z-10">
            <img
              src={getPhotoUrl(photos[currentIndex].filename)}
              alt=""
              className="w-full h-full object-cover opacity-30 blur-2xl"
            />
          </div>

          {/* 左右切换按钮 */}
          <AnimatePresence>
            {showControls && photos.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={goToPrev}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={goToNext}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 瀑布流模式 */}
      {displayMode === 'waterfall' && (
        <div className="w-full h-screen overflow-auto p-4">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="break-inside-avoid"
              >
                <div className="relative group rounded-xl overflow-hidden bg-gray-800">
                  <img
                    src={getPhotoUrl(photo.filename)}
                    alt={photo.original_name}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 顶部控制栏 */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">{room.name}</h2>
                  <p className="text-white/60 text-sm">
                    共 {photos.length} 张照片
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部控制栏 */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
          >
            <div className="max-w-4xl mx-auto">
              {/* 进度指示器 */}
              {displayMode === 'carousel' && photos.length > 1 && (
                <div className="flex justify-center gap-2 mb-4">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                {/* 显示模式切换 */}
                <button
                  onClick={toggleDisplayMode}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  {displayMode === 'carousel' ? (
                    <>
                      <Grid className="w-5 h-5" />
                      <span className="text-sm">瀑布流</span>
                    </>
                  ) : (
                    <>
                      <Layout className="w-5 h-5" />
                      <span className="text-sm">轮播</span>
                    </>
                  )}
                </button>

                {/* 播放/暂停 */}
                {displayMode === 'carousel' && (
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 transition-colors shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>
                )}

                {/* 刷新按钮 */}
                <button
                  onClick={fetchData}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm">刷新</span>
                </button>
              </div>

              {/* 照片计数 */}
              {displayMode === 'carousel' && (
                <div className="text-center mt-3">
                  <span className="text-white/80 text-sm">
                    {currentIndex + 1} / {photos.length}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && showControls && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-20 right-4 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-80 z-50"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">显示设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm mb-3">轮播间隔</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3000, 5000, 8000, 10000].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setCarouselInterval(interval)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        carouselInterval === interval
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {interval / 1000}秒
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-3">显示模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDisplayMode('carousel')}
                    className={`py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      displayMode === 'carousel'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Layout className="w-4 h-4" />
                    轮播模式
                  </button>
                  <button
                    onClick={() => setDisplayMode('waterfall')}
                    className={`py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      displayMode === 'waterfall'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    瀑布流
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-3">自动播放</label>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    isPlaying
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Play className="w-4 h-4" />
                      自动播放中
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      已暂停
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DisplayPage
