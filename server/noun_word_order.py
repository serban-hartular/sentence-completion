from enum import Enum

import pandas as pd
from question import QuestionSequenceFactory, QuestionData
import ro_form_gen
from ro_form_gen import Number
from ro_form_gen.generate_form_script import Gender


class LANG(Enum):
    RO = 'ro'
    EN = 'en'

def generate_possessive(noun_lemmas : dict[LANG, str],
                        possessor_lemmas: dict[LANG, str]) -> (str, str):
    pass

def generate_possessive_en(noun : str, possessor : str, adj : str = None) -> str:
    if not possessor[0].isupper():
        possessor = 'the ' + possessor
    if possessor[-1] == 's':
        possessor += "'"
    else:
        possessor += "'s"
    return ' '.join([w for w in (possessor, adj, noun) if w])

al_a_ai_ale = {
    Gender.MASC :{Number.SG: 'al', Number.PL: 'ai'},
    Gender.FEM : {Number.SG: 'a', Number.PL: 'ale'},
}

def generate_possessive_ro(noun : str, possessor : str, adj : str = None) -> str|None:
    noun_info = ro_form_gen.get_noun_info(noun)
    if not noun_info:
        return None
    noun_info = noun_info[0]
    noun = ro_form_gen.get_noun_form(noun, noun_info['Number'], True, True)
    if possessor[0].isupper():
        possessor = 'lui ' + possessor
        possessor_info = {'Gender':Gender.MASC, 'Number':Number.SG}
    else:
        possessor_info = ro_form_gen.get_noun_info(possessor)
        if not possessor_info:
            return None
        possessor_info = possessor_info[0]
        possessor = ro_form_gen.get_noun_form(possessor_info['lemma'],
                                             possessor_info['Number'],
                                             True, False)
        if not possessor:
            return None
    if adj:
        particle = al_a_ai_ale[noun_info['Gender']][noun_info['Number']]
        possessor = particle + ' ' + possessor
        adj = ro_form_gen.get_adj_form(adj, noun_info['Gender'],
                                       noun_info['Number'], False, True)
    return ' '.join([w for w in (noun, adj, possessor) if w])