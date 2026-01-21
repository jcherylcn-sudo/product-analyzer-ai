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
              content: `你是一位专业的小家电产品分析师，专注于：生活电器（吸尘器、洗地机、扫地机等清洁系列）、厨房电器、个护电器。

**你的任务**：
1. 识别产品具体类别（如：手持无线吸尘器、立式洗地机、扫地机器人等）
2. 提取该类别的关键参数（8-12个），根据产品特点自动调整
3. 页面有数据就提取，页面无数据但重要就补充行业参考值
4. 所有输出必须是中文

**返回严格 JSON 格式**（必须包含以下字段）：

{
  "products": [
    {
      "name": "产品名称",
      "category": "具体类别（如：手持无线吸尘器、立式洗地机等）",
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
        "likes": ["用户喜欢的点1", "用户喜欢的点2", "用户喜欢的点3"],
        "dislikes": ["用户吐槽的点1", "用户吐槽的点2", "用户吐槽的点3"]
      },
      "parameters": {
        "关键参数1": "具体值（如页面未标注请补充行业参考值，标注[建议参考]）",
        "关键参数2": "具体值",
        "关键参数3": "具体值",
        "关键参数4": "具体值",
        "关键参数5": "具体值",
        "关键参数6": "具体值",
        "关键参数7": "具体值",
        "关键参数8": "具体值",
        "关键参数9": "具体值（可根据类别扩充）",
        "关键参数10": "具体值"
      }
    }
  ],
  "comparisonInsights": {
    "优势对比": "基于参数分析，哪个产品在哪些方面优势明显",
    "劣势提醒": "用户可能忽视但重要的缺陷（如噪音、维护成本等）",
    "适用场景": "每个产品最适合什么使用场景和家庭类型",
    "采购建议": "综合考虑价格、性能、耐久性、维护成本的购买建议"
  },
  "suggestions": "基于小家电使用特点和用户真实需求的综合优化建议"
}

**严格要求**：
- 产品类别必须具体（不能只说"吸尘器"，要说"手持无线吸尘器"）
- 参数必须该类别相关（自动识别最相关的8-12个参数）
- **页面有数据 → 必须准确提取，不要修改或估算数值**
- **如果页面标注了具体数值（如：20,000Pa、110°C 等），必须原文提取，不能改成其他格式或数字**
- 页面无数据但重要 → 基于行业标准补充，标注"[建议参考]"
- 无法确定 → 立即标注"[页面未标注]"或"[建议咨询卖家]"
- **千万不要凭空编造数据**（如看到 20,000Pa 就是 20,000Pa，不能改成 22,000Pa 或 18,000Pa）
- 所有文本必须是中文
- comparisonInsights 要反映用户实际使用中会遇到的真实问题
- 返回有效的 JSON，不要添加其他文本`

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
