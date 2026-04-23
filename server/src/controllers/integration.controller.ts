import type { Request, Response } from 'express';
import { IntegrationService } from '../services/integration.service.js';
import { IntegrationType } from '../constants/enums.js';

export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const integrations = await IntegrationService.getIntegrations(userId.toString());
    res.status(200).json(integrations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleIntegration = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type } = req.params;
    
    // Validate type
    if (!Object.values(IntegrationType).includes(type as IntegrationType)) {
      return res.status(400).json({ message: 'Invalid integration type' });
    }

    const integration = await IntegrationService.toggleIntegration(userId.toString(), type as IntegrationType);
    
    // Get full details including webhook URL using the updated integration object
    const details = IntegrationService.getWebhookDetails(integration);

    res.status(200).json({
      ...integration.toObject(),
      webhookUrl: details.url,
      webhookSignature: details.signature
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
