from __future__ import annotations

from typing import Callable

import msd_format
import verbform_grammar
from lexicon import Lexicon, LexiconEntry, LexiconFilterFn
from verbform_grammar import Token, Rule, Grammar
from msd_format import MorphoDictionary

AGREE_VALUE = list(verbform_grammar.Token.AGREE)[0]

class SyntheticFormGenerator:
    DEFAULT = 'default'
    def __init__(self, lex : Lexicon, morph_dict : MorphoDictionary, synth_form_grammar : verbform_grammar.Grammar,
                 filterFnDict : dict[str, LexiconFilterFn] = None):
        self.lex = lex
        self.morph_dict = morph_dict
        self.grammar = synth_form_grammar
        self.filterFnDict = filterFnDict if filterFnDict else {}

    def rule_to_forms(self, rule_name: str, value_dict: dict,
                      reduce_to_single_form : bool = False) -> list[list[str]] | list[str] | None:
        feature_seq = self.grammar.generate_based_on(rule_name, value_dict) # generate sequence of lemmas and xpos tags
        if not feature_seq:
            return None
        filterFn = self.filterFnDict[rule_name] if rule_name in self.filterFnDict else \
            self.filterFnDict[SyntheticFormGenerator.DEFAULT] if SyntheticFormGenerator.DEFAULT in self.filterFnDict else \
            None
        feature_seq = feature_seq[0]
        form_list = []
        for feature_dict in feature_seq:
            lemma = feature_dict['lemma']
            # xpos = self.morph_dict.tag_from_features(feature_dict, False)
            xpos = self.morph_dict.tag_from_features({k:v for k,v in feature_dict.items() if v != AGREE_VALUE}, False)
            forms = self.lex.lemma_xpos_to_form(lemma, xpos, filterFn)
            form_list.append(forms)
        if not all(form_list): # empty lists means cant find
            return None
        if reduce_to_single_form:
            form_list = [f[0] for f in form_list]
        return form_list


def filterNegPrefix(e : LexiconEntry, xpos : str = None) -> bool:
    return not e.is_neg

def filterForConditional(e : LexiconEntry, orig_xpos : str) -> bool:
    """If conditional: aș/*am, ai, ar/*a, am, ați, ar/*au"""
    if not filterNegPrefix(e):
        return False
    if e.xpos.startswith('Va') and e.lemma == 'avea':
        if e.form in ('a', 'au') or (e.form == 'am' and orig_xpos.startswith('Va--1s')):
            return False
    return True

def filterForPastPerfect(e : LexiconEntry, orig_xpos : str) -> bool:
    """If past perfect: am/*aș, ai, a/*ar, am, ați, au/*ar"""
    if not filterNegPrefix(e):
        return False
    if e.xpos.startswith('Va') and e.lemma == 'avea' and e.form in ('aș', 'ar'):
        return False
    return True

#
# def feature_seq_to_forms(feature_seq : list[dict[str, str]],
#                          morpho_dict : MorphoDictionary,
#                          lex : Lexicon,
#                          filterFn : Callable[[LexiconEntry, str], bool] = None)\
#                                 -> list[list[str]]:
#     form_list = []
#     for feature_dict in feature_seq:
#         lemma = feature_dict['lemma']
#         xpos = morpho_dict.tag_from_features(feature_dict, False)
#         forms = lex.lemma_xpos_to_form(lemma, xpos, filterFn)
#         form_list.append(forms)
#     return form_list

roFilterFnDict = {SyntheticFormGenerator.DEFAULT : filterNegPrefix,
                    'Conditional': filterForConditional,
                    'ConditionalPerfect': filterForConditional,
                    'PastPerfect': filterForPastPerfect}

if __name__ == "__main__":
    lex = Lexicon.from_json('./lexicons/reterom.v1.1.json')
    roVerbGrammar = verbform_grammar.generateRoVerbGrammar()
    roMorphoDictionary = msd_format.generate_roMorphoDictionary()

    filterFnDict = roFilterFnDict

    roVerbGenerator = SyntheticFormGenerator(lex, roMorphoDictionary, roVerbGrammar, filterFnDict)

    f = roVerbGenerator.rule_to_forms('Future', {'lemma':'putea', 'Person':'1', 'Number':'Sing'})
    print(f)


