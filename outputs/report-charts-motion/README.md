# Report Charts 3.1 · 动效 HTML

- [Portfolio 动效交互页面](portfolio.html)：共享时间指针，资产价值、成本、差额和回撤联动；时间范围、重播、明暗、关闭动效、键盘和日期滑杆。365 天固定演示数据，非实际业绩。
- 原有 16 类财务图表也增加了交互预览和数值提示，仍可切换排版编辑；更新后的工作台由完整 Skill 包生成。
- [Portfolio SVG](portfolio.svg)、[PNG](portfolio.png)、[项目数据](portfolio.project.json) 及 [完整 Skill 包](report-charts-v3.1.zip)。

参考网站 Portfolio 的公开演示可操作，源码面板要求登录，所指原始源码 URL 返回 404。本次为基于原有 ECharts 的独立适配，没有复制受限源码或添加第二套图表、动画框架。

## 已验证

浏览器中检查了动画中间帧到完成帧、鼠标联动、时间范围、方向键/Home/End、关闭动效、深浅主题、390px 与桌面布局、16 类财务图切换、提示金额和占比、弹窗关闭回收、HTML 保存再打开及 SVG/PNG 导出。浏览器和命令行生成的 SVG 字节一致。静态检测确认运行脚本、样式与数据均内联，无远程资源引用。

浏览器工具的安全策略不允许自动化打开 file:// 地址；本次通过仅绑定 127.0.0.1 的 HTTP 预览验证行为，因此未宣称已验证双击文件的离线运行。代码同时尊重系统减少动效偏好；实际测试了页面内关闭动效，未修改系统辅助功能设置。

Portfolio 的数据和计算合同见 Skill references/interactive-html.md。财务项目 schema 仍为 2；Portfolio 使用独立 schema 1。静态 SVG/PNG 导出完整图形，不包含悬停光标或过渡帧。
