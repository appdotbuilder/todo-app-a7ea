import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskIdInput } from '../schema';
import { toggleTaskCompletion } from '../handlers/toggle_task_completion';
import { eq } from 'drizzle-orm';

describe('toggleTaskCompletion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should toggle task from false to true', async () => {
    // Create a test task that is not completed
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing toggle functionality',
        due_date: new Date('2024-12-31'),
        priority: 'medium',
        is_completed: false
      })
      .returning()
      .execute();

    const taskId = insertResult[0].id;
    const input: TaskIdInput = { id: taskId };

    // Toggle the task completion
    const result = await toggleTaskCompletion(input);

    // Verify the task is now completed
    expect(result.id).toEqual(taskId);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing toggle functionality');
    expect(result.priority).toEqual('medium');
    expect(result.is_completed).toBe(true); // Should be toggled to true
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at is recent (within last few seconds)
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result.updated_at.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  it('should toggle task from true to false', async () => {
    // Create a test task that is completed
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: 'A completed task for testing',
        due_date: new Date('2024-12-31'),
        priority: 'high',
        is_completed: true
      })
      .returning()
      .execute();

    const taskId = insertResult[0].id;
    const input: TaskIdInput = { id: taskId };

    // Toggle the task completion
    const result = await toggleTaskCompletion(input);

    // Verify the task is now not completed
    expect(result.id).toEqual(taskId);
    expect(result.title).toEqual('Completed Task');
    expect(result.is_completed).toBe(false); // Should be toggled to false
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the task in the database', async () => {
    // Create a test task
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Database Update Test',
        description: null,
        due_date: new Date('2024-12-31'),
        priority: 'low',
        is_completed: false
      })
      .returning()
      .execute();

    const taskId = insertResult[0].id;
    const originalUpdatedAt = insertResult[0].updated_at;
    
    // Wait a moment to ensure updated_at will be different
    await new Promise(resolve => setTimeout(resolve, 10));

    // Toggle the task completion
    await toggleTaskCompletion({ id: taskId });

    // Query the database directly to verify the update
    const updatedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(updatedTasks).toHaveLength(1);
    const updatedTask = updatedTasks[0];
    
    expect(updatedTask.is_completed).toBe(true); // Should be toggled
    expect(updatedTask.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent task', async () => {
    const nonExistentId = 99999;
    const input: TaskIdInput = { id: nonExistentId };

    // Expect the function to throw an error
    await expect(toggleTaskCompletion(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should handle task with null description', async () => {
    // Create a task with null description
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Task with Null Description',
        description: null, // Explicitly null
        due_date: new Date('2024-12-31'),
        priority: 'medium',
        is_completed: false
      })
      .returning()
      .execute();

    const taskId = insertResult[0].id;
    const input: TaskIdInput = { id: taskId };

    // Toggle the task completion
    const result = await toggleTaskCompletion(input);

    // Verify the task is properly handled with null description
    expect(result.id).toEqual(taskId);
    expect(result.description).toBeNull();
    expect(result.is_completed).toBe(true);
  });

  it('should preserve all other task fields when toggling', async () => {
    // Create a task with all fields populated
    const testDate = new Date('2024-06-15T10:30:00Z');
    const insertResult = await db.insert(tasksTable)
      .values({
        title: 'Preserve Fields Test',
        description: 'This description should be preserved',
        due_date: testDate,
        priority: 'high',
        is_completed: false
      })
      .returning()
      .execute();

    const taskId = insertResult[0].id;
    const originalCreatedAt = insertResult[0].created_at;

    // Toggle the task completion
    const result = await toggleTaskCompletion({ id: taskId });

    // Verify all original fields are preserved except is_completed and updated_at
    expect(result.title).toEqual('Preserve Fields Test');
    expect(result.description).toEqual('This description should be preserved');
    expect(result.due_date).toEqual(testDate);
    expect(result.priority).toEqual('high');
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.is_completed).toBe(true); // Only this should change
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});