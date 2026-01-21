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
    // 简化提示词
    const systemPrompt = `你是电商数据分析师。从 HTML 页面中准确提取：
1. 产品名称和类别
2. 8-10 个规格参数
3. 评价分布（各星级数量和百分比）
4. 用户正面评论 3 个关键词
5. 用户负面评论 3 个关键词
6. 5 个产品卖点

返回标准 JSON（必须包含 products 数组）`;

    const userContent = `页面链接: ${productLink || '未提供'}

HTML 内容（前 50000 字）:
${htmlContent.substring(0, 50000)}`;

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
        error: `API 调用失败: ${response.status}`,
        details: responseText.substring(0, 200)
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        error: '响应格式错误',
        received: responseText.substring(0, 300)
      });
    }

    // 提取 AI 返回的文本
    let content = 
      data.output?.text || 
      data.output?.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.content ||
      '';

    if (!content) {
      return res.status(500).json({ error: '未获得 AI 响应' });
    }

    // 尝试解析 JSON
    let parsed = null;

    // 方法 1: 直接解析
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // 方法 2: 查找 JSON 块
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // 方法 3: 构造最小响应
          parsed = {
            products: [{
              name: '产品',
              category: '未知',
              sellingPoints: ['无法解析'],
              reviews: { totalCount: 0, distribution: {} },
              parameters: {}
            }],
            suggestions: '分析失败，请重试'
          };
        }
      } else {
        parsed = {
          products: [{
            name: '产品',
            category: '未知',
            sellingPoints: ['无法解析'],
            reviews: { totalCount: 0, distribution: {} },
            parameters: {}
          }],
          suggestions: '分析失败'
        };
      }
    }

    // 确保结构完整
    if (!parsed.products) parsed.products = [];

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: `服务器错误: ${error.message}`
    });
  }
}
