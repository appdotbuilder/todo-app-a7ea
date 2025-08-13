import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type FilterTasksInput } from '../schema';
import { getTasks, getAllTasks } from '../handlers/get_tasks';

// Test data for creating tasks
const testTasks: CreateTaskInput[] = [
  {
    title: 'High Priority Task',
    description: 'An urgent task to complete',
    due_date: new Date('2024-01-15'),
    priority: 'high'
  },
  {
    title: 'Medium Priority Task',
    description: null, // Test nullable description
    due_date: new Date('2024-01-20'),
    priority: 'medium'
  },
  {
    title: 'Low Priority Task',
    description: 'A low priority task',
    due_date: new Date('2024-01-25'),
    priority: 'low'
  }
];

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('should return all tasks when no filters provided', async () => {
    // Create test tasks
    for (const task of testTasks) {
      await db.insert(tasksTable).values({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority
      }).execute();
    }

    const result = await getTasks();

    expect(result).toHaveLength(3);
    expect(result.every(task => typeof task.id === 'number')).toBe(true);
    expect(result.every(task => task.created_at instanceof Date)).toBe(true);
    expect(result.every(task => task.updated_at instanceof Date)).toBe(true);
    expect(result.every(task => task.due_date instanceof Date)).toBe(true);
    
    // Check that all priority levels are present
    const priorities = result.map(task => task.priority);
    expect(priorities).toContain('high');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('low');
  });

  it('should filter tasks by completion status', async () => {
    // Create tasks with different completion statuses
    await db.insert(tasksTable).values([
      {
        title: 'Completed Task',
        description: 'This task is done',
        due_date: new Date('2024-01-15'),
        priority: 'high',
        is_completed: true
      },
      {
        title: 'Incomplete Task 1',
        description: 'Not done yet',
        due_date: new Date('2024-01-20'),
        priority: 'medium',
        is_completed: false
      },
      {
        title: 'Incomplete Task 2',
        description: 'Also not done',
        due_date: new Date('2024-01-25'),
        priority: 'low',
        is_completed: false
      }
    ]).execute();

    // Test filtering for completed tasks
    const completedFilter: FilterTasksInput = { is_completed: true };
    const completedTasks = await getTasks(completedFilter);
    
    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].title).toBe('Completed Task');
    expect(completedTasks[0].is_completed).toBe(true);

    // Test filtering for incomplete tasks
    const incompleteFilter: FilterTasksInput = { is_completed: false };
    const incompleteTasks = await getTasks(incompleteFilter);
    
    expect(incompleteTasks).toHaveLength(2);
    expect(incompleteTasks.every(task => task.is_completed === false)).toBe(true);
  });

  it('should filter tasks by priority', async () => {
    // Create test tasks
    for (const task of testTasks) {
      await db.insert(tasksTable).values({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority
      }).execute();
    }

    // Test filtering for high priority tasks
    const highPriorityFilter: FilterTasksInput = { priority: 'high' };
    const highPriorityTasks = await getTasks(highPriorityFilter);
    
    expect(highPriorityTasks).toHaveLength(1);
    expect(highPriorityTasks[0].priority).toBe('high');
    expect(highPriorityTasks[0].title).toBe('High Priority Task');

    // Test filtering for medium priority tasks
    const mediumPriorityFilter: FilterTasksInput = { priority: 'medium' };
    const mediumPriorityTasks = await getTasks(mediumPriorityFilter);
    
    expect(mediumPriorityTasks).toHaveLength(1);
    expect(mediumPriorityTasks[0].priority).toBe('medium');
    expect(mediumPriorityTasks[0].description).toBeNull();

    // Test filtering for low priority tasks
    const lowPriorityFilter: FilterTasksInput = { priority: 'low' };
    const lowPriorityTasks = await getTasks(lowPriorityFilter);
    
    expect(lowPriorityTasks).toHaveLength(1);
    expect(lowPriorityTasks[0].priority).toBe('low');
  });

  it('should filter tasks by both completion status and priority', async () => {
    // Create tasks with different combinations
    await db.insert(tasksTable).values([
      {
        title: 'Completed High Priority',
        description: 'Done and urgent',
        due_date: new Date('2024-01-15'),
        priority: 'high',
        is_completed: true
      },
      {
        title: 'Incomplete High Priority',
        description: 'Not done but urgent',
        due_date: new Date('2024-01-16'),
        priority: 'high',
        is_completed: false
      },
      {
        title: 'Completed Low Priority',
        description: 'Done and not urgent',
        due_date: new Date('2024-01-20'),
        priority: 'low',
        is_completed: true
      },
      {
        title: 'Incomplete Medium Priority',
        description: 'Not done, medium priority',
        due_date: new Date('2024-01-25'),
        priority: 'medium',
        is_completed: false
      }
    ]).execute();

    // Test filtering for completed high priority tasks
    const combinedFilter: FilterTasksInput = { 
      is_completed: true, 
      priority: 'high' 
    };
    const filteredTasks = await getTasks(combinedFilter);
    
    expect(filteredTasks).toHaveLength(1);
    expect(filteredTasks[0].title).toBe('Completed High Priority');
    expect(filteredTasks[0].is_completed).toBe(true);
    expect(filteredTasks[0].priority).toBe('high');

    // Test filtering for incomplete high priority tasks
    const incompleteHighFilter: FilterTasksInput = { 
      is_completed: false, 
      priority: 'high' 
    };
    const incompleteHighTasks = await getTasks(incompleteHighFilter);
    
    expect(incompleteHighTasks).toHaveLength(1);
    expect(incompleteHighTasks[0].title).toBe('Incomplete High Priority');
    expect(incompleteHighTasks[0].is_completed).toBe(false);
    expect(incompleteHighTasks[0].priority).toBe('high');
  });

  it('should handle null descriptions properly', async () => {
    await db.insert(tasksTable).values({
      title: 'Task with null description',
      description: null,
      due_date: new Date('2024-01-15'),
      priority: 'medium'
    }).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].title).toBe('Task with null description');
  });
});

describe('getAllTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all tasks without any filtering', async () => {
    // Create test tasks
    for (const task of testTasks) {
      await db.insert(tasksTable).values({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority
      }).execute();
    }

    const result = await getAllTasks();

    expect(result).toHaveLength(3);
    expect(result.map(task => task.priority)).toEqual(
      expect.arrayContaining(['high', 'medium', 'low'])
    );
  });

  it('should return empty array when no tasks exist', async () => {
    const result = await getAllTasks();
    expect(result).toEqual([]);
  });

  it('should return tasks with proper field types', async () => {
    await db.insert(tasksTable).values({
      title: 'Test Task',
      description: 'Test description',
      due_date: new Date('2024-01-15'),
      priority: 'high'
    }).execute();

    const result = await getAllTasks();
    const task = result[0];

    expect(typeof task.id).toBe('number');
    expect(typeof task.title).toBe('string');
    expect(typeof task.description).toBe('string');
    expect(task.due_date).toBeInstanceOf(Date);
    expect(typeof task.priority).toBe('string');
    expect(typeof task.is_completed).toBe('boolean');
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });
});