# NON-GOALS

本仓库 **pdffill** 明确不做以下内容：

- 纯 XFA 表单（无 AcroForm 字段）的填充
- 扫描件 PDF / OCR
- 合并、拆分、加水印、数字签名
- 从零设计 PDF 版式或可视化表单编辑器
- 修改 PDF 页面结构（增删页、旋转页）
- 保证与所有政府/银行旧模板 100% 像素级一致

复杂场景请考虑：pdftk-java + [@sparticuz/pdffiller](https://www.npmjs.com/package/@sparticuz/pdffiller)、商业 SDK（iText、Apryse）。
