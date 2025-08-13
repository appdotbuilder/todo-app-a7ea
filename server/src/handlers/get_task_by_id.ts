import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task, type TaskIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const getTaskById = async (input: TaskIdInput): Promise<Task | null> => {
  try {
    // Query the database for the task with the given ID
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    // Return the first result if found, otherwise null
    if (results.length === 0) {
      return null;
    }

    const task = results[0];
    return {
      ...task,
      // Ensure dates are properly converted to Date objects
      due_date: new Date(task.due_date),
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at)
    };
  } catch (error) {
    console.error('Task retrieval failed:', error);
    throw error;
  }
};