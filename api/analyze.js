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

**清洁电器的关键参数包括**：
- 功率(W) / 吸力(kPa)
- 噪音值(dB)
- 续航 / 清洁面积
- 水箱容量 / 集尘盒容量
- 滚刷 / 吸头类型
- 防水等级
- 保修期
- 易清洁性
- （根据产品类型补充其他参数）

**返回严格 JSON 格式**：

{
  "products": [
    {
      "name": "产品名",
      "category": "具体类别",
      "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
      "reviews": {
        "totalCount": 数字,
        "likes": ["优点1", "优点2", "优点3"],
        "dislikes": ["缺点1", "缺点2", "缺点3"]
      },
      "parameters": {
        "参数1": "值（无则标[页面未标注]）",
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
  "insights": {
    "优势": "各产品优势分析",
    "劣势": "各产品劣势",
    "建议": "购买建议"
  }
}

**必须保证**：返回有效的 JSON，不要添加其他文本。`

{
  "products": [
    {
      "name": "产品名称",
      "link": "链接",
      "category": "具体产品类别（如：手持无线吸尘器、立式洗地机、智能扫地机、全自动破壁机等）",
      "sellingPoints": ["从页面提取的卖点1", "从页面提取的卖点2", "从页面提取的卖点3", "从页面提取的卖点4", "从页面提取的卖点5"],
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
        "关键参数9": "具体值（可根据类别扩充，不限于9个）",
        "关键参数10": "具体值"
      }
    }
  ],
  "comparisonInsights": {
    "优势对比": "基于参数分析，哪个产品在哪些方面优势明显（结合性能、价格、耐久性）",
    "劣势提醒": "用户可能忽视但重要的缺陷（如噪音、维护成本、适用范围限制等）",
    "适用场景": "根据参数分析，每个产品最适合什么使用场景和家庭类型",
    "采购建议": "综合考虑价格、性能、耐久性、维护成本、保修期的购买建议"
  },
  "suggestions": "基于小家电使用特点和用户真实需求的综合优化建议"
}

**严格要求**：

1. **产品类别必须具体** - 不能只说"吸尘器"，要说"手持无线吸尘器"或"立式洗地机"等
2. **参数必须该类别相关** - 自动识别最相关的8-12个参数（不是固定的）
3. **页面有数据** → 直接提取，标注为"来自产品页面"
4. **页面无数据但很重要** → 基于行业标准补充，标注为"[建议参考]"或"[行业参考值]"
5. **无法确定** → 标注为"[页面未标注]"或"[建议咨询卖家]"
6. 所有文本必须是**中文**
7. comparisonInsights 必须包含用户实际使用中会遇到的**真实问题**（如清洁效果、耐久性、维护成本、噪音影响等）
8. 优化建议不仅基于参数，还要基于用户评论的真实吐槽和市场需求
9. 如果产品有新兴参数或创新功能，也要纳入对比（如：APP控制、自动清空功能、实时续航显示等）

**示例对比场景**：

输入：吸尘器 vs 洗地机 vs 扫地机
- 吸尘器：重点对比吸力、续航、噪音、集尘盒容量
- 洗地机：重点对比吸力、水箱容量、滚刷类型、加热功能
- 扫地机：重点对比清扫宽度、导航系统、自动回充、拖地功能
- 综合建议：根据家庭大小、地面类型、清洁需求推荐组合方案`


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
