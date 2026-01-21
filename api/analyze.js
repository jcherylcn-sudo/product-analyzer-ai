export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { htmlContent, productLink, isHtmlMode } = req.body;

  // HTML 模式
  if (isHtmlMode && htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.length < 100) {
      return res.status(400).json({ error: 'HTML 内容无效或过短' });
    }

    const htmlTruncated = htmlContent.substring(0, 50000);

    const analysisContent = `用户已下载页面的完整 HTML 源代码。请从下面的页面源代码中准确提取产品数据：

**页面链接**: ${productLink || '未提供'}

**页面源代码**:
\`\`\`html
${htmlTruncated}
\`\`\`

**重要提示**: 所有数据必须来自上面的页面源代码中明确显示的内容。
- 页面显示"20,000Pa"就提取"20,000Pa"
- 页面显示"322"就是322
- 无法找到的数据标注"[页面未标注]"`;

    try {
      const response = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen-plus',
            input: {
              messages: [
                {
                  role: 'system',
                  content: `你是专业的电商数据分析师。请从提供的产品信息中准确提取以下数据：

1. 产品名称和具体类别
2. 规格参数（8-10 个关键参数）
3. 评价统计（总数、各等级数量和百分比）
4. 用户评论摘要（正面 3 个词、负面 3 个词）
5. 产品卖点（5 个主要卖点）

**严格规则**:
- 页面显示的数字必须准确复制
- 无法找到的数据必须标注"[页面未标注]"
- 评价百分比必须加和 = 100%
- 返回必须是有效 JSON

**返回格式**:
{
  "products": [
    {
      "name": "产品名称",
      "category": "类别",
      "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
      "rev
