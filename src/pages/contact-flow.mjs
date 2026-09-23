export const topics = [
  { id: "hire", title: "Discuss a role", hint: "Full-time or contract" },
  {
    id: "project",
    title: "Start a project",
    hint: "New builds or improvements",
  },
  { id: "hi", title: "Just say hello", hint: "Questions or introductions" },
];
const name = {
  key: "name",
  label: "Your name",
  prompt: "Who am I speaking with?",
  placeholder: "Your name",
};
const email = {
  key: "email",
  label: "Reply email",
  prompt: "Where should Sayandeep reply?",
  placeholder: "you@example.com",
  type: "email",
};
export const questions = {
  hire: [
    name,
    {
      key: "company",
      label: "Company",
      prompt: "Which company or team?",
      placeholder: "Company or organisation",
      optional: true,
    },
    {
      key: "role",
      label: "The role",
      prompt: "What role do you have in mind?",
      placeholder: "A little about the role, scope, and team…",
      multiline: true,
    },
    email,
  ],
  project: [
    name,
    {
      key: "company",
      label: "Who it’s for",
      prompt: "Is this for you or a company?",
      choices: ["An individual", "A company"],
    },
    {
      key: "scope",
      label: "Project scope",
      prompt: "What are we making?",
      choices: ["Improve something existing", "Build something new"],
    },
    {
      key: "brief",
      label: "Project brief",
      prompt: "Tell me a little about the project.",
      placeholder: "What is it, who is it for, and what needs to change?",
      multiline: true,
    },
    {
      key: "next",
      label: "Next step",
      prompt: "What would help you get started?",
      choices: ["A quote", "A quick call"],
    },
    email,
  ],
  hi: [
    name,
    {
      key: "message",
      label: "Your message",
      prompt: "What would you like to say?",
      placeholder: "A hello, a question, a good idea…",
      multiline: true,
    },
    {
      ...email,
      prompt: "Would you like a reply?",
      placeholder: "Your email (optional)",
      optional: true,
    },
  ],
};
export function validateAnswer(question, value) {
  const v = value.trim();
  if (!v)
    return question.optional ? "" : "Please add a reply before continuing.";
  if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return "Please enter a valid email address.";
  if (v.length > 4000) return "Please keep your reply under 4,000 characters.";
  if (question.choices && !question.choices.includes(v))
    return "Please choose one of the options.";
  return "";
}
