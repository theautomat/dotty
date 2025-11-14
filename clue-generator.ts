/**
 * AI Clue Generator
 *
 * This service generates pirate-themed clues for treasures using OpenAI API.
 * It should be triggered as a Cloud Function when a new clue document is created.
 *
 * Cloud Function Trigger:
 * - Event: onCreate
 * - Path: treasures/{treasureId}/clues/{clueId}
 *
 * Setup:
 * 1. Set OPENAI_API_KEY environment variable
 * 2. Deploy as Firebase Cloud Function or run as background service
 *
 * The clue generation uses a pirate storyteller persona to create mysterious
 * riddles that hint at treasure locations without revealing the exact coordinates.
 */

import { clueService } from './clue-service';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'; // Cheap model
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface TreasureLocation {
  x: number;
  y: number;
}

/**
 * Call OpenAI API to generate a clue
 */
async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a mysterious pirate oracle who speaks in riddles and metaphors.
You give cryptic clues about treasure locations on a map grid (coordinates from -100 to 100 on both X and Y axes).
Your clues should be poetic, mysterious, and pirate-themed, using nautical terms and pirate language.
Never reveal exact coordinates - instead use directional hints, landmarks, and riddles.
Keep clues concise (2-3 sentences max) but evocative and mysterious.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9, // High creativity
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const clueText = data.choices?.[0]?.message?.content?.trim();

  if (!clueText) {
    throw new Error('Failed to generate clue from OpenAI response');
  }

  return clueText;
}

/**
 * Generate a treasure location hint prompt
 */
function createCluePrompt(location: TreasureLocation): string {
  const { x, y } = location;

  // Describe general location without revealing exact coordinates
  let locationHint = '';

  // Quadrant hints
  if (x > 0 && y > 0) {
    locationHint = 'in the northeast quadrant of the map';
  } else if (x < 0 && y > 0) {
    locationHint = 'in the northwest quadrant of the map';
  } else if (x < 0 && y < 0) {
    locationHint = 'in the southwest quadrant of the map';
  } else if (x > 0 && y < 0) {
    locationHint = 'in the southeast quadrant of the map';
  } else {
    locationHint = 'near the center of the map';
  }

  // Distance hint (rough estimate)
  const distance = Math.sqrt(x * x + y * y);
  let distanceHint = '';

  if (distance < 20) {
    distanceHint = 'close to the origin';
  } else if (distance < 50) {
    distanceHint = 'at a moderate distance from the center';
  } else if (distance < 80) {
    distanceHint = 'far from the center';
  } else {
    distanceHint = 'at the edge of the known world';
  }

  return `Create a mysterious pirate riddle that hints at treasure located ${locationHint}, ${distanceHint}.
The treasure is at approximate coordinates (${Math.round(x / 10) * 10}, ${Math.round(y / 10) * 10}) -
give directional and distance hints but never state exact numbers. Use pirate language, metaphors, and nautical terms.`;
}

/**
 * Generate a clue for a treasure
 *
 * For now, this is a placeholder that returns a mock location.
 * In production, this should fetch the actual treasure location from the blockchain or database.
 */
export async function generateClue(
  treasureId: string,
  clueId: string
): Promise<{ success: boolean; clueText?: string; error?: string }> {
  try {
    console.log(`🎲 Generating clue for treasure ${treasureId}`);

    // Update status to generating
    await clueService.updateClueStatus(treasureId, clueId, 'generating');

    // TODO: Fetch actual treasure location from blockchain or database
    // For now, using mock data - in production, query the actual treasure coordinates
    const mockLocation: TreasureLocation = {
      x: Math.floor(Math.random() * 200) - 100, // Random -100 to 100
      y: Math.floor(Math.random() * 200) - 100,
    };

    console.log(`📍 Mock treasure location: (${mockLocation.x}, ${mockLocation.y})`);

    // Create prompt for OpenAI
    const prompt = createCluePrompt(mockLocation);
    console.log(`💬 Prompt: ${prompt}`);

    // Generate clue using OpenAI
    const clueText = await callOpenAI(prompt);
    console.log(`✨ Generated clue: ${clueText}`);

    // Update clue with generated text
    await clueService.updateClueText(treasureId, clueId, clueText);

    console.log(`✅ Clue generation complete for ${clueId}`);

    return {
      success: true,
      clueText,
    };

  } catch (error) {
    console.error(`❌ Error generating clue:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update clue status to failed
    await clueService.updateClueStatus(treasureId, clueId, 'failed', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Cloud Function handler (for Firebase Functions)
 *
 * This would be deployed as a Firebase Cloud Function:
 *
 * ```typescript
 * import * as functions from 'firebase-functions';
 *
 * export const onClueCreated = functions.firestore
 *   .document('treasures/{treasureId}/clues/{clueId}')
 *   .onCreate(async (snapshot, context) => {
 *     const { treasureId, clueId } = context.params;
 *     await generateClue(treasureId, clueId);
 *   });
 * ```
 */

// For local development/testing, you can also create a simple HTTP endpoint
export async function handleClueGenerationRequest(treasureId: string, clueId: string) {
  return await generateClue(treasureId, clueId);
}
