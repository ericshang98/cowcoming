# Device handoff implementation plan

Approved by Eric: complete all findings in the handoff audit. Execute locally in isolated worktrees; do not coordinate other agents or activate hardware services.

Goal: benben's existing local player publishes one response to the room, and the website plays each received action to completion in order. Existing models remain the assets. No hardware failure-driven animation interruption is required.

Architecture: retain the version-2 action contract. Add device-origin interaction events, six form defaults, a thread-safe passive event publisher and a benben controller integration. Browser cultivation registers live interaction starts, never restored history. Physical execution stays in benben, with its existing locks and limits.

- [ ] Playback: reproduce a second action arriving while busy; queue it, bound pending work, deduplicate once, clear obsolete work on reset/form change. Test actual Three mixer completion.
- [ ] Profiles: reproduce identical defaults across six forms; share six JEV/language prompts as JSON, preserve edited form profiles and legacy aliases on the local side.
- [ ] Protocol: test device-origin start/finish correlation, stale revision rejection, silence-only completed responses, retry deduplication, and snapshot reconnect behavior. Add interaction.start/end and forward only newly accepted start events.
- [ ] Device kit: implement a passive publisher with explicit profile callback, short-lived connection tickets, heartbeat, bounded event queue and no reconnect replay; keep simulation separate. Test with fake transport and isolated real Worker.
- [ ] benben: add optional --cowcoming integration to the existing Reaction server. Adapt publish callbacks without launching a second controller, preserve audio/motion concurrency, apply six-form configuration, report actual supported actions. Forward existing or configured language output independently; do not fake readiness.
- [ ] Verification: Node tests, Python tests, isolated Worker integration, browser consecutive-action and device-origin interaction tests. No real hardware or camera activation.
- [ ] Delivery: update guides, export a versioned key-free kit, synchronize the integrated web copy explicitly, PR both repositories, wait checks, merge and deploy existing Pages/Worker. Verify deployed build and downloadable contract. Report any external credentials or hardware checks still required.
