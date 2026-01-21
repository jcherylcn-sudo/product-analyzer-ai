export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { htmlContent, productLink, isHtmlMode } = req.body;

  if (!isHtmlMode || !htmlContent) {
    return res.status(400).json({ error: '请上传页面 HTML 文件' });
  }

  if (typeof htmlContent !== 'string' || htmlContent.length < 100) {
    return res.status(400).json({ error: 'HTML 内容无效' });
  }

  try {
    const systemPrompt = `你是电商数据分析师。从 HTML 中准确提取并返回标准 JSON：
{
  "products": [{
    "name": "产品名称",
    "category": "类别",
    "sellingPoints": ["卖点1", "卖点2", "卖点3"],
    "reviews": {
      "totalCount": 评价总数,
      "distribution": {
        "5star": { "count": 数字, "percentage": "百分比" },
        "4star": { "count": 数字, "percentage": "百分比" },
        "3star": { "count": 数字, "percentage": "百分比" },
        "2star": { "count": 数字, "percentage": "百分比" },
        "1star": { "count": 数字, "percentage": "百分比" }
      },
      "likes": ["词1", "词2", "词3"],
      "dislikes": ["词1", "词2", "词3"]
    },
    "parameters": {
      "参数1": "值1",
      "参数2": "值2",
      "参数3": "值3"
    }
  }],
  "suggestions": "优化建议"
}

重要：
- 必须返回有效的 JSON
- 页面无法找到的数据用 [页面未标注] 表示
- 不要编造数据`;

    const userContent = `页面: ${productLink}\n\nHTML:\n${htmlContent.substring(0, 50000)}`;

    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ]
          },
          parameters: {
            temperature: 0.3,
            max_tokens: 2000,
            top_p: 0.8
          }
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(500).json({
        error: `API 调用失败: ${response.status}`
      });
    }

    let data = JSON.parse(responseText);
    let content = data.output?.text || '';

    if (!content) {
      return res.status(500).json({ error: '未获得 AI 响应' });
    }

    let parsed = null;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          parsed = { products: [] };
        }
      } else {
        parsed = { products: [] };
      }
    }

    // 确保有效的产品数据
    if (!parsed.products) {
      parsed.products = [];
    }

    // 补充默认值
    parsed.products = parsed.products.map(p => ({
      name: p.name || '未知产品',
      category: p.category || '未知',
      sellingPoints: p.sellingPoints || [],
      reviews: {
        totalCount: p.reviews?.totalCount || 0,
        distribution: p.reviews?.distribution || {},
        likes: p.reviews?.likes || [],
        dislikes: p.reviews?.dislikes || []
      },
      parameters: p.parameters || {},
      suggestions: p.suggestions || '无建议'
    }));

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: `服务器错误: ${error.message}`
    });
  }
}
