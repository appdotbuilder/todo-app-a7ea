import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskIdInput, type CreateTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Test input for task ID
const testTaskId: TaskIdInput = {
  id: 1
};

// Helper function to create a test task
const createTestTask = async (): Promise<number> => {
  const testTaskInput: CreateTaskInput = {
    title: 'Test Task',
    description: 'A task for testing deletion',
    due_date: new Date('2024-12-31'),
    priority: 'medium'
  };

  const result = await db.insert(tasksTable)
    .values({
      title: testTaskInput.title,
      description: testTaskInput.description,
      due_date: testTaskInput.due_date,
      priority: testTaskInput.priority
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a test task first
    const taskId = await createTestTask();
    
    const result = await deleteTask({ id: taskId });

    // Verify success response
    expect(result.success).toBe(true);
    expect(result.message).toEqual(`Task with ID ${taskId} deleted successfully`);
  });

  it('should remove task from database', async () => {
    // Create a test task first
    const taskId = await createTestTask();
    
    // Verify task exists before deletion
    const beforeDeletion = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();
    
    expect(beforeDeletion).toHaveLength(1);

    // Delete the task
    await deleteTask({ id: taskId });

    // Verify task no longer exists in database
    const afterDeletion = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(afterDeletion).toHaveLength(0);
  });

  it('should return failure for non-existent task', async () => {
    const nonExistentId = 99999;
    
    const result = await deleteTask({ id: nonExistentId });

    // Verify failure response
    expect(result.success).toBe(false);
    expect(result.message).toEqual(`Task with ID ${nonExistentId} not found`);
  });

  it('should handle multiple task deletions correctly', async () => {
    // Create multiple test tasks
    const taskId1 = await createTestTask();
    const taskId2 = await createTestTask();
    const taskId3 = await createTestTask();

    // Verify all tasks exist
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(3);

    // Delete first task
    const result1 = await deleteTask({ id: taskId1 });
    expect(result1.success).toBe(true);

    // Delete second task
    const result2 = await deleteTask({ id: taskId2 });
    expect(result2.success).toBe(true);

    // Verify only one task remains
    const remainingTasks = await db.select().from(tasksTable).execute();
    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].id).toEqual(taskId3);

    // Verify deleted tasks are gone
    const deletedTask1 = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId1))
      .execute();
    const deletedTask2 = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId2))
      .execute();

    expect(deletedTask1).toHaveLength(0);
    expect(deletedTask2).toHaveLength(0);
  });

  it('should handle deletion of task with different priorities', async () => {
    // Create tasks with different priorities
    const highPriorityTask = await db.insert(tasksTable)
      .values({
        title: 'High Priority Task',
        description: 'Important task',
        due_date: new Date('2024-12-31'),
        priority: 'high'
      })
      .returning()
      .execute();

    const lowPriorityTask = await db.insert(tasksTable)
      .values({
        title: 'Low Priority Task',
        description: 'Less important task',
        due_date: new Date('2024-12-31'),
        priority: 'low'
      })
      .returning()
      .execute();

    // Delete high priority task
    const result1 = await deleteTask({ id: highPriorityTask[0].id });
    expect(result1.success).toBe(true);

    // Delete low priority task
    const result2 = await deleteTask({ id: lowPriorityTask[0].id });
    expect(result2.success).toBe(true);

    // Verify both tasks are deleted
    const remainingTasks = await db.select().from(tasksTable).execute();
    expect(remainingTasks).toHaveLength(0);
  });
});