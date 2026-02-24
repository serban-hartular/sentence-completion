from enum import Enum

from ro_form_gen import msd_format
from ro_form_gen import verbform_grammar
from ro_form_gen.lexicon import Lexicon
from ro_form_gen.synthetic_form_generator import roFilterFnDict
from ro_form_gen.word_info_extractor import bad_tag_dict, WordMorphoInfoExtracter, WordFormGenerator, SYNTH_FORM

print('Loading libs')

from pathlib import Path
HERE = Path(__file__).resolve().parent
LEXICON_PATH = HERE / "lexicons" / "reterom.v1.1.json"

roVerbGrammar = verbform_grammar.generateRoVerbGrammar()
roMorphoDict = msd_format.generate_roMorphoDictionary()
lex = Lexicon.from_json(LEXICON_PATH)
w_ex = WordMorphoInfoExtracter(roVerbGrammar, roMorphoDict, bad_tag_dict)
w_gen = WordFormGenerator(lex, roMorphoDict, roVerbGrammar, roFilterFnDict)


class Number(Enum):
    SG = 'Sing'
    PL = 'Plur'

class Person(Enum):
    P1 = '1'
    P2 = '2'
    P3 = '3'
class VerbTense(Enum):
    PLUPERFECT = 'Pqp'
    PRESENT = 'Pres'
    PAST_PERF = 'PastPerfect'
    IMPERFECT = 'Imp'
    PAST_SIMPLE = 'Past'
    FUTURE = 'Future'

SYNTHETIC_TENSES = {VerbTense.PAST_PERF, VerbTense.FUTURE}

def get_verb_form_indicative(lemma : str,
                             tense : VerbTense,
                             person : Person,
                             number : Number) -> list[str]:
    if isinstance(tense, str):
        tense = VerbTense(tense)
    if isinstance(number, str):
        number = Number(number)
    if isinstance(person, str) or isinstance(person, int):
        person = Person(str(person))
    param_dict = {'lemma':lemma, 'category': 'V', 'Type': 'Main', 'Mood': 'Ind',
                  'Person':person.value, 'Number':number.value}
    if tense in SYNTHETIC_TENSES:
        param_dict |= {SYNTH_FORM:tense.value}
    else:
        param_dict |= {'Tense':tense.value}
    return w_gen.generate_form(param_dict)


