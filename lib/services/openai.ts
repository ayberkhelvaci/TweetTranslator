import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${targetLanguage}. Maintain the original meaning and tone. Only respond with the translation, no explanations.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    const translation = response.choices[0]?.message?.content;
    if (!translation) {
      throw new Error('No translation received from OpenAI');
    }

    return translation.trim();
  } catch (error) {
    console.error('OpenAI translation error:', error);
    throw new Error('Failed to translate text');
  }
} 