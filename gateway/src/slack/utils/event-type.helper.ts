/**
 * Slack Event Type Helper
 * 
 * Determines the correct normalized event type based on the raw Slack event.
 * This is necessary because Slack sends generic types (e.g., 'message') that need
 * to be normalized to specific subtypes (e.g., 'message.channels') based on context.
 * 
 * Reference: https://api.slack.com/events
 */

/**
 * Determines the correct event type for a Slack event
 * 
 * Slack uses context clues to determine message subtypes:
 * - Channel ID starts with 'C' → public channel (message.channels)
 * - Channel ID starts with 'G' → private channel/group (message.groups)
 * - Channel ID starts with 'D' → direct message (message.im)
 * - Channel ID starts with 'M' → multi-person DM (message.mpim)
 * 
 * @param event - The Slack event object from the webhook
 * @returns The normalized event type (e.g., 'message.channels' instead of 'message')
 * 
 * @example
 * const event = {
 *   type: 'message',
 *   channel: 'C123ABC',  // Channel ID starting with 'C'
 *   text: 'Hello',
 *   ...
 * };
 * 
 * const eventType = getSlackEventType(event);
 * // Returns: 'message.channels'
 */
export function getSlackEventType(event: Record<string, unknown>): string {
  const baseType = event['type'] as string;

  // Handle message events - need to determine subtype based on channel ID
  if (baseType === 'message') {
    const channel = event['channel'] as string | undefined;
    const subtype = event['subtype'] as string | undefined;

    // If there's a subtype field, messages with subtypes are usually special cases
    // (e.g., file_share, bot_message, etc.) and we may want to handle them differently
    // For now, we normalize based on channel type
    if (!channel) {
      // Fallback if channel is missing (shouldn't happen in practice)
      return 'message.channels';
    }

    // Determine message subtype based on channel ID prefix
    if (channel.startsWith('C')) {
      return 'message.channels'; // Public channel
    } else if (channel.startsWith('G')) {
      return 'message.groups'; // Private channel/group
    } else if (channel.startsWith('D')) {
      return 'message.im'; // Direct message
    } else if (channel.startsWith('M')) {
      return 'message.mpim'; // Multi-person direct message
    }

    // Fallback (shouldn't reach here with valid Slack events)
    return 'message.channels';
  }

  // All other event types are returned as-is
  // (app_mention, channel_created, reaction_added, etc.)
  return baseType;
}
