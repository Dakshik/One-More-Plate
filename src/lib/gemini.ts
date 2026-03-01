import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FoodCondition, GeminiPostAnalysis } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export async function analyzeAndStructureFoodPost(
  restaurantName: string,
  foodDescription: string,
  portions: number,
  pickupBy: string,
  condition: FoodCondition,
  dropoffShelterName = 'Food Bank of Delaware'
): Promise<GeminiPostAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a food rescue coordinator for One More Plate, a Newark Delaware food rescue platform.
Analyze this surplus food post and return a JSON response.

Restaurant: ${restaurantName}
Food: ${foodDescription}
Portions: ${portions}
Pickup by: ${pickupBy}
Condition: ${condition}
Nearest shelter: ${dropoffShelterName}

Return ONLY valid JSON with this exact structure:
{
  "structuredDescription": "Clean 1-sentence summary of available food",
  "estimatedKg": <number, estimate total kg based on portions>,
  "estimatedCo2Saved": <number, kg CO2 saved vs landfill, roughly 2.5x food weight>,
  "urgencyLevel": <"low" | "medium" | "high" based on condition and time>,
  "dispatchMessage": "SMS notification to send volunteers, include emoji, restaurant name, food, portions, pickup time, drop-off shelter",
  "tags": ["array", "of", "3-5", "short", "descriptive", "tags"],
  "distributionRecommendation": "One sentence on best way to distribute this food"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as GeminiPostAnalysis;
  } catch (err) {
    console.error('Gemini API error:', err);
    // Fallback if API fails
    const kg = +(portions * 0.22).toFixed(1);
    return {
      structuredDescription: `${restaurantName} has ${portions} portions of ${foodDescription} available for pickup by ${pickupBy}.`,
      estimatedKg: kg,
      estimatedCo2Saved: +(kg * 2.5).toFixed(1),
      urgencyLevel: condition === 'hot' ? 'high' : condition === 'cold' ? 'low' : 'medium',
      dispatchMessage: `🍽️ Food pickup available!\n\n📍 ${restaurantName} · Newark, DE\n🥘 ${foodDescription} — ${portions} portions\n⏰ Collect by ${pickupBy}\n🏠 Drop off: ${dropoffShelterName}\n\nTap to claim this run.`,
      tags: [condition === 'hot' ? '🔥 Hot' : '♨️ Warm', `${portions} portions`, 'Pickup tonight'],
      distributionRecommendation: `Distribute immediately — suitable for direct hot meal service at the shelter.`,
    };
  }
}

export async function generateVolunteerMatchMessage(
  volunteerName: string,
  restaurantName: string,
  foodDescription: string,
  portions: number,
  pickupBy: string,
  distanceMiles: number
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Write a brief, friendly SMS notification message for a food rescue volunteer.
Keep it under 80 words. Use a warm but urgent tone. Include emojis.

Volunteer: ${volunteerName}
Restaurant: ${restaurantName}
Food: ${foodDescription}
Portions: ${portions}
Pickup by: ${pickupBy}
Distance from volunteer: ${distanceMiles} miles

End with: "Reply YES to claim this run."
Return only the message text, no JSON.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Hi ${volunteerName}! 🍽️\n\n${restaurantName} has ${portions} portions of ${foodDescription} — just ${distanceMiles}mi from you. Pickup by ${pickupBy}.\n\nReply YES to claim this run.`;
  }
}
