
因为网络问题，无法在docker build过程中从npm registry拉取依赖包，导致构建失败。
解决方法：预先在本地构建好前端代码，并将构建好的代码放到docker build的上下文中，然后在dockerfile中使用ARG SKIP_CLIENT_BUILD=1跳过前端代码的构建，直接使用上下文中的前端代码。
使用USE_LOCAL_CLIENT=1 ./build_mymap_images_tar.sh运行脚本构建镜像
需要在前端和后端都运行npm ci，前端在mymap-client目录下，后端在mymap-server目录下
SKIP_SERVER_NPM_INSTALL=1 USE_LOCAL_CLIENT=1 ./build_mymap_images_tar.sh