import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Timeout helper to guarantee AI calls do not hang indefinitely
async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number = 25000): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`AI Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle!);
    throw err;
  }
}

export async function askSocietyAiAssistant(question: string, contextRole: string, apartment?: string): Promise<string> {
  const client = getAiClient();
  const systemPrompt = `You are "Nivara AI", the intelligent residential society assistant for Nivara Heights Smart Housing Society.
You assist residents, committee members, and security staff with society rules, complaint advice, visitor policies, parking bylaws, maintenance schedules, and facility rules.
Society Rules & Facts:
- Nivara Heights has 3 Wings (A, B, C) with 120 apartments.
- Quiet Hours: 10:30 PM to 6:30 AM daily.
- Swimming Pool: Open 6:00 AM - 11:00 AM and 4:00 PM - 9:00 PM (Tuesdays closed for maintenance).
- Clubhouse/Party Hall: Bookable up to 30 days in advance; deposit is refundable.
- Visitor Gate Policy: All guests must be pre-approved or verified via digital pass at Gate 1 / Gate 2.
- Maintenance Due Date: 10th of every calendar month. Late fee of ₹200 applies after 15th.
- Garbage Segregation: Mandatory Wet & Dry waste segregation into green and blue bins collected at 8:30 AM.
- Emergency Gate Intercom: Dial 001 for Main Gate Security, 002 for Estate Office.
- Pets Policy: Leash mandatory in common areas, pets prohibited in swimming pool area.

User details: Role: ${contextRole}${apartment ? `, Flat: ${apartment}` : ''}.
Provide helpful, polite, structured, and practical answers. If asked about complaints, give step-by-step guidance.`;

  if (!client) {
    // Graceful offline fallback
    return `[Nivara AI Assistant]: Regarding "${question}": At Nivara Heights, all society operations follow our standardized bylaws. Maintenance dues are payable by the 10th, visitor entry is governed by digital QR passes at Gate 1, and quiet hours are 10:30 PM - 6:30 AM. For urgent maintenance or security emergencies, please use the 1-click SOS button or submit a service ticket.`;
  }

  try {
    const response = await runWithTimeout(async () => {
      return await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nUser Question: ${question}`,
      });
    }, 25000);
    return response.text || 'I could not generate an answer at this moment.';
  } catch (error: any) {
    console.warn('Gemini AI Assistant error (using fallback):', error?.message || error);
    return `[Nivara AI Assistant]: Regarding "${question}": Please refer to society guidelines or submit a service ticket in the portal. For urgent gate or security matters, please reach Main Gate Security (#001) or Estate Manager (#002).`;
  }
}

export async function triageComplaintAi(title: string, description: string, category: string): Promise<{ estimatedTime: string; suggestedAction: string; urgencyLevel: string }> {
  // Determine baseline heuristic fallback
  const fallbackUrgency = 
    category === 'Lift / Elevator' || category === 'Electrical' || title.toLowerCase().includes('leak') || title.toLowerCase().includes('fire')
      ? 'High'
      : category === 'Security & Gate' || category === 'Plumbing'
      ? 'Medium'
      : 'Low';

  const fallbackTime = 
    fallbackUrgency === 'High' ? '2 - 4 hours' : fallbackUrgency === 'Medium' ? '4 - 8 hours' : '24 - 48 hours';

  const fallbackAction = `Assigned to ${category} technician for on-site inspection and resolution.`;

  const client = getAiClient();
  if (!client) {
    return {
      estimatedTime: fallbackTime,
      suggestedAction: fallbackAction,
      urgencyLevel: fallbackUrgency,
    };
  }

  try {
    const prompt = `Analyze this residential society maintenance complaint and return JSON only:
Title: ${title}
Category: ${category}
Description: ${description}

Return JSON with exact keys:
{
  "estimatedTime": "e.g. 2-4 hours or 24 hours",
  "suggestedAction": "brief 1-2 sentence recommendation for society manager and assigned technician",
  "urgencyLevel": "Low" | "Medium" | "High" | "Emergency"
}`;

    const response = await runWithTimeout(async () => {
      return await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }, 20000);

    const parsed = JSON.parse(response.text || '{}');
    return {
      estimatedTime: parsed.estimatedTime || fallbackTime,
      suggestedAction: parsed.suggestedAction || fallbackAction,
      urgencyLevel: parsed.urgencyLevel || fallbackUrgency,
    };
  } catch (err: any) {
    console.warn('AI Triage fallback engaged due to:', err?.message || err);
    return {
      estimatedTime: fallbackTime,
      suggestedAction: fallbackAction,
      urgencyLevel: fallbackUrgency,
    };
  }
}

export async function draftNoticeAi(topic: string, category: string, tone: string): Promise<{ title: string; content: string; priority: string }> {
  const fallbackTitle = `Notice Regarding ${topic}`;
  const fallbackContent = `Dear Residents of Nivara Heights,\n\nPlease take note regarding ${topic}. This announcement pertains to ${category} operations. All residents are requested to cooperate with the management committee.\n\nRegards,\nSociety Management Committee`;
  const fallbackPriority = category === 'Security & Gate' || category === 'Water / Power Supply' ? 'Urgent / Alert' : 'Normal';

  const client = getAiClient();
  if (!client) {
    return {
      title: fallbackTitle,
      content: fallbackContent,
      priority: fallbackPriority,
    };
  }

  try {
    const prompt = `You are the Society Secretary of Nivara Heights. Draft a formal residential society notice based on:
Topic: ${topic}
Category: ${category}
Tone: ${tone}

Return JSON with exact keys:
{
  "title": "Clear and impactful notice headline",
  "content": "Full notice message with greeting, bullet points if relevant, dates/timings, and sign-off from Society Management Committee",
  "priority": "Normal" | "Important" | "Urgent / Alert"
}`;

    const response = await runWithTimeout(async () => {
      return await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }, 20000);

    const parsed = JSON.parse(response.text || '{}');
    return {
      title: parsed.title || fallbackTitle,
      content: parsed.content || fallbackContent,
      priority: parsed.priority || fallbackPriority,
    };
  } catch (err: any) {
    console.warn('Draft Notice AI fallback engaged:', err?.message || err);
    return {
      title: fallbackTitle,
      content: fallbackContent,
      priority: fallbackPriority,
    };
  }
}
