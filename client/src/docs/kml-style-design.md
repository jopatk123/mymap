## 新的简洁 KML 样式流程设计

### 核心原则

1. **直接数据流**：样式保存后直接重新加载 KML 数据
2. **单一数据源**：所有样式信息都从文件对象获取，不依赖复杂的同步机制
3. **简化刷新**：直接清除并重新加载图层，避免复杂的标记刷新逻辑

### 流程步骤

1. **样式编辑**：

   - 用户在 KmlStyleDialog 中编辑样式
   - 保存时直接调用 API 更新样式
   - 保存成功后 emit 事件

2. **样式应用**：

   - 监听到 styles-updated 事件
   - 重新获取 KML 文件列表（包含最新样式）
   - 清除现有 KML 图层
   - 重新添加 KML 图层（使用最新样式）

3. **样式获取**：
   - 在 use-kml-layer.js 中，addKmlLayer 时直接使用 file.styleConfig
   - 如果 file.styleConfig 不存在，使用默认样式
   - 点位创建时传入 styleConfig 参数

### 核心修改点

1. **store 加载时注入样式**：kml-basemap.js 在加载文件时获取样式配置
2. **图层添加时使用样式**：use-kml-layer.js 使用 file.styleConfig
3. **事件处理简化**：map-event-handlers.js 只做重新加载
4. **移除复杂机制**：删除所有跨 tab 通知、localStorage、复杂同步逻辑

### 优势

- 逻辑清晰，易于调试
- 数据流简单，不容易出错
- 性能更好，减少不必要的复杂操作
- 维护成本低
