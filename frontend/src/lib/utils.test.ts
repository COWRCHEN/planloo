import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('joins multiple classes with a space', () => {
    expect(cn('text-red-500', 'font-bold')).toBe('text-red-500 font-bold');
  });

  it('ignores falsy values', () => {
    expect(cn('text-red-500', false, null, undefined, '')).toBe('text-red-500');
  });

  it('supports conditional classes via boolean expressions', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('merges conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge resolves conflicts: p-4 overrides p-2
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('merges conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('returns empty string when no arguments are given', () => {
    expect(cn()).toBe('');
  });

  it('handles array-style clsx input', () => {
    expect(cn(['text-sm', 'font-medium'])).toBe('text-sm font-medium');
  });

  it('handles object-style clsx input', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('preserves non-conflicting Tailwind utilities', () => {
    const result = cn('flex', 'items-center', 'text-sm', 'text-lg');
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('text-lg');
    expect(result).not.toContain('text-sm');
  });
});
