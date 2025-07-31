项目结构模板:
当前端使用 Vue（基于 Vue 3 + Vite）、后端使用 Node.js/Express 时，项目结构需要兼顾两种技术栈的特性，同时保持前后端分离的清晰边界。


### 一、整体项目结构（前后端分离）
```
project-root/                 # 项目根目录
├── client/                   # 前端 Vue 项目
├── server/                   # 后端 Express 项目
├── docs/                     # 项目文档（接口文档、数据库设计、部署说明等）
├── scripts/                  # 自动化脚本（部署、数据库备份、测试等）
│   ├── deploy.sh             # 部署脚本
│   └── init-db.js            # 数据库初始化脚本
├── docker/                   # Docker 配置（可选，用于容器化部署）
│   ├── docker-compose.yml    # 多容器编排配置
│   ├── client.Dockerfile     # 前端 Docker 构建文件
│   └── server.Dockerfile     # 后端 Docker 构建文件
├── .gitignore                # Git 忽略文件（node_modules、环境变量等）
└── README.md                 # 项目总说明（技术栈、启动方式、目录结构等）
```


### 二、前端 Vue 项目结构（client/）
基于 Vue 3 + Vite + Vue Router + Pinia + Axios，遵循“功能模块化”和“复用优先”原则，结构如下：

```
client/
├── public/                   # 静态资源（不经过 Vite 处理）
│   ├── index.html            # 入口 HTML
│   ├── favicon.ico           # 网站图标
│   └── robots.txt            # 搜索引擎爬虫规则
├── src/
│   ├── api/                  # 接口请求层（统一管理所有后端接口）
│   │   ├── index.js          # Axios 实例配置（拦截器、基础URL等）
│   │   ├── user.js           # 用户相关接口（登录、注册、信息获取）
│   │   ├── goods.js          # 商品相关接口（列表、详情、下单）
│   │   └── common.js         # 通用接口（如上传、下载）
│   ├── assets/               # 可被 Vite 处理的静态资源
│   │   ├── images/           # 图片资源（按模块分目录，如 user/、goods/）
│   │   ├── styles/           # 全局样式
│   │   │   ├── reset.scss    # 样式重置（清除浏览器默认样式）
│   │   │   ├── variables.scss # 全局变量（颜色、尺寸等）
│   │   │   └── global.scss   # 全局通用样式（如动画、工具类）
│   │   └── fonts/            # 字体文件（如 iconfont）
│   ├── components/           # 组件（按“通用”和“业务”分类）
│   │   ├── common/           # 通用基础组件（与业务无关，可复用）
│   │   │   ├── Button/       # 按钮组件
│   │   │   ├── Modal/        # 弹窗组件
│   │   │   └── Pagination/   # 分页组件
│   │   └── business/         # 业务组件（与具体功能强相关）
│   │       ├── UserCard/     # 用户信息卡片（用于个人中心）
│   │       └── GoodsList/    # 商品列表项（用于商品页）
│   ├── composables/          # 自定义组合式 API（Vue 3 推荐，替代 Vue 2 混入）
│   │   ├── useAuth.js        # 权限相关逻辑（登录状态、角色判断）
│   │   ├── useRequest.js     # 请求相关逻辑（加载状态、错误处理）
│   │   └── useToast.js       # 提示框逻辑（封装 ElMessage 等）
│   ├── router/               # 路由配置
│   │   ├── index.js          # 路由实例配置（历史模式、全局守卫）
│   │   ├── routes.js         # 路由规则（按模块拆分，如 userRoutes、goodsRoutes）
│   │   └── guards.js         # 路由守卫（登录验证、权限控制）
│   ├── store/                # 状态管理（Pinia）
│   │   ├── index.js          # Pinia 实例配置
│   │   ├── user.js           # 用户模块状态（登录信息、权限）
│   │   ├── cart.js           # 购物车模块状态
│   │   └── app.js            # 应用全局状态（主题、语言等）
│   ├── utils/                # 工具函数（通用功能，与业务无关）
│   │   ├── format.js         # 格式化工具（日期、金额、手机号）
│   │   ├── validate.js       # 校验工具（表单验证、数据合法性）
│   │   └── storage.js        # 本地存储工具（localStorage/sessionStorage 封装）
│   ├── views/                # 页面组件（路由对应页面，按模块划分）
│   │   ├── Layout/           # 布局页面（包含导航栏、侧边栏、页脚）
│   │   │   ├── index.vue     # 布局入口
│   │   │   ├── Header.vue    # 页头
│   │   │   └── Sidebar.vue   # 侧边栏
│   │   ├── Home/             # 首页
│   │   ├── User/             # 用户模块页面
│   │   │   ├── Login.vue     # 登录页
│   │   │   ├── Register.vue  # 注册页
│   │   │   └── Profile.vue   # 个人中心
│   │   └── Goods/            # 商品模块页面
│   │       ├── List.vue      # 商品列表页
│   │       └── Detail.vue    # 商品详情页
│   ├── App.vue               # 根组件（页面入口，包含路由出口）
│   └── main.js               # 应用入口（初始化 Vue、挂载根组件）
├── .env.development          # 开发环境变量（VITE_API_BASE_URL 等）
├── .env.production           # 生产环境变量
├── .eslintrc.js              # ESLint 配置（代码规范检查）
├── .prettierrc               # Prettier 配置（代码格式化）
├── package.json              # 依赖管理和脚本（dev、build 等）
├── vite.config.js            # Vite 配置（别名、代理、插件等）
└── README.md                 # 前端项目说明（启动命令、目录结构等）
```


### 三、后端 Express 项目结构（server/）
基于 Node.js + Express + MySQL，遵循“分层架构”（路由→控制器→服务→模型），结构如下：

```
server/
├── src/
│   ├── app.js                # Express 应用配置（中间件、路由注册等）
│   ├── server.js             # 服务启动入口（监听端口、连接数据库）
│   ├── config/               # 配置文件（按环境和功能拆分）
│   │   ├── index.js          # 配置入口（根据环境加载不同配置）
│   │   ├── db.js             # 数据库配置（地址、账号、端口）
│   │   ├── server.js         # 服务配置（端口、跨域白名单）
│   │   └── security.js       # 安全配置（JWT 密钥、加密盐值）
│   ├── routes/               # 路由层（接收请求，分发到对应控制器）
│   │   ├── index.js          # 路由汇总（注册所有模块路由）
│   │   ├── user.routes.js    # 用户模块路由（/api/users/*）
│   │   └── goods.routes.js   # 商品模块路由（/api/goods/*）
│   ├── controllers/          # 控制器层（处理请求参数、调用服务、返回响应）
│   │   ├── user.controller.js # 用户控制器（登录、注册逻辑）
│   │   └── goods.controller.js # 商品控制器（列表、详情逻辑）
│   ├── services/             # 服务层（核心业务逻辑处理）
│   │   ├── user.service.js   # 用户服务（用户数据处理、权限判断）
│   │   └── goods.service.js  # 商品服务（商品数据处理、库存计算）
│   ├── models/               # 数据模型层（与数据库交互）
│   │   ├── user.model.js     # 用户模型（定义数据结构、数据库操作）
│   │   └── goods.model.js    # 商品模型
│   ├── middleware/           # 中间件（通用功能拦截）
│   │   ├── auth.middleware.js # 权限中间件（JWT 验证、角色检查）
│   │   ├── error.middleware.js # 全局错误处理中间件
│   │   ├── logger.middleware.js # 日志中间件（记录请求信息）
│   │   └── validator.middleware.js # 请求参数校验中间件
│   ├── utils/                # 工具函数（通用功能）
│   │   ├── jwt.js            # JWT 工具（生成、验证 token）
│   │   ├── encrypt.js        # 加密工具（密码加密、数据签名）
│   │   └── response.js       # 响应工具（统一响应格式）
│   ├── db/                   # 数据库连接管理
│   │   ├── index.js          # 数据库连接入口（初始化连接）
│   │   └── mongoose.js       # MongoDB 连接（若用 MongoDB）
│   └── exceptions/           # 自定义异常（业务错误类型）
│       ├── BusinessError.js  # 业务异常（如“用户名已存在”）
│       └── ValidationError.js # 参数校验异常
├── tests/                    # 单元测试和集成测试
│   ├── unit/                 # 单元测试（测试服务、工具函数）
│   └── integration/          # 集成测试（测试接口流程）
├── .env                      # 环境变量（数据库地址、端口等敏感信息）
├── .eslintrc.js              # ESLint 配置
├── package.json              # 依赖管理和脚本（dev、start 等）
└── README.md                 # 后端项目说明（接口文档地址、启动命令等）
```


### 四、核心设计说明
#### 1. 前端核心原则
- **接口集中管理**：`api/`目录统一维护所有后端接口，避免接口地址散落在页面中，便于后期修改。
- **组件分层**：`common/`（通用组件）和`business/`（业务组件）分离，提高复用率（如通用按钮可在多个业务场景使用）。
- **状态模块化**：Pinia 按业务模块拆分 store（如`user.js`、`cart.js`），避免单一状态树过于庞大。
- **环境隔离**：通过`.env.*`文件区分开发/生产环境的 API 地址等配置，避免硬编码。

#### 2. 后端核心原则
- **分层架构**：严格遵循“路由→控制器→服务→模型”的调用链，每层职责清晰：
  - 路由：只负责“请求路径→控制器方法”的映射。
  - 控制器：只负责参数校验、调用服务、返回响应，不处理业务逻辑。
  - 服务：封装核心业务逻辑（如“下单”需检查库存、扣减库存、创建订单）。
  - 模型：只负责与数据库交互（查询、新增、更新）。
- **中间件复用**：通用功能（如登录验证、错误处理）通过中间件实现，避免代码重复。
- **异常统一处理**：自定义异常类型 + 全局错误中间件，确保前端收到格式一致的错误响应。


### 五、扩展建议
- **接口文档**：后端集成 Swagger/OpenAPI（如`swagger-jsdoc`），自动生成接口文档，前端可通过`/api-docs`访问。
- **类型定义**：前后端可共享 TypeScript 类型定义（如接口请求/响应格式），放在`shared/`目录，减少沟通成本。
- **日志系统**：后端集成`pino`记录日志，便于问题排查。


**实际使用这套模板中需要根据项目情况进行目录调整。**