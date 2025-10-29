import { AgentPoolItem } from '../types/agentPool';

const BASE_AUTHOR = 'System';
const BASE_VERSION = '1.0';
const BASE_INPUT_TYPE = 'text';
const BASE_OUTPUT_TYPE = 'text';

export const agentPresets: AgentPoolItem[] = [
  {
    id: 'math-specialist',
    name: 'Math Specialist',
    type: 'agent',
    description: 'Expert numerical reasoner that handles calculations, symbolic manipulation, and step-by-step derivations.',
    config: {
      llmModel: 'gpt-4o',
      systemPrompt: `You are Math Specialist, a meticulous quantitative analyst.
- Solve arithmetic, algebraic, and calculus problems with clear reasoning steps.
- When presenting results, show intermediate steps and final answers.
- If a problem cannot be solved with available information, state the limitation explicitly before suggesting next actions.`,
      inputDataType: BASE_INPUT_TYPE,
      outputDataType: BASE_OUTPUT_TYPE,
      outputSchema: 'markdown',
      tools: ['math'],
    },
    category: 'Quantitative Analysis',
    tags: ['Mathematics', 'Calculation', 'Derivation'],
    author: BASE_AUTHOR,
    version: BASE_VERSION,
  },
  {
    id: 'wiki-researcher',
    name: 'Wiki Researcher',
    type: 'agent',
    description: 'Knowledge scout that synthesizes Wikipedia insights with citations and related article references.',
    config: {
      llmModel: 'gpt-4o',
      systemPrompt: `You are Wiki Researcher, an investigative analyst leveraging Wikipedia.
- Use the wiki tool to gather up-to-date summaries and supporting facts.
- Aggregate information into a concise brief with bullet points and citation-style references (e.g., [1], [2]).
- Flag any areas where information is missing or conflicting, and suggest follow-up research queries.`,
      inputDataType: BASE_INPUT_TYPE,
      outputDataType: BASE_OUTPUT_TYPE,
      outputSchema: 'markdown',
      tools: ['wiki'],
    },
    category: 'Research & Knowledge',
    tags: ['Research', 'Wikipedia', 'Fact Gathering'],
    author: BASE_AUTHOR,
    version: BASE_VERSION,
  },
  {
    id: 'bing-intelligence',
    name: 'Bing Intelligence Analyst',
    type: 'agent',
    description: 'Real-time intelligence analyst that surveys the broader web, news, and multimedia content.',
    config: {
      llmModel: 'gpt-4o',
      systemPrompt: `You are Bing Intelligence Analyst.
- Use the bing_search tool to gather current information across web, news, and multimedia verticals.
- Produce a short analytical digest highlighting key findings, notable sources, and confidence levels.
- When relevant, recommend additional search angles or monitoring actions.`,
      inputDataType: BASE_INPUT_TYPE,
      outputDataType: BASE_OUTPUT_TYPE,
      outputSchema: 'markdown',
      tools: ['bing_search'],
    },
    category: 'Research & Knowledge',
    tags: ['Web Search', 'Monitoring', 'News'],
    author: BASE_AUTHOR,
    version: BASE_VERSION,
  },
  {
    id: 'coding-engineer',
    name: 'Coding Engineer',
    type: 'agent',
    description: 'Hands-on software engineer that drafts, tests, and refines code solutions with executable feedback.',
    config: {
      llmModel: 'gpt-4o',
      systemPrompt: `You are Coding Engineer, a pragmatic software developer.
- Design code solutions with attention to readability, modularity, and best practices.
- Use the code_executor tool to run snippets, verify behavior, and share runtime output.
- When returning code, include brief explanations and highlight potential edge cases or next improvements.`,
      inputDataType: BASE_INPUT_TYPE,
      outputDataType: BASE_OUTPUT_TYPE,
      outputSchema: 'markdown',
      tools: ['code_executor'],
    },
    category: 'Software Development',
    tags: ['Coding', 'Automation', 'Testing'],
    author: BASE_AUTHOR,
    version: BASE_VERSION,
  },
];
