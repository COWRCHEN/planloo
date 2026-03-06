import { describe, it, expect } from 'vitest';
import { PlanLimitError, handleApiResponse } from './api-error';

// ==================== PlanLimitError ====================

describe('PlanLimitError', () => {
  it('sets message from details', () => {
    const err = new PlanLimitError({
      code: 'EVENT_LIMIT_EXCEEDED',
      message: 'Too many events',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.message).toBe('Too many events');
  });

  it('sets code from details', () => {
    const err = new PlanLimitError({
      code: 'GUEST_LIMIT_EXCEEDED',
      message: 'Too many guests',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.code).toBe('GUEST_LIMIT_EXCEEDED');
  });

  it('sets name to PlanLimitError', () => {
    const err = new PlanLimitError({
      code: 'X',
      message: 'msg',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.name).toBe('PlanLimitError');
  });

  it('sets isPlanLimitError flag to true', () => {
    const err = new PlanLimitError({
      code: 'X',
      message: 'msg',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.isPlanLimitError).toBe(true);
  });

  it('sets optional limit and current from details', () => {
    const err = new PlanLimitError({
      code: 'EVENT_LIMIT_EXCEEDED',
      message: 'msg',
      limit: 3,
      current: 3,
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.limit).toBe(3);
    expect(err.current).toBe(3);
  });

  it('sets optional upgradeTo from details', () => {
    const err = new PlanLimitError({
      code: 'EVENT_LIMIT_EXCEEDED',
      message: 'msg',
      upgradeTo: 'planner',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.upgradeTo).toBe('planner');
  });

  it('sets upgradeUrl from details', () => {
    const err = new PlanLimitError({
      code: 'X',
      message: 'msg',
      upgradeUrl: '/dashboard/billing',
    });
    expect(err.upgradeUrl).toBe('/dashboard/billing');
  });

  it('is an instance of Error', () => {
    const err = new PlanLimitError({ code: 'X', message: 'msg', upgradeUrl: '/' });
    expect(err).toBeInstanceOf(Error);
  });
});

// ==================== handleApiResponse ====================

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('handleApiResponse', () => {
  it('returns data for a successful response', async () => {
    const response = makeResponse(200, { success: true, data: { id: 1 } });
    const result = await handleApiResponse<{ id: number }>(response);
    expect(result).toEqual({ success: true, data: { id: 1 } });
  });

  it('throws PlanLimitError for a 402 response', async () => {
    const response = makeResponse(402, {
      error: {
        code: 'EVENT_LIMIT_EXCEEDED',
        message: 'Too many events',
        limit: 1,
        current: 1,
        upgradeTo: 'personal',
        upgradeUrl: '/dashboard/billing',
      },
    });

    await expect(handleApiResponse(response)).rejects.toThrow(PlanLimitError);
  });

  it('sets PlanLimitError properties correctly from 402 response', async () => {
    const response = makeResponse(402, {
      error: {
        code: 'GUEST_LIMIT_EXCEEDED',
        message: 'Too many guests',
        limit: 50,
        current: 50,
        upgradeTo: 'personal',
        upgradeUrl: '/dashboard/billing',
      },
    });

    let caught: PlanLimitError | undefined;
    try {
      await handleApiResponse(response);
    } catch (e) {
      caught = e as PlanLimitError;
    }

    expect(caught?.code).toBe('GUEST_LIMIT_EXCEEDED');
    expect(caught?.limit).toBe(50);
    expect(caught?.current).toBe(50);
    expect(caught?.upgradeTo).toBe('personal');
  });

  it('uses fallback code PLAN_LIMIT when error.code is missing in 402 response', async () => {
    const response = makeResponse(402, { error: {} });

    let caught: PlanLimitError | undefined;
    try {
      await handleApiResponse(response);
    } catch (e) {
      caught = e as PlanLimitError;
    }

    expect(caught?.code).toBe('PLAN_LIMIT');
  });

  it('throws a generic Error for non-402 error responses', async () => {
    const response = makeResponse(400, { error: { message: 'Bad request' } });
    await expect(handleApiResponse(response)).rejects.toThrow('Bad request');
    await expect(handleApiResponse(makeResponse(400, { error: { message: 'Bad request' } }))).rejects.not.toThrow(PlanLimitError);
  });

  it('throws Error with fallback message when error.message is missing', async () => {
    const response = makeResponse(500, {});
    await expect(handleApiResponse(response)).rejects.toThrow('Request failed');
  });
});
