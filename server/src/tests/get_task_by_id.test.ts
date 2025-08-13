import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskIdInput } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

// Test input for task ID
const testTaskId: TaskIdInput = {
  id: 1
};

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a task when it exists', async () => {
    // Create a test task first
    const testTask = {
      title: 'Test Task',
      description: 'A task for testing',
      due_date: new Date('2024-12-31'),
      priority: 'high' as const
    };

    const insertResult = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test getting the task by ID
    const result = await getTaskById({ id: createdTask.id });

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTask.id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.description).toEqual('A task for testing');
    expect(result!.due_date).toBeInstanceOf(Date);
    expect(result!.due_date).toEqual(new Date('2024-12-31'));
    expect(result!.priority).toEqual('high');
    expect(result!.is_completed).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when task does not exist', async () => {
    // Test with a non-existent ID
    const result = await getTaskById({ id: 999 });

    expect(result).toBeNull();
  });

  it('should handle task with null description', async () => {
    // Create a test task with null description
    const testTask = {
      title: 'Task without description',
      description: null,
      due_date: new Date('2024-06-15'),
      priority: 'low' as const
    };

    const insertResult = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test getting the task by ID
    const result = await getTaskById({ id: createdTask.id });

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Task without description');
    expect(result!.description).toBeNull();
    expect(result!.priority).toEqual('low');
  });

  it('should handle completed task correctly', async () => {
    // Create a completed task
    const testTask = {
      title: 'Completed Task',
      description: 'This task is done',
      due_date: new Date('2024-01-01'),
      priority: 'medium' as const,
      is_completed: true
    };

    const insertResult = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test getting the completed task
    const result = await getTaskById({ id: createdTask.id });

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Completed Task');
    expect(result!.is_completed).toEqual(true);
    expect(result!.priority).toEqual('medium');
  });

  it('should return proper date objects for all timestamp fields', async () => {
    // Create a test task
    const testTask = {
      title: 'Date Test Task',
      description: 'Testing date handling',
      due_date: new Date('2024-07-20T14:30:00Z'),
      priority: 'high' as const
    };

    const insertResult = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const createdTask = insertResult[0];

    // Test date object handling
    const result = await getTaskById({ id: createdTask.id });

    expect(result).not.toBeNull();
    expect(result!.due_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify the due_date is correctly preserved
    expect(result!.due_date.toISOString()).toContain('2024-07-20');
  });
});