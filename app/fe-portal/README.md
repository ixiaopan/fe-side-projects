# Fe Portal

FE Portal

## Install

```
pnpm i
```

## Dev

```
// 先启动 base
pnpm run dev

// 新开 terminal 再选择子应用启动
pnpm run dev
```

## Cli

根据提示输入子应用项目名，遵循 `kebab-style`
```
pnpm run create
```

## Build

构建所有应用

```
pnpm run build:prod:all
```

构建单个应用

```
pnpm run build:prod:report
```

## Server

启动服务
```
docker-compose up -d
```

停止服务
```
docker-compose down
```

重新构建镜像并启动服务
```
docker-compose up -d --build
```
