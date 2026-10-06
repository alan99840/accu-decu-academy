# Accu / Decu Academy

一个公开开源的结构性产品入门课堂。用客户视角解释股票型 Accumulator 与 Decumulator，包含“每天买／卖多少股？”交互模拟器。

## 在线阅读

[打开教学网页](https://alan99840.github.io/accu-decu-academy/)

页面无需登录。全部价格、条款和保证金比例都是教学假设，不是实时行情或产品报价。

## 教学内容

- Accu 买股和 Decu 卖股的每日义务、执行价和数量倍数。
- KO、KI、保证期、观察方式及合同变体。
- 实物交割与现金差额结算、累计义务与交割批次。
- 保证金、最大购股价款、备兑与不足额 Decu、提前平仓。
- Note 法律形式与 OTC 交易方式的区别。
- 八步 Term Sheet 阅读清单、术语表、课堂小测及原始资料链接。

## 交互模拟器

六条股价路径；Accu / Decu；1x / 不利时 2x；实物 / 按观察日定价的现金差额。可以查看每日股数、现金、交割批次，并下载 CSV。

重要口径：

- 期初价 100 港元；Accu 执行价 90、KO 105；Decu 执行价 110、KO 95；基础数量每日 100 股。
- 10 个观察日，第 5、10 日结算；KO 不加速原定结算。
- 收盘观察；KO 当日及其后不计量；执行价等值时按 1x。
- 无 KI、无保证期，不计融资、费用、税费、股息和信用风险。
- 实物 Accu 结果：累计股数 × 第 10 日股价 − 购股价款，假设全部股票持有至第 10 日。
- 实物 Decu 结果：卖股收入 − 已卖股数 × 第 10 日股价，是相对期末卖股的差额，不是原持股实际利润。
- 现金差额：分别按每个观察日的价和股数计算后汇总；正数为客户收款，负数为客户付款。它与持股至期末的实物结果可能不同。

## 本地运行与修改

发布版 `index.html` 是完整可编辑的单文件页面，CSS、JavaScript 与 SVG 图表均在其中，无第三方运行依赖。可直接打开；也可启动本地服务器：

```sh
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/`。搜索文件中的 `THE BASIC IDEA`、`INTERACTIVE LAB`、`Pure teaching model` 等段落可找到教学与计算代码。

清单和模拟器选择使用浏览器 localStorage 保存，没有分析追踪或服务器数据接口。不支持 localStorage 时仍可使用网页。

## GitHub Pages

本项目使用 GitHub Pages，从 `main` 分支的根目录发布。配置位置：Settings → Pages → Deploy from a branch → main → / (root)。

部署机制说明：[GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

## 许可证与资料

原创网页代码、教学文字和图表采用 [MIT License](LICENSE)。外部资料的权利属于各自作者。可自由复用原创部分，并保留许可证。欢迎提交 Issue 或 Pull Request 改进说明和计算。

视觉采用红／绿配色、白色背景与金融研究报告式排版；本站为独立教学项目，与所链接机构无关联。

仅用于一般产品机制教学，不构成投资建议、产品销售材料、报价或适当性判断。实际义务须核对具体合同。
