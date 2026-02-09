# 单词消消乐

基于 React + TypeScript + Vite + Tailwind CSS 开发的单词消消乐游戏。

## 功能特性

- ✅ 可编辑游戏标题（自动保存到 localStorage）
- ✅ 滑块控制单词/短语对数（5-50对）
- ✅ 支持导入 Excel (.xlsx) 词表
- ✅ 支持导入 TXT 文本词表
- ✅ 实时计时功能
- ✅ 点击匹配消除游戏逻辑
- ✅ 华丽的消除和错误提示动画
- ✅ 通关提示模态框
- ✅ 响应式设计，适配移动端

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **XLSX** - Excel 文件解析

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

## 构建生产版本

```bash
npm run build
```

## 预览生产版本

```bash
npm run preview
```

## 部署

项目使用 GitHub Actions 自动部署到 GitHub Pages。

### 自动部署

- 推送到 `main` 分支会自动触发构建和部署
- 部署地址：https://alancumberbatch.github.io/Match-3/

### 手动部署

如果需要手动触发部署，可以在 GitHub Actions 页面手动运行 workflow。

### 本地构建

```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

## 词表格式说明

### TXT 格式
```
1. active：活跃的
2. returned：返回
3. habits：习惯
```

### Excel 格式
第一列为英文/短语，第二列为中文/短句。

## 项目结构

```
Match-3/
├── src/
│   ├── components/
│   │   └── WordGame.tsx    # 主游戏组件
│   ├── App.tsx              # 应用入口组件
│   ├── main.tsx             # React 入口文件
│   └── index.css            # 全局样式
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.js       # Tailwind 配置
└── postcss.config.js        # PostCSS 配置
```
