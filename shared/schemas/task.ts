/**
 * Task Schemas
 *
 * Shared Zod schemas and TypeScript types for task management.
 * Used by both frontend and backend for validation and type safety.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

// ==================== SCHEMAS ====================

/**
 * Schema for creating a new task
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

/**
 * Schema for updating an existing task
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  linkedEventProviderLinkId: z.number().int().nullable().optional(),
  linkedEventVenueLinkId: z.number().int().nullable().optional(),
});

/**
 * Schema for listing tasks query parameters
 */
export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  category: z.string().optional(),
  assignedToUserId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['title', 'priority', 'status', 'dueDate', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Schema for bulk creating tasks (from template)
 */
export const bulkCreateTasksSchema = z.object({
  templateId: z.string().min(1),
  startDate: z.string().optional(),
});

/**
 * Schema for adding a dependency
 */
export const addDependencySchema = z.object({
  dependsOnTaskUuid: z.string().min(1, 'Task UUID is required'),
});

/**
 * Schema for reordering tasks
 */
export const reorderTasksSchema = z.object({
  tasks: z.array(z.object({
    uuid: z.string().min(1),
    sortOrder: z.coerce.number().int().min(0),
  })).min(1),
});

// ==================== TYPES ====================

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;
export type AddDependencyInput = z.infer<typeof addDependencySchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

// ==================== RESPONSE TYPES ====================

export interface TaskLinkedProvider {
  linkId: number;
  name: string;
  category: string;
  bookingStatus: string;
}

export interface TaskLinkedVenue {
  linkId: number;
  name: string;
  bookingStatus: string;
}

export interface TaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  category: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  dependencies?: TaskDependencyResponse[];
  linkedProvider: TaskLinkedProvider | null;
  linkedVenue: TaskLinkedVenue | null;
}

export interface TaskDependencyResponse {
  uuid: string;
  title: string;
  status: TaskStatus;
}

export interface TaskSummaryResponse {
  total: number;
  byStatus: {
    status: TaskStatus;
    count: number;
  }[];
  byPriority: {
    priority: TaskPriority;
    count: number;
  }[];
  overdueCount: number;
}

export interface TaskTemplateInfo {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  categories: string[];
}
