import type { LabelColor } from '../../labels/label-color.enum.js';

export interface DemoCard {
  title: string;
  description?: string;
  labelNames?: string[];
  /** Due date relative to the day the database is seeded; negative means already past. */
  dueInDays?: number;
  isDueComplete?: boolean;
}

export interface DemoBoard {
  name: string;
  labels: { name: string; color: LabelColor }[];
  lists: { name: string; cards: DemoCard[] }[];
}

/** Content for a fresh database: realistic enough for the agent demo to have something to do. */
export const DEMO_BOARDS: DemoBoard[] = [
  {
    name: 'WebMCP Launch',
    labels: [
      { name: 'bug', color: 'RED' },
      { name: 'feature', color: 'BLUE' },
      { name: 'docs', color: 'PURPLE' },
      { name: 'urgent', color: 'ORANGE' },
    ],
    lists: [
      {
        name: 'Backlog',
        cards: [
          {
            title: 'Research declarative WebMCP forms',
            description: 'Try the toolname and tooldescription form attributes.',
            labelNames: ['feature'],
          },
          { title: 'Add dark mode to the side panel', labelNames: ['feature'] },
          {
            title: 'Measure tool-call latency on free models',
            description: 'Compare gpt-oss:120b, gemma4:31b and nemotron-3-super.',
            dueInDays: 10,
          },
        ],
      },
      {
        name: 'To Do',
        cards: [
          {
            title: 'Write the WebMCP blog post draft',
            description: 'Explain tools, discovery and the approval flow.',
            labelNames: ['docs'],
            dueInDays: 5,
          },
          {
            title: 'Fix card flicker while dragging',
            labelNames: ['bug', 'urgent'],
            dueInDays: -2,
          },
          { title: 'Add keyboard shortcuts for moving cards', labelNames: ['feature'] },
          {
            title: 'Review the untrusted-site approval copy',
            labelNames: ['docs', 'urgent'],
            dueInDays: -1,
          },
        ],
      },
      {
        name: 'Doing',
        cards: [
          {
            title: 'Connect the side panel chat to the BFF',
            labelNames: ['feature'],
            dueInDays: 2,
          },
          {
            title: 'Fix duplicate tool registration when switching boards',
            labelNames: ['bug', 'urgent'],
            dueInDays: -4,
          },
        ],
      },
      {
        name: 'Done',
        cards: [
          { title: 'Set up the monorepo', dueInDays: -7, isDueComplete: true },
          {
            title: 'Design the board data model',
            labelNames: ['docs'],
            dueInDays: -5,
            isDueComplete: true,
          },
          { title: 'Pick the AI model provider', dueInDays: -3, isDueComplete: true },
        ],
      },
    ],
  },
  {
    name: 'Personal',
    labels: [
      { name: 'home', color: 'GREEN' },
      { name: 'errands', color: 'YELLOW' },
    ],
    lists: [
      {
        name: 'To Do',
        cards: [
          { title: 'Book a dentist appointment', labelNames: ['errands'], dueInDays: 3 },
          { title: 'Renew passport', labelNames: ['errands'], dueInDays: -1 },
        ],
      },
      { name: 'Doing', cards: [{ title: 'Plan the weekend hike', labelNames: ['home'] }] },
      {
        name: 'Done',
        cards: [{ title: 'Pay the electricity bill', dueInDays: -6, isDueComplete: true }],
      },
    ],
  },
];
