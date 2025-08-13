import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createTaskInputSchema, 
  updateTaskInputSchema, 
  filterTasksInputSchema, 
  taskIdSchema 
} from './schema';

// Import handlers
import { createTask } from './handlers/create_task';
import { getTasks, getAllTasks } from './handlers/get_tasks';
import { getTaskById } from './handlers/get_task_by_id';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { toggleTaskCompletion } from './handlers/toggle_task_completion';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task CRUD operations
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getAllTasks: publicProcedure
    .query(() => getAllTasks()),

  getTasks: publicProcedure
    .input(filterTasksInputSchema)
    .query(({ input }) => getTasks(input)),

  getTaskById: publicProcedure
    .input(taskIdSchema)
    .query(({ input }) => getTaskById(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(taskIdSchema)
    .mutation(({ input }) => deleteTask(input)),

  // Convenience endpoint for toggling task completion status
  toggleTaskCompletion: publicProcedure
    .input(taskIdSchema)
    .mutation(({ input }) => toggleTaskCompletion(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();