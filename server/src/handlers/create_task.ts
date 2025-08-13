import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description, // Can be null as per schema
        due_date: input.due_date,
        priority: input.priority,
        is_completed: false // Default value for new tasks
      })
      .returning()
      .execute();

    // Return the created task
    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};