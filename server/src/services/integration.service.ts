import { Integration } from '../models/integration.model.js';
import { IntegrationType } from '../constants/enums.js';
import { signId } from '../utils/signature.util.js';
import { env } from '../env.js';
import type { IIntegration } from '../interfaces/models.interface.js';

export class IntegrationService {
  /**
   * Toggles an integration status for a user.
   * If it doesn't exist, it creates it with isActive: true.
   */
  static async toggleIntegration(userId: string, type: IntegrationType) {
    const integration = await Integration.findOne({ userId, type });

    if (!integration) {
      // Create new active integration
      return await Integration.create({
        userId,
        type,
        isActive: true
      });
    }

    // Toggle existing status
    integration.isActive = !integration.isActive;
    return await integration.save();
  }

  /**
   * Get all integrations for a user.
   */
  static async getIntegrations(userId: string) {
    const integrations = await Integration.find({ userId });
    
    // Enrich with webhook URLs
    return integrations.map(integration => {
      const { url, signature } = this.getWebhookDetails(integration);
      return {
        ...integration.toObject(),
        webhookUrl: url,
        webhookSignature: signature
      };
    });
  }

  /**
   * Generates webhook details for a specific integration.
   */
  static getWebhookDetails(integration: IIntegration) {
    const timestamp = integration.updatedAt.getTime().toString();
    const signature = signId(integration._id.toString(), timestamp);
    
    // Use the backend URL from env if available, otherwise fallback
    const baseUrl = env.API_URL;
    let url = `${baseUrl}/api/webhooks/${integration.type}/${integration._id}/${signature}`;
    
    // For telinfy, we point to the endpoint that requires provider-level signature verification
    if (integration.type === IntegrationType.TELINFY) {
      url += '/signature';
    }
    
    return { url, signature };
  }
}
