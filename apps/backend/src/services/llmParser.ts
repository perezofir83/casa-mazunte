import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { ParsedListing, ParsedListingSchema } from '../types';

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    if (!env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not set. Cannot parse listings.');
    }
    anthropicClient = new Anthropic({ apiKey: env.CLAUDE_API_KEY });
  }
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are a rental listing parser for the Oaxacan coast region of Mexico (Mazunte, San Agustinillo, Zipolite, Puerto Angel, Huatulco, Puerto Escondido area).

Your job is to extract structured data from WhatsApp messages about rental properties.

Rules:
- Messages may be in Spanish or English. Output summaries in BOTH languages.
- If the message is NOT about a rental property (e.g., it's about selling, an event, a question), set is_rental to false.
- Set confidence_score from 0.0 to 1.0 based on how certain you are this is a legitimate rental listing.
- Prices default to MXN unless USD/dollars is explicitly stated.
- For location, normalize to "Neighborhood/Zone, Town" format (e.g., "Centro, Mazunte", "Rinconcito, San Agustinillo").
- For dates, use ISO 8601 format (YYYY-MM-DD). If no year given, assume the nearest future date.
- If information is not mentioned, set the field to null.
- For amenities, use lowercase snake_case Spanish terms: cocina_equipada, internet_wifi, aire_acondicionado, ventilador, terraza, balcon, estacionamiento, lavadora, agua_caliente, alberca, jardin, mascotas_permitidas, amueblado, mosquiteros, vista_al_mar, gas, tinaco.
- For missing_amenities_common, list important amenities that are NOT mentioned (renters want to know what's missing).
- In quality_notes, add helpful observations for a potential renter.
- property_type should be one of: departamento, casa, cuarto, estudio, cabana, bungalow, loft.
- For beds, identify type: king_size, queen, matrimonial, individual, sofa_cama, litera (bunk).
- capacity = reasonable max occupancy based on beds and space described.`;

/**
 * Parse raw WhatsApp message text into structured listing data using Claude Haiku.
 *
 * Cost estimate: ~$0.0004 per parse (200 input + 300 output tokens on Haiku)
 * At 50 listings/day = ~$0.60/month
 */
export async function parseListingText(rawText: string): Promise<ParsedListing> {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Parse this WhatsApp rental listing message and extract structured data:\n\n${rawText}`,
      },
    ],
    tools: [
      {
        name: 'submit_parsed_listing',
        description: 'Submit the parsed rental listing data',
        input_schema: {
          type: 'object' as const,
          properties: {
            is_rental: { type: 'boolean' as const, description: 'Whether this message is about a rental property' },
            confidence_score: { type: 'number' as const, description: 'Confidence from 0.0 to 1.0' },
            price: { type: 'number' as const, description: 'Monthly rental price', nullable: true },
            currency: { type: 'string' as const, enum: ['MXN', 'USD'] },
            price_period: { type: 'string' as const, enum: ['monthly', 'weekly', 'daily', 'nightly'] },
            long_stay_discount: { type: 'boolean' as const },
            location: { type: 'string' as const, description: 'Location in format "Zone, Town"', nullable: true },
            neighborhood: { type: 'string' as const, nullable: true },
            property_type: { type: 'string' as const, nullable: true },
            bedrooms: { type: 'number' as const, nullable: true },
            beds: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  type: { type: 'string' as const },
                  room: { type: 'string' as const },
                },
                required: ['type'] as const,
              },
            },
            bathrooms: { type: 'number' as const, nullable: true },
            capacity: { type: 'number' as const, nullable: true },
            dates_available: {
              type: 'object' as const,
              properties: {
                from: { type: 'string' as const, nullable: true },
                to: { type: 'string' as const, nullable: true },
              },
              nullable: true,
            },
            amenities: { type: 'array' as const, items: { type: 'string' as const } },
            missing_amenities_common: { type: 'array' as const, items: { type: 'string' as const } },
            summary_es: { type: 'string' as const },
            summary_en: { type: 'string' as const },
            quality_notes: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: [
            'is_rental',
            'confidence_score',
            'summary_es',
            'summary_en',
          ] as const,
        },
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'submit_parsed_listing' },
  });

  // Extract the tool call result
  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('LLM did not return structured data');
  }

  // Validate with Zod
  const parsed = ParsedListingSchema.parse(toolUse.input);
  return parsed;
}

/**
 * Parse with fallback - returns null on failure instead of throwing
 */
export async function safeParseListingText(rawText: string): Promise<ParsedListing | null> {
  try {
    return await parseListingText(rawText);
  } catch (error) {
    console.error('LLM parsing failed:', error);
    return null;
  }
}
