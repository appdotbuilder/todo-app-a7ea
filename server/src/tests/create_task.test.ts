import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  due_date: new Date('2024-12-31T23:59:59Z'),
  priority: 'medium'
};

// Test input with null description
const testInputNullDescription: CreateTaskInput = {
  title: 'Task with Null Description',
  description: null,
  due_date: new Date('2024-06-15T12:00:00Z'),
  priority: 'high'
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(result.priority).toEqual('medium');
    expect(result.is_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with null description', async () => {
    const result = await createTask(testInputNullDescription);

    expect(result.title).toEqual('Task with Null Description');
    expect(result.description).toBeNull();
    expect(result.due_date).toEqual(new Date('2024-06-15T12:00:00Z'));
    expect(result.priority).toEqual('high');
    expect(result.is_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const result = await createTask(testInput);

    // Query database to verify task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    const savedTask = tasks[0];
    expect(savedTask.title).toEqual('Test Task');
    expect(savedTask.description).toEqual('A task for testing');
    expect(savedTask.due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(savedTask.priority).toEqual('medium');
    expect(savedTask.is_completed).toEqual(false);
    expect(savedTask.created_at).toBeInstanceOf(Date);
    expect(savedTask.updated_at).toBeInstanceOf(Date);
  });

  it('should default is_completed to false for new tasks', async () => {
    const result = await createTask(testInput);

    expect(result.is_completed).toEqual(false);

    // Verify in database as well
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].is_completed).toEqual(false);
  });

  it('should handle different priority levels', async () => {
    const lowPriorityTask: CreateTaskInput = {
      title: 'Low Priority Task',
      description: 'Not urgent',
      due_date: new Date('2024-08-01T10:00:00Z'),
      priority: 'low'
    };

    const highPriorityTask: CreateTaskInput = {
      title: 'High Priority Task',
      description: 'Very urgent',
      due_date: new Date('2024-01-01T08:00:00Z'),
      priority: 'high'
    };

    const lowResult = await createTask(lowPriorityTask);
    const highResult = await createTask(highPriorityTask);

    expect(lowResult.priority).toEqual('low');
    expect(highResult.priority).toEqual('high');

    // Verify both tasks exist in database with correct priorities
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(allTasks).toHaveLength(2);
    
    const priorities = allTasks.map(task => task.priority).sort();
    expect(priorities).toEqual(['high', 'low']);
  });

  it('should generate unique IDs for multiple tasks', async () => {
    const task1 = await createTask({
      title: 'First Task',
      description: 'First description',
      due_date: new Date('2024-01-01T00:00:00Z'),
      priority: 'low'
    });

    const task2 = await createTask({
      title: 'Second Task',
      description: 'Second description',
      due_date: new Date('2024-02-01T00:00:00Z'),
      priority: 'medium'
    });

    expect(task1.id).not.toEqual(task2.id);
    expect(typeof task1.id).toBe('number');
    expect(typeof task2.id).toBe('number');
    expect(task1.id).toBeGreaterThan(0);
    expect(task2.id).toBeGreaterThan(0);
  });

  it('should preserve date precision', async () => {
    const specificDate = new Date('2024-07-15T14:30:45.123Z');
    const taskInput: CreateTaskInput = {
      title: 'Date Precision Test',
      description: 'Testing date handling',
      due_date: specificDate,
      priority: 'medium'
    };

    const result = await createTask(taskInput);

    expect(result.due_date).toEqual(specificDate);
    
    // Verify in database
    const savedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(savedTasks[0].due_date).toEqual(specificDate);
  });
});