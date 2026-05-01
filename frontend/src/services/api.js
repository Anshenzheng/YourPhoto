import axios from 'axios'

const API_BASE = ''

// 房间管理
export const roomApi = {
  getAll: async () => {
    const response = await axios.get(`${API_BASE}/api/rooms`)
    return response.data
  },
  getByCode: async (code) => {
    const response = await axios.get(`${API_BASE}/api/rooms/code/${code}`)
    return response.data
  },
  create: async (data) => {
    const response = await axios.post(`${API_BASE}/api/rooms`, data)
    return response.data
  },
  update: async (id, data) => {
    const response = await axios.put(`${API_BASE}/api/rooms/${id}`, data)
    return response.data
  },
  delete: async (id) => {
    const response = await axios.delete(`${API_BASE}/api/rooms/${id}`)
    return response.data
  }
}

// 照片管理
export const photoApi = {
  getByRoom: async (roomId, status = 'approved') => {
    const response = await axios.get(`${API_BASE}/api/rooms/${roomId}/photos?status=${status}`)
    return response.data
  },
  upload: async (roomCode, file, onProgress) => {
    const formData = new FormData()
    formData.append('photo', file)
    
    const response = await axios.post(
      `${API_BASE}/api/rooms/${roomCode}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percent)
          }
        }
      }
    )
    return response.data
  },
  approve: async (photoId) => {
    const response = await axios.post(`${API_BASE}/api/photos/${photoId}/approve`)
    return response.data
  },
  reject: async (photoId) => {
    const response = await axios.post(`${API_BASE}/api/photos/${photoId}/reject`)
    return response.data
  },
  delete: async (photoId) => {
    const response = await axios.delete(`${API_BASE}/api/photos/${photoId}`)
    return response.data
  }
}

// 获取照片URL
export const getPhotoUrl = (filename) => {
  return `${API_BASE}/uploads/${filename}`
}
