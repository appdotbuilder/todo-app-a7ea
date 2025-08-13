import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteTask = async (input: TaskIdInput): Promise<{ success: boolean; message: string }> => {
  try {
    // First, check if the task exists
    const existingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTask.length === 0) {
      return {
        success: false,
        message: `Task with ID ${input.id} not found`
      };
    }

    // Delete the task
    await db.delete(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    return {
      success: true,
      message: `Task with ID ${input.id} deleted successfully`
    };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};