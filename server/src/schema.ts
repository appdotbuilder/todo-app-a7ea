import { z } from 'zod';

// Priority levels for tasks
export const priorityEnum = z.enum(['low', 'medium', 'high']);
export type Priority = z.infer<typeof priorityEnum>;

// Task schema with proper numeric handling
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(), // Nullable field, not optional (can be explicitly null)
  due_date: z.coerce.date(), // Automatically converts string timestamps to Date objects
  priority: priorityEnum,
  is_completed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(), // Explicit null allowed, undefined not allowed
  due_date: z.coerce.date(),
  priority: priorityEnum
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(), // Optional = field can be undefined (omitted)
  description: z.string().nullable().optional(), // Can be null or undefined
  due_date: z.coerce.date().optional(),
  priority: priorityEnum.optional(),
  is_completed: z.boolean().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Schema for filtering tasks
export const filterTasksInputSchema = z.object({
  is_completed: z.boolean().optional(), // Filter by completion status
  priority: priorityEnum.optional() // Filter by priority level
});

export type FilterTasksInput = z.infer<typeof filterTasksInputSchema>;

// Schema for task ID parameter
export const taskIdSchema = z.object({
  id: z.number()
});

export type TaskIdInput = z.infer<typeof taskIdSchema>;