export interface BillingErrorDetails {
  code: string;
  message: string;
  limit?: number;
  current?: number;
  upgradeTo?: string;
  upgradeUrl: string;
}

export class PlanLimitError extends Error {
  readonly isPlanLimitError = true;
  readonly code: string;
  readonly limit?: number;
  readonly current?: number;
  readonly upgradeTo?: string;
  readonly upgradeUrl: string;

  constructor(details: BillingErrorDetails) {
    super(details.message);
    this.name = 'PlanLimitError';
    this.code = details.code;
    this.limit = details.limit;
    this.current = details.current;
    this.upgradeTo = details.upgradeTo;
    this.upgradeUrl = details.upgradeUrl;
  }
}

export async function handleApiResponse<T>(response: Response): Promise<{ success: boolean; data?: T }> {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 402) {
      throw new PlanLimitError({
        code: data.error?.code ?? 'PLAN_LIMIT',
        message: data.error?.message ?? 'This feature requires a plan upgrade.',
        limit: data.error?.limit,
        current: data.error?.current,
        upgradeTo: data.error?.upgradeTo,
        upgradeUrl: data.error?.upgradeUrl ?? '/dashboard/billing',
      });
    }
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}
