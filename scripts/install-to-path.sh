#!/bin/bash

<<作用

这个脚本的作用是把 SDK 源码进行编译、打包、并替换本地项目，以便在无需发布新版本的情况下看到效果。

运行脚本前，唯一需要做的是，将 to 变量修改为本地项目的 node_modules 的实际路径。

作用

# 目标路径，即要替换的本地项目的 node_modules 路径。
to="/Users/${USER}/Desktop/my-project/node_modules"

############################# 不用编辑下面的脚本 #############################

# 当前脚本所在路径
DIR=$(cd -P $(dirname "$0") && pwd)

# 包所在的路径
from=$(dirname "$DIR")

# 切换到 sdk 根目录
cd "${DIR}/.."

to="$to/$(node -p "require('./package.json').name")"

# 格式化代码
npm run "sdk:lint-fix"

if [[ "$?" != "0" ]]; then
  exit
fi

# 编译项目
npm run "sdk:build"

if [[ "$?" != "0" ]]; then
  exit
fi

# 导入脚本函数
. "${DIR}/npmlink.sh"

# 调用 npm pack 本地打包 SDK, 并解压至本地项目
npmlink "$from" "$to"

echo -e "\n已安装至" "$to"