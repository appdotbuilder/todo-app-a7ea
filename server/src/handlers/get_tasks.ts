import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task, type FilterTasksInput } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getTasks = async (filters?: FilterTasksInput): Promise<Task[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Apply completion status filter if provided
    if (filters?.is_completed !== undefined) {
      conditions.push(eq(tasksTable.is_completed, filters.is_completed));
    }

    // Apply priority filter if provided
    if (filters?.priority) {
      conditions.push(eq(tasksTable.priority, filters.priority));
    }

    // Build query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(tasksTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(tasksTable)
          .execute();

    // Convert results to proper Task type (no numeric conversions needed for this schema)
    return results.map(task => ({
      ...task,
      // Ensure dates are properly handled - they should already be Date objects from timestamp columns
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  } catch (error) {
    console.error('Failed to get tasks:', error);
    throw error;
  }
};

export const getAllTasks = async (): Promise<Task[]> => {
  // Delegate to getTasks with no filters to get all tasks
  return getTasks();
};