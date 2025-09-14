# 离线构建与部署说明

本文档总结了为了解决目标服务器无法访问外部镜像仓库 / npm registry 时，我们在本地完成镜像构建并将镜像归档上传到服务器的原因、方法与注意事项。

## 问题原因

- 目标服务器网络受限，直接在服务器上运行 `docker build` 会在镜像构建阶段（Dockerfile 中的 `npm ci` / `npx vite build`）需要访问 npm registry 或其他外部资源，从而失败。
- 当 `npm ci` 在容器内失败时，npm 可能会创建空目录占位（例如 `node_modules/express` 目录存在但缺少 package.json 等文件），导致容器运行时报 `Cannot find module 'express'`。
- 如果 `docker compose` 在服务器上使用 `build:`（或用户不小心没有加 `--no-build`），Compose 会尝试重建镜像，触发网络访问。
- 如果 Compose 使用了 host 的 bind mount（把主机目录挂载到容器的 `/app/server` 或 `node_modules`），会覆盖镜像内的依赖，导致运行失败。

## 我们采用的方案（已验证有效）

1. 在本地完整构建：

   - 在项目根目录执行 `npm ci --omit=dev`（在 `server` 目录）以生成完整的 `server/node_modules`。
   - 如果本地机器可联网，也在 `client` 目录正常构建 `npx vite build` 生成 `client/dist`。

2. 为了把本地 `node_modules` 包含进镜像，而不修改 `.dockerignore`，我们采用临时构建上下文目录：

   - 将 `server/node_modules` 复制到 `build_context_extra/server_node_modules`（该目录不会被 `.dockerignore` 忽略）。
   - 修改 `docker/Dockerfile`（runtime 阶段）添加 `COPY build_context_extra/server_node_modules /app/server/node_modules`，优先使用上下文中提供的依赖目录覆盖镜像内的依赖。

3. 使用脚本打包镜像为单文件归档：

   - 运行 `USE_LOCAL_CLIENT=1 ./build_mymap_images_tar.sh`（脚本已调整支持单文件归档和使用本地 client/dist）。
   - 脚本会构建 `mymap:latest` 并将 `mymap:latest` 与 `nginx:1.25-alpine` 一起保存为 `images/mymap_images.tar.gz`。

4. 在服务器上部署（不构建）：
   - 上传 `images/mymap_images.tar.gz` 到服务器。若单独保存了 nginx 镜像也上传。
   - 在服务器上执行：
     ```bash
     docker load -i images/mymap_images.tar.gz
     docker compose -f docker/docker-compose.yml up -d --no-build
     ```
   - 切记 `--no-build`：避免在服务器上触发重新构建。

## 注意事项与常见坑

- 切勿把 `server/node_modules` 放入仓库或长期提交；我们使用 `build_context_extra` 作为临时目录，并在 `.gitignore` 中忽略。
- 如果 Compose 文件使用了 bind mount（volumes 显式挂载宿主目录），会覆盖镜像内的文件，请改为命名卷或删除绑定，或确保宿主机上也有完整依赖。
- 确保镜像标签与 `docker-compose.yml` 中的 `image:` 字段一致；否则 Compose 可能尝试拉取远端镜像。

## 我做了哪些代码/脚本修改

- 新增/修改：`build_mymap_images_tar.sh`：
  - 默认生成单文件归档 `images/mymap_images.tar.gz`。
  - 支持 `USE_LOCAL_CLIENT=1` 跳过 client-builder 并使用本地 `client/dist`。
  - 可在本机上把 `server/node_modules` 包含进构建上下文（手动或脚本扩展）。
- 修改：`docker/Dockerfile`：
  - 在 runtime 阶段添加 `COPY build_context_extra/server_node_modules /app/server/node_modules`，支持使用本地依赖进行离线构建。

---
