export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { links } = req.body;

  if (!links || !Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: '请输入至少一个产品链接' });
  }

  if (links.some(link => !link || link.trim() === '')) {
    return res.status(400).json({ error: '所有链接都必须填写' });
  }

  try {
    const linksText = links.map((link, index) => `产品${index + 1}: ${link}`).join('\n');

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
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
              content: `你是一位专业的电商数据分析师。请基于提供的产品链接，分析每个产品的真实数据。
返回严格的 JSON 格式，包含以下结构。所有数据必须基于真实可获取的信息或合理推断，确保准确性：

{
  "products": [
    {
      "name": "产品名称",
      "link": "链接",
      "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
      "reviews": {
        "totalCount": 总评价数,
        "distribution": {
          "5star": { "count": 数量, "percentage": "百分比" },
          "4star": { "count": 数量, "percentage": "百分比" },
          "3star": { "count": 数量, "percentage": "百分比" },
          "2star": { "count": 数量, "percentage": "百分比" },
          "1star": { "count": 数量, "percentage": "百分比" }
        },
        "likes": ["用户喜欢1", "用户喜欢2", "用户喜欢3"],
        "dislikes": ["用户吐槽1", "用户吐槽2", "用户吐槽3"]
      },
      "parameters": {
        "price": "价格",
        "sales": "销量",
        "shippingFee": "运费",
        "returnPolicy": "退货政策",
        "warranty": "保修信息",
        "material": "材质/规格",
        "weight": "重量",
        "dimensions": "尺寸"
      }
    }
  ],
  "suggestions": "基于所有产品数据的综合优化建议"
}

注意：
1. 所有数据必须真实、客观、准确
2. 评价分布要合理（所有百分比之和=100%）
3. 用户喜欢和吐槽的点要真实反映市场反馈
4. 参数必须是实际可获得的数据，如果无法确定则标记为"暂无信息"`
            },
            {
              role: 'user',
              content: `请分析以下产品链接的真实数据并返回 JSON 格式：\n\n${linksText}`
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.8,
          repetition_penalty: 1.0
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Dashscope API Error:', error);
      return res.status(response.status).json({ 
        error: `API 错误: ${error.message || '未知错误'}` 
      });
    }

    const data = await response.json();
    const content = data.output?.text || data.output?.content || data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in response:', data);
      return res.status(500).json({ error: '未获得有效的 AI 响应内容' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Cannot parse JSON from:', content);
        return res.status(500).json({ error: '无法解析 AI 返回的 JSON 格式' });
      }
    }

    res.status(200).json(parsed);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: `分析失败: ${error.message}` 
    });
  }
}
