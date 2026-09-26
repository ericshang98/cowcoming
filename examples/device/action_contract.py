"""Semantic desktop-pet behavior boundary. It contains no servo parameters.

The browser/GEV catalog is intentionally broad. A physical adapter should
advertise only the IDs it has verified; the example adapter is a simulation.
"""
ACTION_CONTRACT_VERSION = 2
ACTION_IDS = frozenset((
    'NOD', 'SHAKE', 'NOD_DOUBLE', 'TILT_LEFT', 'TILT_RIGHT',
    'LOOK_LEFT', 'LOOK_RIGHT', 'LOOK_UP', 'LOOK_DOWN',
    'BOW', 'STRETCH', 'BREATHE', 'SHIMMY', 'TURN_LEFT', 'TURN_RIGHT',
    'PAW_TAP_LEFT', 'PAW_TAP_RIGHT', 'PAW_WAVE', 'PAW_REACH', 'PAW_CROSS',
    'BELLY_BREATHE', 'BELLY_RUB', 'BELLY_LAUGH',
    'TAIL_WAG', 'SIT', 'STAND', 'REST', 'WAKE',
    'PLAY_BOUNCE', 'CELEBRATE', 'SHY_HIDE', 'COMFORT',
    'WAIT',
))
HARDWARE_ACTION_IDS = frozenset(('NOD', 'SHAKE', 'NOD_DOUBLE', 'TILT_LEFT', 'TILT_RIGHT', 'WAIT'))
ACTION_ANIMATIONS = {
    'NOD': ['nod-soft'], 'SHAKE': ['head-shake'], 'NOD_DOUBLE': ['nod-double'],
    'TILT_LEFT': ['tilt-left'], 'TILT_RIGHT': ['tilt-right'],
    'LOOK_LEFT': ['look', 'tilt-left'], 'LOOK_RIGHT': ['look', 'tilt-right'],
    'LOOK_UP': ['look', 'nod-soft'], 'LOOK_DOWN': ['bow', 'nod-soft'],
    'BOW': ['bow', 'nod-soft'], 'STRETCH': ['bow', 'leg_sway', 'wave'],
    'BREATHE': ['reflect', 'leg_sway', 'bow'], 'SHIMMY': ['leg_sway', 'wave', 'bow'],
    'TURN_LEFT': ['look', 'tilt-left', 'bow'], 'TURN_RIGHT': ['look', 'tilt-right', 'bow'],
    'PAW_TAP_LEFT': ['leg_sway', 'wave', 'bow'], 'PAW_TAP_RIGHT': ['leg_sway', 'wave', 'bow'],
    'PAW_WAVE': ['wave', 'leg_sway'], 'PAW_REACH': ['wave', 'bow'],
    'PAW_CROSS': ['reflect', 'bow', 'leg_sway'],
    'BELLY_BREATHE': ['reflect', 'leg_sway', 'bow'], 'BELLY_RUB': ['reflect', 'wave', 'bow'],
    'BELLY_LAUGH': ['leg_sway', 'wave', 'reflect'], 'TAIL_WAG': ['wave', 'leg_sway', 'look'],
    'SIT': ['bow', 'leg_sway'], 'STAND': ['wave', 'bow'], 'REST': ['reflect', 'idle'],
    'WAKE': ['bow', 'wave', 'leg_sway'], 'PLAY_BOUNCE': ['leg_sway', 'wave', 'bow'],
    'CELEBRATE': ['wave', 'leg_sway', 'bow'], 'SHY_HIDE': ['bow', 'reflect', 'tilt'],
    'COMFORT': ['bow', 'reflect', 'wave'], 'WAIT': ['idle'],
}

def validate_profile(profile):
    if profile.get('actionContractVersion') != ACTION_CONTRACT_VERSION:
        raise ValueError('Upgrade this room to action contract 2 in Device lab')
    allowed = profile.get('allowedActions', [])
    if not allowed or any(a not in ACTION_IDS for a in allowed):
        raise ValueError('Unsupported action ID')
    mapping = profile.get('animationMap', {})
    for action in allowed:
        if not mapping.get(action) or any(c not in ACTION_ANIMATIONS[action] for c in mapping[action]):
            raise ValueError('Action animation semantics do not match')

def executable_actions(profile, status):
    validate_profile(profile)
    supported = status.get('supportedActions', [])
    if any(a not in ACTION_IDS for a in supported):
        raise ValueError('Unsupported device capability')
    if status.get('actionContractVersion') != ACTION_CONTRACT_VERSION:
        return []
    return [a for a in profile['allowedActions'] if a == 'WAIT' or (status.get('hardware') == 'ready' and a in supported)]
