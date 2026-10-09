process.env.JWT_SECRET = 'test-secret';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

let mongod;
let token;
let otherToken;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('authentication', () => {
  it('registers a user and returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Taylor',
      email: 'taylor@test.com',
      password: 'secret1',
    });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    token = response.body.token;
  });

  it('rejects duplicate email addresses', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Taylor',
      email: 'taylor@test.com',
      password: 'secret1',
    });
    expect(response.status).toBe(409);
  });

  it('rejects incorrect passwords', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'taylor@test.com',
      password: 'incorrect',
    });
    expect(response.status).toBe(401);
  });

  it('registers a separate account for task isolation checks', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Morgan',
      email: 'morgan@test.com',
      password: 'secret1',
    });
    otherToken = response.body.token;
  });
});

describe('tasks', () => {
  it('blocks requests without a token', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });

  it('creates, updates, searches, and deletes a task', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app).post('/api/tasks').set(auth).send({
      title: 'Plan project launch',
      description: 'Write launch checklist',
      goals: 'Launch page is live and approved by product',
      notes: 'Ask Priya to review the final copy',
      links: [
        { title: 'Launch brief', url: 'https://example.com/brief' },
        { title: 'Brand guide', url: 'https://example.com/brand' },
      ],
      estimateMinutes: 90,
      project: 'Website redesign',
      labels: ['planning', 'launch'],
      subtasks: [
        { title: 'Write launch checklist' },
        { title: 'Review the schedule', completed: true },
      ],
      priority: 'high',
      dueDate: '2030-04-12',
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('todo');
    expect(created.body.priority).toBe('high');
    expect(created.body.goals).toBe('Launch page is live and approved by product');
    expect(created.body.notes).toBe('Ask Priya to review the final copy');
    expect(created.body.links).toHaveLength(2);
    expect(created.body.links[0]).toMatchObject({ title: 'Launch brief', url: 'https://example.com/brief' });
    expect(created.body.estimateMinutes).toBe(90);
    expect(created.body.project).toBe('Website redesign');
    expect(created.body.labels).toEqual(['planning', 'launch']);
    expect(created.body.subtasks).toHaveLength(2);
    expect(created.body.subtasks[0].completed).toBe(false);
    expect(created.body.subtasks[1].completed).toBe(true);

    const id = created.body._id;
    const updated = await request(app).put(`/api/tasks/${id}`).set(auth).send({
      status: 'in-progress',
      notes: 'Stakeholder review requested',
      estimateMinutes: 120,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('in-progress');
    expect(updated.body.notes).toBe('Stakeholder review requested');
    expect(updated.body.estimateMinutes).toBe(120);

    const list = await request(app).get('/api/tasks?q=stakeholder').set(auth);
    expect(list.body).toHaveLength(1);
    expect((await request(app).get('/api/tasks/stats').set(auth)).body).toMatchObject({ total: 1, 'in-progress': 1 });

    expect((await request(app).delete(`/api/tasks/${id}`).set(auth)).status).toBe(200);
    expect((await request(app).get('/api/tasks').set(auth)).body).toHaveLength(0);
  });

  it('does not expose one user’s tasks to another user', async () => {
    await request(app).post('/api/tasks').set({ Authorization: `Bearer ${token}` }).send({ title: 'Private task' });
    const response = await request(app).get('/api/tasks').set({ Authorization: `Bearer ${otherToken}` });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('rejects invalid status and priority values', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const invalidStatus = await request(app).post('/api/tasks').set(auth).send({ title: 'Bad status', status: 'blocked' });
    expect(invalidStatus.status).toBe(400);
    const invalidPriority = await request(app).post('/api/tasks').set(auth).send({ title: 'Bad priority', priority: 'urgent' });
    expect(invalidPriority.status).toBe(400);
    const tooManyLabels = await request(app).post('/api/tasks').set(auth).send({
      title: 'Too many labels',
      labels: Array.from({ length: 11 }, (_, index) => `label-${index}`),
    });
    expect(tooManyLabels.status).toBe(400);
    const tooManySubtasks = await request(app).post('/api/tasks').set(auth).send({
      title: 'Too many subtasks',
      subtasks: Array.from({ length: 31 }, (_, index) => ({ title: `Subtask ${index}` })),
    });
    expect(tooManySubtasks.status).toBe(400);
    const invalidLink = await request(app).post('/api/tasks').set(auth).send({
      title: 'Invalid resource URL',
      links: [{ title: 'Unsafe resource', url: 'javascript:alert(1)' }],
    });
    expect(invalidLink.status).toBe(400);
    const fractionalEstimate = await request(app).post('/api/tasks').set(auth).send({
      title: 'Fractional estimate',
      estimateMinutes: 12.5,
    });
    expect(fractionalEstimate.status).toBe(400);
    const tooManyLinks = await request(app).post('/api/tasks').set(auth).send({
      title: 'Too many resources',
      links: Array.from({ length: 11 }, (_, index) => ({ title: `Resource ${index}`, url: `https://example.com/${index}` })),
    });
    expect(tooManyLinks.status).toBe(400);
  });
});
