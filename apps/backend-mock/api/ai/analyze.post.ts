import { defineEventHandler, readBody } from 'h3';
import { useResponseError, useResponseSuccess } from '~/utils/response';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function buildPrompt(accident: any) {
  return `请根据以下高速公路事故数据，进行专业的二次事故风险研判：

事故车辆ID: ${accident.id}
速度变化量(ΔV): ${accident.deltaV}g
动力类型: ${accident.powerType}
车内人数: ${accident.occupants}人
翻滚状态: ${accident.rollover ? '已翻滚' : '未翻滚'}
事故位置: (${accident.lat.toFixed(4)}, ${accident.lng.toFixed(4)})
触发时间: ${new Date(accident.timestamp).toISOString()}

请严格按照以下格式输出：

【事故等级】一级（重大）/ 二级（一般）/ 三级（轻微）
【判定依据】简要说明判定理由
【救援力量】建议派遣的救援资源
【交通管制】建议采取的交通管制措施
【注意事项】特别需要注意的事项`;
}

function parseAiResponse(content: string) {
  const extract = (label: string) => {
    const match = content.match(
      new RegExp(String.raw`【${label}】([\s\S]*?)(?=【|$)`),
    );
    return match?.[1]?.trim() || '';
  };

  const levelText = extract('事故等级');
  let level = 3;
  if (levelText.includes('一级')) level = 1;
  else if (levelText.includes('二级')) level = 2;

  return {
    rawAnalysis: content,
    level,
    levelText,
    reason: extract('判定依据'),
    rescue: extract('救援力量'),
    traffic: extract('交通管制'),
    notes: extract('注意事项'),
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accident } = body || {};

  if (!accident) {
    return useResponseError('BadRequestException', 'Accident data is required');
  }

  const apiKey = (process.env as any).DEEPSEEK_API_KEY;
  if (!apiKey) {
    return useResponseError('ServiceUnavailable', 'AI service not configured');
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的交通事故分析助手。请用简洁专业的语言回答问题。严格按照要求的格式输出，不要添加多余的解释。',
          },
          { role: 'user', content: buildPrompt(accident) },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return useResponseError(
        'ExternalServiceError',
        `AI service error: ${response.status}`,
      );
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return useResponseError(
        'ExternalServiceError',
        'Empty response from AI service',
      );
    }

    return useResponseSuccess(parseAiResponse(content));
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return useResponseError(
      'InternalServerError',
      error.message || 'Unknown error',
    );
  }
});
