import { env } from '../config/env';
import { ParsedListing } from '../types';

/**
 * WhatsApp notification service via Ultramsg.
 *
 * Provider interface pattern: if Ultramsg becomes unreliable,
 * swap to official WhatsApp Cloud API without rewriting business logic.
 *
 * Ultramsg docs: https://docs.ultramsg.com/
 */

interface WhatsAppProvider {
  sendMessage(to: string, body: string): Promise<{ id: string; sent: boolean }>;
}

/**
 * Ultramsg implementation
 */
class UltramsgProvider implements WhatsAppProvider {
  private instanceId: string;
  private token: string;

  constructor(instanceId: string, token: string) {
    this.instanceId = instanceId;
    this.token = token;
  }

  async sendMessage(to: string, body: string): Promise<{ id: string; sent: boolean }> {
    const url = `https://api.ultramsg.com/${this.instanceId}/messages/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.token,
        to,
        body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ultramsg send failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { id: data.id || 'unknown', sent: data.sent === 'true' || data.sent === true };
  }
}

/**
 * Stub provider for development (logs to console)
 */
class StubProvider implements WhatsAppProvider {
  async sendMessage(to: string, body: string): Promise<{ id: string; sent: boolean }> {
    console.log(`[WhatsApp Stub] Would send to ${to}:\n${body}\n`);
    return { id: 'stub-' + Date.now(), sent: true };
  }
}

// Initialize provider based on env
function getProvider(): WhatsAppProvider {
  if (env.ULTRAMSG_INSTANCE_ID && env.ULTRAMSG_TOKEN) {
    return new UltramsgProvider(env.ULTRAMSG_INSTANCE_ID, env.ULTRAMSG_TOKEN);
  }
  console.warn('[Notifier] Ultramsg not configured - using stub provider (messages logged to console)');
  return new StubProvider();
}

let provider: WhatsAppProvider | null = null;

function ensureProvider(): WhatsAppProvider {
  if (!provider) {
    provider = getProvider();
  }
  return provider;
}

/**
 * Notify a renter about a new matching listing
 */
export async function notifyRenter(
  renterPhone: string,
  listing: { id: string; parsedData: ParsedListing },
  siteUrl: string = env.CORS_ORIGIN
): Promise<void> {
  const p = listing.parsedData;
  const listingUrl = `${siteUrl}/listing/${listing.id}`;

  const message = [
    `🏠 *Nueva propiedad disponible!*`,
    ``,
    `📍 ${p.location || 'Ubicación no especificada'}`,
    `🛏️ ${p.bedrooms || '?'} recámara(s) - ${p.property_type || 'propiedad'}`,
    `💰 $${p.price?.toLocaleString() || '?'} ${p.currency}/mes`,
    ``,
    p.summary_es,
    ``,
    `👉 Ver detalles: ${listingUrl}`,
    ``,
    `_Enviado por Casa Mazunte - Responde PARAR para dejar de recibir alertas._`,
  ].join('\n');

  await ensureProvider().sendMessage(renterPhone, message);
}

/**
 * Send auto-reply to landlord who submitted a listing via Ultramsg
 */
export async function sendLandlordConfirmation(
  landlordPhone: string
): Promise<void> {
  const message = [
    `✅ *¡Gracias!*`,
    ``,
    `Tu anuncio ha sido recibido y será revisado pronto.`,
    `Te avisaremos cuando esté publicado en Casa Mazunte.`,
    ``,
    `_Si quieres promover tu anuncio al inicio de la página, dona $250 MXN a la escuela "Raíces de Vida" y envíanos el comprobante._`,
  ].join('\n');

  await ensureProvider().sendMessage(landlordPhone, message);
}

/**
 * Send a generic message
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<{ id: string; sent: boolean }> {
  return ensureProvider().sendMessage(to, body);
}
