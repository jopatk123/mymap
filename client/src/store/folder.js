import { defineStore } from 'pinia'
import { folderApi } from '@/api/folders.js'

export const useFolderStore = defineStore('folder', {
  state: () => ({
    folderTree: [],
    flatFolders: [],
    loading: false,
    selectedFolder: null
  }),

  getters: {
    // 获取根文件夹
    rootFolders: (state) => {
      return state.folderTree.filter(folder => !folder.parent_id)
    },

    // 根据ID获取文件夹
    getFolderById: (state) => {
      return (id) => {
        const findFolder = (folders) => {
          for (const folder of folders) {
            if (folder.id === id) return folder
            if (folder.children) {
              const found = findFolder(folder.children)
              if (found) return found
            }
          }
          return null
        }
        return findFolder(state.folderTree)
      }
    },

    // 获取文件夹路径
    getFolderPath: (state) => {
      return (folderId) => {
        const path = []
        let currentId = folderId

        while (currentId) {
          const folder = state.flatFolders.find(f => f.id === currentId)
          if (!folder) break
          
          path.unshift(folder)
          currentId = folder.parent_id
        }

        return path
      }
    }
  },

  actions: {
    // 获取文件夹列表
    async fetchFolders() {
      this.loading = true
      try {
        const response = await folderApi.getFolders()
        this.folderTree = response.data
        
        // 同时获取平铺列表
        const flatResponse = await folderApi.getFoldersFlat()
        this.flatFolders = flatResponse.data
        
        return response.data
      } catch (error) {
        console.error('获取文件夹失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 创建文件夹
    async createFolder(folderData) {
      try {
        const response = await folderApi.createFolder(folderData)
        await this.fetchFolders() // 重新获取数据
        return response.data
      } catch (error) {
        console.error('创建文件夹失败:', error)
        throw error
      }
    },

    // 更新文件夹
    async updateFolder(id, folderData) {
      try {
        const response = await folderApi.updateFolder(id, folderData)
        await this.fetchFolders() // 重新获取数据
        return response.data
      } catch (error) {
        console.error('更新文件夹失败:', error)
        throw error
      }
    },

    // 删除文件夹
    async deleteFolder(id) {
      try {
        await folderApi.deleteFolder(id)
        await this.fetchFolders() // 重新获取数据
      } catch (error) {
        console.error('删除文件夹失败:', error)
        throw error
      }
    },

    // 移动文件夹
    async moveFolder(id, parentId) {
      try {
        const response = await folderApi.moveFolder(id, { parentId })
        await this.fetchFolders() // 重新获取数据
        return response.data
      } catch (error) {
        console.error('移动文件夹失败:', error)
        throw error
      }
    },

    // 更新文件夹可见性
    async updateFolderVisibility(id, isVisible) {
      try {
        const response = await folderApi.updateFolderVisibility(id, { isVisible })
        await this.fetchFolders() // 重新获取数据
        return response.data
      } catch (error) {
        console.error('更新文件夹可见性失败:', error)
        throw error
      }
    },

    // 获取文件夹中的全景图
    async getFolderPanoramas(folderId, includeHidden = false) {
      try {
        const response = await folderApi.getFolderPanoramas(folderId, { includeHidden })
        return response.data
      } catch (error) {
        console.error('获取文件夹全景图失败:', error)
        throw error
      }
    },

    // 移动全景图到文件夹
    async movePanoramasToFolder(folderId, panoramaIds) {
      try {
        const response = await folderApi.movePanoramasToFolder(folderId, { panoramaIds })
        await this.fetchFolders() // 重新获取数据以更新计数
        return response.data
      } catch (error) {
        console.error('移动全景图到文件夹失败:', error)
        throw error
      }
    },

    // 设置选中的文件夹
    setSelectedFolder(folder) {
      this.selectedFolder = folder
    },

    // 清除选中的文件夹
    clearSelectedFolder() {
      this.selectedFolder = null
    }
  }
})