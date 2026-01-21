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
              content: `你是电商数据分析师。从产品页面准确提取以下信息：

1. 产品名称和具体类别
2. 规格参数（8-10个关键参数，必须来自页面原文，不要修改单位或数值）
3. 评价统计（总评价数、5星/4星/3星/2星/1星的数量和百分比）
4. 用户评论摘要（正面评论3个最高频词汇、负面评论3个最高频词汇）
5. 产品卖点（5个主要卖点）

**严格的数据提取规则**：
- 页面显示"20,000Pa"就提取"20,000Pa"，不能改成"20kPa"或"22,000Pa"
- 页面显示"1,234条评价"就是1234，不能估算成1200或1250
- 如果页面无法找到某个数据，标注"[页面未标注]"而不是编造
- 评价分布的所有百分比加和必须等于100%
- 用户评论中的词汇要来自真实评论，高频出现的内容
- 所有参数的单位要准确（W、Pa、kPa、dB、L 等）

**返回 JSON 格式**（必须有效）：

{
  "products": [
    {
      "name": "产品完整名称",
      "category": "具体类别（如：手持无线吸尘器、立式洗地机等）",
      "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
      "reviews": {
        "totalCount": 总评价数（数字）,
        "distribution": {
          "5star": { "count": 5星数量（数字）, "percentage": "百分比（如45%）" },
          "4star": { "count": 4星数量（数字）, "percentage": "百分比（如30%）" },
          "3star": { "count": 3星数量（数字）, "percentage": "百分比（如15%）" },
          "2star": { "count": 2星数量（数字）, "percentage": "百分比（如5%）" },
          "1star": { "count": 1星数量（数字）, "percentage": "百分比（如5%）" }
        },
        "likes": ["用户喜欢的点1", "用户喜欢的点2", "用户喜欢的点3"],
        "dislikes": ["用户吐槽的点1", "用户吐槽的点2", "用户吐槽的点3"]
      },
      "parameters": {
        "参数1": "值（格式必须匹配页面，如：20,000Pa、110°C、2.3L）",
        "参数2": "值",
        "参数3": "值",
        "参数4": "值",
        "参数5": "值",
        "参数6": "值",
        "参数7": "值",
        "参数8": "值"
      }
    }
  ],
  "comparisonInsights": {
    "优势对比": "各产品在关键参数方面的优劣对比",
    "劣势提醒": "用户真实吐槽最多的问题和缺陷",
    "适用场景": "根据参数和用户评论，推荐给什么类型家庭使用",
    "采购建议": "综合性价比、性能、耐久性、维护成本的购买建议"
  },
  "suggestions": "基于产品对比和用户真实需求的综合优化建议"
}

**必须保证**：
- 返回的 JSON 必须有效且可被 JSON.parse() 解析
- 所有数字来自页面真实数据，不要修改、估算或四舍五入
- 如果无法确定数据，用"[页面未标注]"标注，不要编造
- comparisonInsights 必须基于真实参数和用户评论，不要凭空编造`
            },
            {
              role: 'user',
              content: `请从以下产品链接准确提取真实数据并返回 JSON 格式。特别注意：所有数字必须来自页面原文，不要修改单位、估算数值或改变数字。\n\n${linksText}`
            }
          ]
        },
        parameters: {
          temperature: 0.5,
          max_tokens: 2500,
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
