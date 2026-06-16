import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';

type TemplateVariables = Record<string, string | number | null | undefined>;

type SendTemplateParams = {
  to: string;
  templateId: string;
  variables?: TemplateVariables;
};

@Injectable()
export class KakaotalkService {
  private readonly logger = new Logger(KakaotalkService.name);

  private get apiKey() {
    return (process.env.SOLAPI_API_KEY || '').trim();
  }

  private get apiSecret() {
    return (process.env.SOLAPI_API_SECRET || '').trim();
  }

  private get pfid() {
    return (process.env.SOLAPI_PFID || '').trim();
  }

  private get apiBaseUrl() {
    return (process.env.SOLAPI_API_BASE_URL || 'https://api.solapi.com').replace(/\/$/, '');
  }

  private get templatePlanPurchased() {
    return (process.env.SOLAPI_TEMPLATE_PLAN_PURCHASED || '').trim();
  }

  private get templateSiteSelected() {
    return (process.env.SOLAPI_TEMPLATE_SITE_SELECTED || '').trim();
  }

  private get templateApprovalCompleted() {
    return (process.env.SOLAPI_TEMPLATE_APPROVAL_COMPLETED || '').trim();
  }

  private get templateSetupCompleted() {
    return (process.env.SOLAPI_TEMPLATE_SETUP_COMPLETED || '').trim();
  }

  private get templateCollectionStarted() {
    return (process.env.SOLAPI_TEMPLATE_COLLECTION_STARTED || '').trim();
  }

  private get templateCollectionCompleted() {
    return (process.env.SOLAPI_TEMPLATE_COLLECTION_COMPLETED || '').trim();
  }

  private get templateReservationReceived() {
    return (process.env.SOLAPI_TEMPLATE_RESERVATION_RECEIVED || '').trim();
  }

  private get templateSubscriptionExpiring() {
    return (process.env.SOLAPI_TEMPLATE_SUBSCRIPTION_EXPIRING || '').trim();
  }

  private get templateSubscriptionExpiredToday() {
    return (process.env.SOLAPI_TEMPLATE_SUBSCRIPTION_EXPIRED_TODAY || '').trim();
  }

  private get templateQuotaLow() {
    return (process.env.SOLAPI_TEMPLATE_QUOTA_LOW || '').trim();
  }

  private get templateQuotaExhausted() {
    return (process.env.SOLAPI_TEMPLATE_QUOTA_EXHAUSTED || '').trim();
  }

  private isConfigured() {
    return Boolean(this.apiKey && this.apiSecret && this.pfid);
  }

  private normalizePhone(phone: string) {
    return String(phone || '')
      .replace(/\D/g, '')
      .slice(0, 11);
  }

  private buildVariables(variables?: TemplateVariables) {
    const entries = Object.entries(variables || {}).filter(
      ([, value]) => value !== undefined && value !== null,
    );

    return Object.fromEntries(
      entries.map(([key, value]) => [
        key.startsWith('#{') ? key : `#{${key}}`,
        String(value),
      ]),
    );
  }

  private buildAuthorizationHeader() {
    const date = new Date().toISOString();
    const salt = randomUUID().replace(/-/g, '');
    const signature = createHmac('sha256', this.apiSecret)
      .update(date + salt)
      .digest('hex');

    return `HMAC-SHA256 apiKey=${this.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  }

  private async sendTemplate({ to, templateId, variables }: SendTemplateParams) {
    const normalizedPhone = this.normalizePhone(to);

    if (!normalizedPhone) {
      return { success: false, skipped: true, reason: 'missing_phone' };
    }

    if (!this.isConfigured()) {
      this.logger.warn('Solapi config is incomplete. Notification skipped.');
      return { success: false, skipped: true, reason: 'missing_config' };
    }

    if (!templateId) {
      return { success: false, skipped: true, reason: 'missing_template_id' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/messages/v4/send-many/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.buildAuthorizationHeader(),
        },
        body: JSON.stringify({
          messages: [
            {
              to: normalizedPhone,
              type: 'ATA',
              kakaoOptions: {
                pfId: this.pfid,
                templateId,
                disableSms: true,
                variables: this.buildVariables(variables),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Solapi request failed: ${response.status} ${body}`);
        return {
          success: false,
          skipped: false,
          statusCode: response.status,
          body,
        };
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Solapi request error: ${error?.message || error}`);
      return {
        success: false,
        skipped: false,
        error: error?.message || String(error),
      };
    }
  }

  async sendPlanPurchased(payload: {
    to: string;
    planName: string;
    monthCount: number | string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templatePlanPurchased,
      variables: {
        '\uD50C\uB79C\uBA85': payload.planName,
        '\uAC1C\uC6D4\uC218': payload.monthCount,
      },
    });
  }

  async sendSiteSelected(payload: {
    to: string;
    siteList: string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateSiteSelected,
      variables: {
        '\uC0AC\uC774\uD2B8\uBAA9\uB85D': payload.siteList,
      },
    });
  }

  async sendApprovalCompleted(payload: { to: string }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateApprovalCompleted,
    });
  }

  async sendSetupCompleted(payload: { to: string }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateSetupCompleted,
    });
  }

  async sendCollectionStarted(payload: {
    to: string;
    accountPlatform: string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateCollectionStarted,
      variables: {
        accountPlatform: payload.accountPlatform,
      },
    });
  }

  async sendCollectionCompleted(payload: {
    to: string;
    accountPlatform: string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateCollectionCompleted,
      variables: {
        accountPlatform: payload.accountPlatform,
      },
    });
  }

  async sendReservationReceived(payload: {
    to: string;
    accountPlatform: string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateReservationReceived,
      variables: {
        accountPlatform: payload.accountPlatform,
      },
    });
  }

  async sendSubscriptionExpiring(payload: {
    to: string;
    daysLeft: number | string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateSubscriptionExpiring,
      variables: {
        '\uB0A8\uC740\uC77C\uC218': payload.daysLeft,
      },
    });
  }

  async sendSubscriptionExpiredToday(payload: { to: string }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateSubscriptionExpiredToday,
    });
  }

  async sendQuotaLow(payload: {
    to: string;
    remainingPercent: number | string;
    remainingCount: number | string;
  }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateQuotaLow,
      variables: {
        '\uB0A8\uC740\uBE44\uC728': payload.remainingPercent,
        '\uB0A8\uC740\uC694\uCCAD\uC218': payload.remainingCount,
      },
    });
  }

  async sendQuotaExhausted(payload: { to: string }) {
    return this.sendTemplate({
      to: payload.to,
      templateId: this.templateQuotaExhausted,
    });
  }

  async sendInquiryReceived(_payload: {
    type: string;
    title?: string;
    name: string;
    phone: string;
    authorCustomId?: string | null;
    authorLoginId?: string | null;
  }) {
    return { success: false, skipped: true, reason: 'template_not_configured' };
  }

  async sendScheduleReserved(payload: {
    to: string;
    accountPlatform: string;
  }) {
    return this.sendReservationReceived({
      to: payload.to,
      accountPlatform: payload.accountPlatform,
    });
  }
}
