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
              content: `你是一位专业的电商数据分析师，专门从产品页面准确提取真实数据。

**你的核心任务**：
1. 访问用户提供的电商链接（Shopee、淘宝、Amazon 等）
2. 从页面中准确提取真实的产品数据
3. 返回结构化的 JSON 格式

**关键提取规则**（必须遵守）：

📊 **评价数据提取**：
- 总评价数：找页面上显示的"XXX 条评价"或"XXX Reviews"的数字
- 如果页面显示"1,234 条评价"，就是 1234
- 五星/四星/三星/二星/一星：找评价分布统计区域
- 百分比：从页面读取或自己计算（必须加和=100%）
- 如果看不到具体分布，根据用户正负评论比例推估（但要标注"[基于评论推估]"）

📋 **参数提取**：
- 位置：通常在"商品详情"→"规格参数"或"商品信息"标签页
- 关键参数（根据产品类型选择）：
  * 清洁电器：功率(W)、吸力(kPa/Pa)、噪音(dB)、续航、水箱/集尘盒容量、滚刷类型、保修期
  * 厨房电器：功率、容量、材质、控制方式、保修期
  * 个护电器：功率、噪音、续航、充电时间、防水等级、保修期
- 如果页面显示"20,000Pa"，就是 20,000Pa，不能改成 20kPa 或 22,000Pa
- 单位要准确：W、kPa、Pa、dB 等

⭐ **用户评论提取**：
- 正面评论（5星、4星）：找用户说好的点，提取 3-5 个最高频的词汇
- 负面评论（1星、2星）：找用户吐槽的点，提取 3-5 个最高频的词汇
- 示例正面：["吸力强劲", "续航长", "清洁效果好", "操作简单", "性价比高"]
- 示例负面：["噪音大", "续航不足", "容易堵塞", "维修费贵", "客服差"]

🎯 **卖点提取**：
- 位置：通常在产品标题、第一张图、"商品介绍"或"产品亮点"部分
- 提取 5 个最主要的卖点
- 示例：["110°C 高温蒸汽杀菌", "2.3L 大容量", "30 分钟续航", "轻量化设计", "一键切换功能"]

**数据准确性要求**：
- ❌ 不要估算、不要四舍五入、不要修改单位
- ❌ 如果页面显示"68dB"，就是 68dB，不能写成"约 70dB"或"68-70dB"
- ❌ 如果看不到具体数字，必须标注"[页面未标注]"而不是编造
- ✅ 页面有数据就准确提取
- ✅ 页面无数据但这个参数很重要，基于行业标准补充并标注"[行业参考值]"

**返回严格的 JSON 格式**：

{
  "products": [
    {
      "name": "产品完整名称",
      "category": "具体类别（如：手持无线吸尘器、立式洗地机、全自动破壁机等）",
      "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
      "reviews": {
        "totalCount": 总评价数（数字，如：1234）,
        "distribution": {
          "5star": { "count": 5星数量, "percentage": "45%" },
          "4star": { "count": 4星数量, "percentage": "30%" },
          "3star": { "count": 3星数量, "percentage": "15%" },
          "2star": { "count": 2星数量, "percentage": "5%" },
          "1star": { "count": 1星数量, "percentage": "5%" }
        },
        "likes": ["用户喜欢1", "用户喜欢2", "用户喜欢3"],
        "dislikes": ["用户吐槽1", "用户吐槽2", "用户吐槽3"]
      },
      "parameters": {
        "参数1": "值（格式必须匹配页面，如：20,000Pa、110°C、2.3L等）",
        "参数2": "值",
        "参数3": "值",
        "参数4": "值",
        "参数5": "值",
        "参数6": "值",
        "参数7": "值",
        "参数8": "值",
        "参数9": "值",
        "参数10": "值"
      }
    }
  ],
  "comparisonInsights": {
    "优势对比": "哪个产品在吸力、续航、噪音、容量等方面更优",
    "劣势提醒": "用户真实吐槽最多的问题、容易忽视的缺陷",
    "适用场景": "根据参数和用户评论，推荐给什么类型的家庭使用",
    "采购建议": "综合性价比、性能、耐久性、维护成本的购买建议"
  },
  "suggestions": "基于产品对比和用户真实需求的综合优化建议"
}

**特别注意**：
- 所有百分比必须加和 = 100%
- 所有数字来自页面真实数据，不要修改
- 如果无法确定某个数据，宁可标注"[页面未标注]"也不要猜测
- comparisonInsights 必须基于真实参数和用户评论，不要凭空编造
- 返回的 JSON 必须有效，可以直接被 JSON.parse() 解析`
            },
            {
              role: 'user',
              content: `请访问以下产品链接，从页面准确提取真实数据并返回 JSON 格式。特别注意：所有数字必须来自页面原文，不要修改、估算或改变单位。\n\n${linksText}`
            }
          ]
        },
        parameters: {
          temperature: 0.5,
          max_tokens: 3000,
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
