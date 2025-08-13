import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (overrides?: Partial<CreateTaskInput>) => {
  const defaultTask = {
    title: 'Original Task',
    description: 'Original description',
    due_date: new Date('2024-12-31'),
    priority: 'medium' as const
  };

  const taskData = { ...defaultTask, ...overrides };

  const result = await db.insert(tasksTable)
    .values({
      ...taskData,
      is_completed: false
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a task with all fields', async () => {
    // Create a test task
    const originalTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Updated Task Title',
      description: 'Updated description',
      due_date: new Date('2025-01-15'),
      priority: 'high',
      is_completed: true
    };

    const result = await updateTask(updateInput);

    // Verify the updated fields
    expect(result.id).toEqual(originalTask.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Updated description');
    expect(result.due_date).toEqual(new Date('2025-01-15'));
    expect(result.priority).toEqual('high');
    expect(result.is_completed).toEqual(true);
    expect(result.created_at).toEqual(originalTask.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should update only provided fields (partial update)', async () => {
    // Create a test task
    const originalTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description',
      priority: 'low'
    });

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Updated Title Only',
      is_completed: true
    };

    const result = await updateTask(updateInput);

    // Verify only updated fields changed
    expect(result.title).toEqual('Updated Title Only');
    expect(result.is_completed).toEqual(true);
    
    // These should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.priority).toEqual('low');
    expect(result.due_date).toEqual(originalTask.due_date);
    expect(result.created_at).toEqual(originalTask.created_at);
    
    // Updated_at should be newer
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should handle null description update', async () => {
    // Create a task with a description
    const originalTask = await createTestTask({
      description: 'Has description'
    });

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual(originalTask.title); // Should remain unchanged
  });

  it('should update priority correctly', async () => {
    const originalTask = await createTestTask({ priority: 'low' });

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      priority: 'high'
    };

    const result = await updateTask(updateInput);

    expect(result.priority).toEqual('high');
  });

  it('should update completion status', async () => {
    const originalTask = await createTestTask();
    expect(originalTask.is_completed).toBe(false);

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      is_completed: true
    };

    const result = await updateTask(updateInput);

    expect(result.is_completed).toBe(true);
  });

  it('should save updates to database', async () => {
    const originalTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Database Updated Title',
      priority: 'high'
    };

    await updateTask(updateInput);

    // Query database directly to verify changes were persisted
    const savedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, originalTask.id))
      .execute();

    expect(savedTask).toHaveLength(1);
    expect(savedTask[0].title).toEqual('Database Updated Title');
    expect(savedTask[0].priority).toEqual('high');
    expect(savedTask[0].updated_at.getTime()).toBeGreaterThan(originalTask.updated_at.getTime());
  });

  it('should throw error when task does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should always update the updated_at timestamp', async () => {
    const originalTask = await createTestTask();
    const originalUpdatedAt = originalTask.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      title: 'Timestamp Test'
    };

    const result = await updateTask(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle due_date updates correctly', async () => {
    const originalTask = await createTestTask({
      due_date: new Date('2024-06-15')
    });

    const newDueDate = new Date('2024-12-25');
    const updateInput: UpdateTaskInput = {
      id: originalTask.id,
      due_date: newDueDate
    };

    const result = await updateTask(updateInput);

    expect(result.due_date).toEqual(newDueDate);
    expect(result.due_date).toBeInstanceOf(Date);
  });

  it('should handle empty partial update (only updated_at changes)', async () => {
    const originalTask = await createTestTask();
    const originalUpdatedAt = originalTask.updated_at;

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with only ID (no other fields)
    const updateInput: UpdateTaskInput = {
      id: originalTask.id
    };

    const result = await updateTask(updateInput);

    // All original fields should remain the same
    expect(result.title).toEqual(originalTask.title);
    expect(result.description).toEqual(originalTask.description);
    expect(result.due_date).toEqual(originalTask.due_date);
    expect(result.priority).toEqual(originalTask.priority);
    expect(result.is_completed).toEqual(originalTask.is_completed);
    expect(result.created_at).toEqual(originalTask.created_at);
    
    // Only updated_at should change
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});