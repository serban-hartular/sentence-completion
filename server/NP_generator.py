import dataclasses
from enum import Enum

Token=dict

class NPCenterType(Enum):
    NOUN = 'NOUN'
    PRON = 'PRON'
    POSS = 'POSS'

@dataclasses.dataclass
class NPCenter:
    kind : NPCenterType
    lemma : str
    feats : dict[str, str] = dataclasses.field(default_factory=dict)

@dataclasses.dataclass
class NPSemantic:
    center : str
    modifier : str = None # |AdjPSemantic
    possessor : 'NPSemantic' = None

{'Phrase':'NP', 'Case':'@1'}