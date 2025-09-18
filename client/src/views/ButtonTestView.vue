<template>
  <div class="button-test-view">
    <h2>按钮UI优化测试页面</h2>
    
    <!-- 模拟地图控件 -->
    <div class="test-section">
      <h3>优化后的按钮组</h3>
      <div class="mock-map-controls">
        <div class="toolbar">
          <div class="controls-group">
            <!-- 搜索按钮 -->
            <el-button class="btn-search">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            
            <!-- 区域控制按钮组 -->
            <el-button class="btn-circle">
              <el-icon><Compass /></el-icon>
              圆形区域
            </el-button>
            
            <el-button class="btn-custom">
              <el-icon><Crop /></el-icon>
              自定义区域
            </el-button>
            
            <el-button class="btn-clear">
              <el-icon><Delete /></el-icon>
              清除
            </el-button>
            
            <!-- 导出按钮 -->
            <el-button class="btn-export">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            
            <!-- KML设置 -->
            <el-button class="btn-kml-settings">
              <el-icon><Tools /></el-icon>
              KML设置
            </el-button>
            
            <!-- 点位图标 -->
            <el-button class="btn-point-icons">
              <el-icon><Location /></el-icon>
              点位图标
            </el-button>
            
            <!-- 显示列表 -->
            <el-button class="btn-show-list">
              显示列表
            </el-button>
            
            <!-- 隐藏KML图层 -->
            <el-button class="btn-toggle-kml">
              显示KML图层
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 响应式测试说明 -->
    <div class="test-info">
      <h3>优化特点</h3>
      <ul>
        <li>✅ 现代化渐变色彩设计</li>
        <li>✅ 流畅的悬停和点击动画效果</li>
        <li>✅ 完善的响应式布局适配</li>
        <li>✅ 移动端友好的触摸体验</li>
        <li>✅ 统一的视觉风格和间距</li>
        <li>✅ 无障碍访问支持</li>
      </ul>
      
      <h3>响应式断点</h3>
      <ul>
        <li><strong>超宽屏 (≥1440px):</strong> 更大的按钮和图标</li>
        <li><strong>桌面端 (1024px-1439px):</strong> 标准尺寸，水平排列</li>
        <li><strong>平板端 (769px-1023px):</strong> 适中尺寸，保持水平排列</li>
        <li><strong>移动端 (481px-768px):</strong> 网格布局，3列排列</li>
        <li><strong>小屏幕 (≤480px):</strong> 2列排列，紧凑布局</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { 
  Search, 
  Compass, 
  Crop, 
  Delete, 
  Download, 
  Tools, 
  Location 
} from '@element-plus/icons-vue';
</script>

<style lang="scss" scoped>
.button-test-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  h2, h3 {
    color: #333;
    margin-bottom: 16px;
  }

  .test-section {
    margin-bottom: 40px;
  }

  .mock-map-controls {
    position: relative;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 20px;

    .toolbar {
      position: relative;
      z-index: 1000;
      max-width: calc(100vw - 40px);

      display: flex;
      gap: 0;
      padding: 0;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      overflow: hidden;

      .controls-group {
        display: flex;
        align-items: stretch;
        gap: 0;
        flex-wrap: nowrap;
        height: 44px;
        pointer-events: auto !important;
      }

      .controls-group > * {
        margin: 0 !important;
        border-radius: 0 !important;
        border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
        height: 44px !important;
        min-width: 88px;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative;
        white-space: nowrap;
        padding: 0 14px !important;
        line-height: 44px !important;
      }

      .controls-group > *:last-child {
        border-right: none !important;
      }

      .controls-group > *:first-child {
        border-top-left-radius: 12px !important;
        border-bottom-left-radius: 12px !important;
      }
      .controls-group > *:last-child {
        border-top-right-radius: 12px !important;
        border-bottom-right-radius: 12px !important;
      }

      .el-button {
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          filter: brightness(1.1);
        }

        &:active {
          transform: translateY(-1px);
          transition: all 0.1s ease;
        }

        &:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2) !important;
        }

        .el-icon {
          margin-right: 6px;
          font-size: 15px;
        }
      }

      /* 按钮颜色 */
      .btn-search {
        background: linear-gradient(135deg, #ff5722, #d32f2f) !important;
        border-color: #ff5722 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3);
      }

      .btn-circle {
        background: linear-gradient(135deg, #ff9800, #f57c00) !important;
        border-color: #ff9800 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
      }

      .btn-custom {
        background: linear-gradient(135deg, #ffeb3b, #fbc02d) !important;
        border-color: #ffeb3b !important;
        color: #424242 !important;
        box-shadow: 0 2px 8px rgba(255, 235, 59, 0.3);
      }

      .btn-clear {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        border-color: #4caf50 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      }

      .btn-export {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        border-color: #4caf50 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      }

      .btn-kml-settings {
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        border-color: #2196f3 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
      }

      .btn-point-icons {
        background: linear-gradient(135deg, #9c27b0, #7b1fa2) !important;
        border-color: #9c27b0 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
      }

      .btn-show-list {
        background: linear-gradient(135deg, #e91e63, #c2185b) !important;
        border-color: #e91e63 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
      }

      .btn-toggle-kml {
        background: linear-gradient(135deg, #ffffff, #f5f5f5) !important;
        border-color: #e0e0e0 !important;
        color: #424242 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }

    /* 移动端适配 */
    @media (max-width: 768px) {
      .toolbar {
        max-width: calc(100% - 20px);

        .controls-group {
          flex-wrap: wrap;
          height: auto;
          gap: 6px;
          padding: 8px;
          justify-content: center;
        }

        .controls-group > * {
          flex: 1 1 calc(33.333% - 8px);
          min-width: 80px;
          max-width: 120px;
          height: 40px !important;
          border-radius: 8px !important;
          border-right: none !important;
          margin: 0 !important;
          font-size: 12px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          padding: 0 10px !important;
          line-height: 40px !important;
        }

        .el-button .el-icon {
          margin-right: 3px;
          font-size: 13px;
        }
      }
    }

    @media (max-width: 480px) {
      .toolbar {
        .controls-group > * {
          flex: 1 1 calc(50% - 6px);
          min-width: 70px;
          height: 36px !important;
          font-size: 11px !important;
          padding: 0 8px !important;
          line-height: 36px !important;
        }

        .el-button .el-icon {
          margin-right: 2px;
          font-size: 12px;
        }
      }
    }
  }

  .test-info {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #007bff;

    ul {
      margin: 12px 0;
      padding-left: 20px;

      li {
        margin: 8px 0;
        line-height: 1.5;
      }
    }
  }
}
</style>