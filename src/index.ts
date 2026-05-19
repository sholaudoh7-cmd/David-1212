import { Hono } from 'hono';
import { z } from 'zod';

// Initialize the Hono app
const app = new Hono();

// In-Memory Data Storage (for simplicity)
const users: { email: string; password: string; balance: number; vipLevel?: number; dailyIncome?: number }[] = [];

// VIP levels and daily income
const vipLevels = [
  { level: 1, cost: 15000, dailyIncome: 600 },
  { level: 2, cost: 40000, dailyIncome: 1200 },
  { level: 3, cost: 120000, dailyIncome: 5000 },
  { level: 4, cost: 220000, dailyIncome: 9500 },
];

// Middleware for parsing JSON
app.use('*', async (c, next) => {
  c.header('Content-Type', 'application/json');
  await next();
});

// User Signup
app.post('/signup', async (c) => {
  const body = await c.req.json();

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { email, password } = result.data;

  // Check if user already exists
  if (users.find((user) => user.email === email)) {
    return c.json({ error: 'User already exists' }, 409);
  }

  // Add user to in-memory storage
  users.push({ email, password, balance: 0 });
  return c.json({ message: 'Signup successful' });
});

// User Login
app.post('/login', async (c) => {
  const body = await c.req.json();

  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { email, password } = result.data;

  // Validate user credentials
  const user = users.find((user) => user.email === email && user.password === password);
  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  return c.json({ message: 'Login successful', email });
});

// Upgrade to VIP Level
app.post('/upgrade', async (c) => {
  const body = await c.req.json();

  const schema = z.object({
    email: z.string().email(),
    vipLevel: z.number().min(1).max(4),
  });

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { email, vipLevel } = result.data;

  // Find the user
  const user = users.find((user) => user.email === email);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Validate VIP level and cost
  const vip = vipLevels.find((v) => v.level === vipLevel);
  if (!vip) {
    return c.json({ error: 'Invalid VIP level' }, 400);
  }

  if (user.balance < vip.cost) {
    return c.json({ error: 'Insufficient balance' }, 400);
  }

  // Deduct cost and upgrade VIP level
  user.balance -= vip.cost;
  user.vipLevel = vip.level;
  user.dailyIncome = vip.dailyIncome;

  return c.json({ message: `Upgraded to VIP ${vip.level} successfully!`, newBalance: user.balance });
});

// Claim Daily Income
app.post('/claim', async (c) => {
  const body = await c.req.json();

  const schema = z.object({ email: z.string().email() });

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { email } = result.data;

  // Find the user
  const user = users.find((user) => user.email === email);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (!user.vipLevel || !user.dailyIncome) {
    return c.json({ error: 'User is not a VIP' }, 400);
  }

  // Add daily income
  user.balance += user.dailyIncome;

  return c.json({ message: 'Daily income claimed successfully!', newBalance: user.balance });
});

// Start the server
app.fire();