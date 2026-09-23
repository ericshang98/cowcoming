"""Versioned, semantic action boundary. This module contains no servo parameters."""
ACTION_CONTRACT_VERSION = 2
ACTION_IDS = frozenset(('NOD', 'SHAKE', 'NOD_DOUBLE', 'TILT_LEFT', 'TILT_RIGHT', 'WAIT'))
ACTION_ANIMATIONS = {'NOD':['nod-soft'], 'SHAKE':['head-shake'], 'NOD_DOUBLE':['nod-double'], 'TILT_LEFT':['tilt-left'], 'TILT_RIGHT':['tilt-right'], 'WAIT':['idle']}

def validate_profile(profile):
    if profile.get('actionContractVersion') != ACTION_CONTRACT_VERSION:
        raise ValueError('Upgrade this room to action contract 2 in Device lab')
    allowed=profile.get('allowedActions', [])
    if not allowed or any(a not in ACTION_IDS for a in allowed):
        raise ValueError('Unsupported action ID')
    mapping=profile.get('animationMap', {})
    for action in allowed:
        if not mapping.get(action) or any(c not in ACTION_ANIMATIONS[action] for c in mapping[action]):
            raise ValueError('Action animation semantics do not match')

def executable_actions(profile, status):
    validate_profile(profile)
    supported=status.get('supportedActions', [])
    if any(a not in ACTION_IDS for a in supported):
        raise ValueError('Unsupported device capability')
    if status.get('actionContractVersion') != ACTION_CONTRACT_VERSION:
        return []
    return [a for a in profile['allowedActions'] if a=='WAIT' or (profile['formId']!='playful' and status.get('hardware')=='ready' and a in supported)]
