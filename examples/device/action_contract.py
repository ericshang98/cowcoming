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
    'LOOK_LEFT': ['look-left'], 'LOOK_RIGHT': ['look-right'],
    'LOOK_UP': ['look-up'], 'LOOK_DOWN': ['look-down'],
    'BOW': ['bow'], 'STRETCH': ['stretch'], 'BREATHE': ['breathe'],
    'SHIMMY': ['shimmy'], 'TURN_LEFT': ['turn-left'], 'TURN_RIGHT': ['turn-right'],
    'PAW_TAP_LEFT': ['paw-tap-left'], 'PAW_TAP_RIGHT': ['paw-tap-right'],
    'PAW_WAVE': ['paw-wave'], 'PAW_REACH': ['paw-reach'], 'PAW_CROSS': ['paw-cross'],
    'BELLY_BREATHE': ['belly-breathe'], 'BELLY_RUB': ['belly-rub'],
    'BELLY_LAUGH': ['belly-laugh'], 'TAIL_WAG': ['tail-wag'],
    'SIT': ['sit'], 'STAND': ['stand'], 'REST': ['rest'], 'WAKE': ['wake'],
    'PLAY_BOUNCE': ['play-bounce'], 'CELEBRATE': ['celebrate'],
    'SHY_HIDE': ['shy-hide'], 'COMFORT': ['comfort'], 'WAIT': ['idle'],
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
