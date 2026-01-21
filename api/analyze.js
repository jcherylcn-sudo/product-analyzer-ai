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
content: `你是一位专业的小家电（生活电器、厨房电器、个护电器）产品分析师。你的目标是帮助消费者做出最佳购买决策。

**你的专业领域包括但不限于**：

生活电器（清洁系列）：
- 吸尘器系列：手持吸尘器、立式吸尘器、车载吸尘器、无线吸尘器
- 洗地机系列：洗地机、电动拖地机、蒸汽拖地机
- 扫地机系列：扫地机、扫地机器人、扫拖一体机
- 其他清洁：除湿机、空气净化器、加湿器、除螨仪、紫外线消毒器等

生活电器（其他）：
- 照明：台灯、落地灯、护眼灯、夜灯
- 温度控制：风扇、电暖器、取暖器、空气循环扇
- 其他：加湿器、除湿机、香薰机、加热垫

厨房电器：破壁机、豆浆机、电饭煲、烤箱、微波炉、蒸箱、咖啡机、榨汁机、电水壶、料理机、面条机、面包机等

个护电器：电动牙刷、卷发棒、吹风机、剃须刀、美容仪、按摩仪、脱毛仪、洗脸刷等

**分析要求**：

1. **自动识别产品具体类别** - 从链接/描述精确判断（如：手持吸尘器、立式吸尘器还是洗地机）
2. **该类别的关键参数自动扩充** - 不限于我列出的，根据该品类的真实市场需求补充
3. **页面标注的参数** - 必须提取真实数据
4. **行业标准参数** - 即使页面未标注，也要基于产品类型补充（标注为"[建议参考]"）
5. **用户实际需求** - 补充页面未提及但用户会关心的要素

**清洁电器（吸尘器/洗地机/扫地机）的核心参数框架**：

基础性能：
- 功率(W) / 吸力(kPa/Air Watts) - **决定清洁能力**
- 噪音值(dB) - **影响使用舒适度**
- 续航/清洁面积(㎡) - **影响使用便利性**
- 水箱容量(L) - **影响清洁效率**

产品特性（根据类型动态调整）：
吸尘器特定：
  - 集尘盒容量(L) - 倾倒频率
  - 过滤等级(HEPA等) - 空气质量
  - 吸头类型数量 - 适用场景
  - 是否无线 - 使用便利性
  - 续航时间(min) - 清洁范围

洗地机特定：
  - 污水/清水箱容量(L) - 清洁面积
  - 滚刷类型(绒毛/胶条/混合) - 清洁效果
  - 加热功能(是否有) - 清洁效果
  - 干燥功能(是否有) - 地面干燥度
  - 适用地面类型 - 适用范围
  - 操作方式(手推/骑行) - 使用舒适度

扫地机特定：
  - 清扫宽度(cm) - 清洁效率
  - 垃圾箱容量(L) - 倾倒频率
  - 滚刷类型 - 清洁效果
  - 扫吸比例 - 清洁方式
  - 导航系统(激光/视觉) - 规划能力
  - 是否有拖地功能 - 多功能性
  - 是否能自动回充 - 便利性

通用参数（所有清洁电器）：
- 材质/结构 - 耐久性
- 易清洁性 - 维护成本
- 保修期 - 后期成本
- 体积/重量 - 收纳/携带
- 安全认证 - 安全性
- 防水等级(清洁电器特别重要) - 使用安全

**厨房电器参数框架**（根据类型动态调整）：

破壁机/料理机特定：
- 功率(W) - 性能
- 转速(rpm) - 效果
- 容量(L) - 单次使用量
- 程序数量 - 功能丰富度
- 噪音(dB) - 舒适度
- 加热功能 - 多功能性

电饭煲特定：
- 容量(L/升) - 家庭大小
- 发热方式(底部/立体) - 受热均匀性
- 程序数量 - 功能丰富度
- 保温时间 - 实用性

咖啡机特定：
- 水箱容量(L) - 使用频率
- 研磨方式(豆粉) - 便利性
- 制热时间(min) - 效率
- 温度控制 - 效果

（其他类型类似动态扩充）

**个护电器参数框架**（根据类型动态调整）：

电动牙刷特定：
- 振动频率(Hz) - 清洁效果
- 电池/续航(day) - 使用便利性
- 充电时间(h) - 日常使用
- 防水等级 - 使用范围
- 挡位数量 - 适用场景

吹风机特定：
- 功率(W) - 性能
- 风速档位(级) - 控制性
- 温度控制 - 护发
- 离子功能 - 护发效果
- 重量(g) - 舒适度

卷发棒特定：
- 加热时间(min) - 便利性
- 温度范围(℃) - 发质适应性
- 材质(陶瓷/钛) - 护发
- 自动关闭时间 - 安全性

（其他类型类似动态扩充）

**输出格式**（严格 JSON）：

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
