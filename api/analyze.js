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
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return res.status(response.status).json({ 
        error: `OpenAI API 错误: ${error.error?.message || '未知错误'}` 
      });
    }

    const data = await response.json();
    const content = data.choices.message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch);
      } else {
        throw new Error('无法解析 AI 返回的格式');
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
