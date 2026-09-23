// Only correlated, completed, non-simulated interactions may enter cultivation.
export function completedEvolutionTurn(snapshot, commandId, context, software) {
  const result = snapshot.events.findLast(e => e.type === 'command.result' && e.commandId === commandId && e.status !== 'accepted');
  if (!result) return { terminal: false };
  if(snapshot.profile.actionContractVersion===2 && result.status==='completed'){
    if(!software)return {terminal:false};
    if(software.status!=='completed')return {terminal:true};
  }
  const replies = snapshot.messages.filter(message => message.commandId === commandId && message.role === 'assistant');
  const decision = snapshot.events.find(e => e.type === 'decision' && e.commandId === commandId);
  const completed = snapshot.events.some(e => e.type === 'action' && e.decisionId === decision?.decisionId && e.status === 'completed');
  if (result.status !== 'completed' || snapshot.device.simulation || snapshot.profile.revision !== context.profileRevision || !completed || (!replies.length && context.replyMode !== "silent") || !replies.every(reply => reply.status === 'complete')) return { terminal: true };
  return { terminal: true, turn: { ...context, id: commandId, source: 'live', status: 'completed', replyText: replies.map(reply => reply.text).join('\n'), actionCompleted: true } };
}

// Only fresh socket events register local turns; reconnect snapshots never replay history.
export function localInteractionContext(interaction, profile, context) {
  if (!context || !interaction.userText?.trim() || interaction.profileRevision !== profile?.revision || interaction.formId !== profile.formId || context.formId !== profile.formId) return null;
  return {...context, userText: interaction.userText, profileRevision: profile.revision, replyMode: interaction.replyMode};
}
