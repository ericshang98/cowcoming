// Only correlated, completed, non-simulated interactions may enter cultivation.
export function completedEvolutionTurn(snapshot, commandId, context) {
  const result = snapshot.events.findLast(e => e.type === 'command.result' && e.commandId === commandId && e.status !== 'accepted');
  if (!result) return { terminal: false };
  const replies = snapshot.messages.filter(message => message.commandId === commandId && message.role === 'assistant');
  const decision = snapshot.events.find(e => e.type === 'decision' && e.commandId === commandId);
  const completed = snapshot.events.some(e => e.type === 'action' && e.decisionId === decision?.decisionId && e.status === 'completed');
  if (result.status !== 'completed' || snapshot.device.simulation || snapshot.profile.revision !== context.profileRevision || !completed || !replies.length || !replies.every(reply => reply.status === 'complete')) return { terminal: true };
  return { terminal: true, turn: { ...context, id: commandId, source: 'live', status: 'completed', replyText: replies.map(reply => reply.text).join('\n'), actionCompleted: true } };
}
