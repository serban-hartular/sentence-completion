from __future__ import annotations

import dataclasses
from collections import defaultdict
from typing import Dict, Iterable, ClassVar

import msd_format


class Token(Dict[str, set[str]]):
    AGREE = {'@'}
    def __init__(self, features : dict[str, set[str]|str]):
        super().__init__()
        d = dict(features)
        d = {k:v for k,v in d.items() if v}
        d = {k:{v} if isinstance(v, str) or not isinstance(v, Iterable) else set(v) for k,v in d.items()}
        self.update(d)
    def other_matches_this(self, other : dict) -> bool:
        for k,v in self.items():
            if k not in other:
                return False
            v_o = other[k]
            v_o = v_o if not isinstance(v_o, str) and isinstance(v_o, Iterable) else {v_o}
            if not v.intersection(v_o):
                return False
        return True

    def apply_agree_values(self, value_dict : dict[str, str]) -> Token:
        new_values = dict(self)
        for k,v in value_dict.items():
            if k in new_values and new_values[k] == Token.AGREE:
                new_values[k] = v
        return Token(new_values)

    def apply_values(self, value_dict : dict[str, str]) -> Token | None:
        new_values = dict(self)
        for k,v in value_dict.items():
            if k not in self or self[k] == Token.AGREE or v in self[k]:
                new_values[k] = v
            else:
                return None
        return Token(new_values)

    def to_single_value(self, merge_dict : dict[tuple, str] = None) -> bool:
        """Reduce all values to single values (as opposed to sets). Will merge
        multiple-value sets to single values by following merge_dict. If it fails,
        it will return False and won't change the token."""
        if merge_dict is None:
            merge_dict = {}
        d = dict(self)
        for k in d:
            v = d[k]
            if len(v) == 0:
                d[k] = None
            elif len(v) == 1:
                d[k] = list(v)[0]
            else:
                findFlag = False
                for merge_key, merge_val in merge_dict.items():
                    if set(merge_key) == v:
                        d[k] = merge_val
                        findFlag = True
                        break
                if not findFlag:
                    return False
        self.update(d)
        return True
@dataclasses.dataclass
class Atom:
    name : str
    req : Token
    def value_dict_matches(self, value_dict : dict[str, str|set[str]]) -> Token | None:
        value_dict = Token(value_dict)
        ret_dict = {}
        for req_k, req_v in self.req.items():
            if req_v == Token.AGREE and req_k in value_dict:
                ret_dict[req_k] = value_dict[req_k]
                continue
            if req_k in value_dict and not req_v.intersection(value_dict[req_k]): # what they have in common
                return None
        return Token(ret_dict)


@dataclasses.dataclass
class Rule:
    item : Atom
    expansion : list[Atom]

    def generate_based_on(self, value_dict : dict[str, str]) -> list[Token] | None:
        if self.item.req.apply_values(value_dict) is None:
            return None
        result = [atom.req.apply_agree_values(value_dict) for atom in self.expansion]
        return result

    def value_dict_sequence_matches(self, value_dict_seq : list[dict[str, str|set[str]]]) -> dict[str, set[str]] | None:
        if len(value_dict_seq) != len(self.expansion):
            return None
        match_seq = [atom.value_dict_matches(value_dict) for atom, value_dict in zip(self.expansion, value_dict_seq)]
        if None in match_seq:
            return None
        match_union = {}
        for match in match_seq:
            for k,v in match.items():
                if k not in match_union:
                    match_union[k] = v
                else:
                    match_union[k].update(v)
        return match_union




class Grammar(Dict[str, list[Rule]]):
    def __init__(self, rules : list[Rule]):
        super().__init__()
        d = defaultdict(list)
        for r in rules:
            d[r.item.name].append(r)
        self.update(d)

    def generate_based_on(self, rule_name : str, value_dict : dict[str, str]) -> list[list[Token]]:
        rules = self[rule_name]
        sequences = []
        for rule in rules:
            sequence = rule.generate_based_on(value_dict)
            if not sequence:
                continue
            to_single = [s.to_single_value() for s in sequence]
            if not all(to_single):
                raise Exception('Cannot make sequence single: ' + str(sequence))
            sequences.append(sequence)
        return sequences

    def value_dict_sequence_matches(self, value_dict_seq : list[dict[str, str|set[str]]]) -> list[tuple[str, dict[str, set[str]]]]:
        matches = []
        for name, rules in self.items():
            for rule in rules:
                match = rule.value_dict_sequence_matches(value_dict_seq)
                if not match:
                    continue
                matches.append((name, match))
        return matches



def generateRoVerbGrammar() -> Grammar:
    roMorphoDict = msd_format.generate_roMorphoDictionary()
    def from_tag(tag: str) -> dict:
        return roMorphoDict.features_from_tag(tag)

    PERS = {'Person': '@'}
    NUM = {'Number': '@'}
    LEMMA = {'lemma': '@'}

    PARTICIPLE = from_tag('Vmp--sm')
    INFINITIVE = from_tag('Vmn')
    INDICATIVE_PRES = from_tag('Vmip')
    SUBJ_PRESENT = from_tag('Vmsp')
    AUX_VERB = from_tag('Va')
    AUX_INF = from_tag('Van')
    SA = from_tag('Qs')
    O = from_tag('Qf')
    A = from_tag('Qn')

    PastPerfect = Rule(Atom('PastPerfect', Token(PERS|NUM|LEMMA)), [
        Atom('Aux', Token(AUX_VERB|PERS|NUM|{'lemma':'avea', 'Special':'Ind'})),
        Atom('Participle', Token(PARTICIPLE|LEMMA))
    ])
    Future = Rule(Atom('Future', Token(PERS|NUM|LEMMA)), [
        Atom('Aux', Token(AUX_VERB|PERS|NUM|{'lemma':'vrea'})),
        Atom('Infinitive', Token(INFINITIVE|LEMMA))
    ])

    FuturePerfect = Rule(Atom('FuturePerfect', Token(PERS|NUM|LEMMA)), [
        Atom('Aux', Token(AUX_VERB|PERS|NUM|{'lemma':'vrea'})),
        Atom('Fi', Token(AUX_INF|{'lemma':'fi'})),
        Atom('Participle', Token(PARTICIPLE|LEMMA))
    ])

    Conditional = Rule(Atom('Conditional', Token(PERS|NUM|LEMMA)),[
        Atom('Aux', Token(AUX_VERB|PERS|NUM|{'lemma':'avea'})),
        Atom('Infinitive', Token(INFINITIVE | LEMMA))
    ])

    ConditionalPerfect = Rule(Atom('ConditionalPerfect', Token(PERS|NUM|LEMMA)), [
        Atom('Aux', Token(AUX_VERB|PERS|NUM|{'lemma':'avea'})),
        Atom('Fi', Token(AUX_INF|{'lemma':'fi'})),
        Atom('Participle', Token(PARTICIPLE|LEMMA))
    ])
    Subjunctive12 = Rule(Atom('Subjunctive', Token({'Person': {'1', '2'}} | NUM | LEMMA)), [
        Atom('SA', Token(SA|{'lemma':'să'})),
        Atom('Subj12', Token(INDICATIVE_PRES | PERS | NUM | LEMMA))
    ])
    Subjunctive3 = Rule(Atom('Subjunctive', Token({'Person': {'3'}} | NUM | LEMMA)), [
        Atom('SA', Token(SA|{'lemma':'să'})),
        Atom('Subj3', Token(SUBJ_PRESENT | PERS | NUM | LEMMA))
    ])
    # Infinitive = Rule(Atom('Infinitive', ))

    roVerbGrammar = Grammar([Future, PastPerfect, Conditional, FuturePerfect, ConditionalPerfect,
                             Subjunctive12, Subjunctive3])
    return roVerbGrammar



