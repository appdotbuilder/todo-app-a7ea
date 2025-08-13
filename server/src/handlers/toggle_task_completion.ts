import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskIdInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const toggleTaskCompletion = async (input: TaskIdInput): Promise<Task> => {
  try {
    // First, find the existing task
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTasks.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const existingTask = existingTasks[0];

    // Toggle the completion status and update the updated_at timestamp
    const result = await db.update(tasksTable)
      .set({
        is_completed: !existingTask.is_completed, // Toggle the boolean value
        updated_at: new Date() // Set current timestamp
      })
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task completion toggle failed:', error);
    throw error;
  }
};