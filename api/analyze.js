export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { link, desc } = req.body;

  if (!link || link.trim() === '') {
    return res.status(400).json({ error: '请输入产品链接或描述' });
  }

  try {
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
              content: `你是一位专业的产品经理和营销专家。请以JSON格式分析产品，返回以下结构（确保有效的JSON格式，不要添加任何额外文本）:
{
  "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
  "scores": {
    "product": 8.5,
    "clarity": 8.0,
    "competitive": 7.8,
    "potential": 8.6
  },
  "scoreExplain": "总体评价...",
  "strengths": ["优势1", "优势2", "优势3"],
  "improvements": ["改进1", "改进2", "改进3"],
  "strategy": "具体优化策略和建议..."
}`
            },
            {
              role: 'user',
              content: `分析这个产品：\n链接/名称: ${link}\n描述: ${desc || '无'}`
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 1500,
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
    
    // 阿里云的响应格式不同！
    const content = data.output?.text || data.output?.content || data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in response:', data);
      return res.status(500).json({ error: '未获得有效的 AI 响应内容' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // 如果 JSON 格式不完整，尝试提取
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
