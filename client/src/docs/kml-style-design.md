## 新的简洁KML样式流程设计

### 核心原则
1. **直接数据流**：样式保存后直接重新加载KML数据
2. **单一数据源**：所有样式信息都从文件对象获取，不依赖复杂的同步机制
3. **简化刷新**：直接清除并重新加载图层，避免复杂的标记刷新逻辑

### 流程步骤

1. **样式编辑**：
   - 用户在KmlStyleDialog中编辑样式
   - 保存时直接调用API更新样式
   - 保存成功后emit事件

2. **样式应用**：
   - 监听到styles-updated事件
   - 重新获取KML文件列表（包含最新样式）
   - 清除现有KML图层
   - 重新添加KML图层（使用最新样式）

3. **样式获取**：
   - 在use-kml-layer.js中，addKmlLayer时直接使用file.styleConfig
   - 如果file.styleConfig不存在，使用默认样式
   - 点位创建时传入styleConfig参数

### 核心修改点

1. **store加载时注入样式**：kml-basemap.js在加载文件时获取样式配置
2. **图层添加时使用样式**：use-kml-layer.js使用file.styleConfig
3. **事件处理简化**：map-event-handlers.js只做重新加载
4. **移除复杂机制**：删除所有跨tab通知、localStorage、复杂同步逻辑

### 优势
- 逻辑清晰，易于调试
- 数据流简单，不容易出错
- 性能更好，减少不必要的复杂操作
- 维护成本低
