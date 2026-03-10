import dataclasses
from enum import Enum
from typing import Dict


class NestedDict(Dict):
    def data(self, path : str|list[str]):
        if isinstance(path, str):
            path = path.split('.')
        d = next = self
        while path:
            next = d.get(path[0])
            if next is None:
                break
            d = next
            path = path[1:]
        return next

@dataclasses.dataclass
class SemanticUnit:
    lemma : str
    children : list[tuple[str, 'SemanticUnit']] = dataclasses.field(default_factory=list)

class SyntacticNode:
    node_type : str # node type
    semantic_unit : SemanticUnit
    features: NestedDict = dataclasses.field(default_factory=NestedDict)
    children : list['SyntacticNode'] = dataclasses.field(default_factory=list)
    word : str = None
    def __post_init__(self): # sanity check
        if bool(self.children) == bool(self.word):
            raise Exception('Syntactic node must have either word or children.')
    def is_leaf(self) -> bool:
        return self.word is None

rule1 = ({'node':'NP', 'case':'@1'}, [
            {'node':'N', 'role':'center', 'agree':'parent'},
            {'node':'AdjP', 'role':'modifier', 'agree':'parent'},
            {'node':'NP', 'role':'possessor', 'case':'Gen'}
])

rule2 = ({'node':'AdjP'}, [
            {'node':'Adj', 'role':'center', 'agree':'parent'},
])

def generate_syntactic_tree(rule : tuple[dict, list], semantic : NPSemantic) -> dict:
    pass