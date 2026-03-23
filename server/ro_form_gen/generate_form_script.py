from enum import Enum
import io

from ro_form_gen import msd_format
from ro_form_gen import verbform_grammar
from ro_form_gen.lexicon import Lexicon
from ro_form_gen.msd_format import MorphoDictionary
from ro_form_gen.synthetic_form_generator import roFilterFnDict
from ro_form_gen.word_info_extractor import bad_tag_dict, WordMorphoInfoExtracter, WordFormGenerator, SYNTH_FORM

from pathlib import Path
HERE = Path(__file__).resolve().parent
LEXICON_PATH = HERE / "lexicons" / "reterom.v1.2.json"


roVerbGrammar = w_ex = w_gen = None
roMorphoDict : MorphoDictionary = None
lex : Lexicon = None

def initialize(lexicon_path : Path|str|None = None, force_reload : bool = False):
    if lexicon_path is None:
        lexicon_path = LEXICON_PATH
    elif isinstance(lexicon_path, str):
        lexicon_path = HERE / "lexicons" / lexicon_path
    global roVerbGrammar, roMorphoDict, lex, w_ex, w_gen
    if not all([roVerbGrammar, roMorphoDict, lex, w_ex, w_gen]) or force_reload:
        print('Loading lexicon')
    if roVerbGrammar is None:
        roVerbGrammar = verbform_grammar.generateRoVerbGrammar()
    if roMorphoDict is None:
        roMorphoDict = msd_format.generate_roMorphoDictionary()
    if lex is None:
        lex = Lexicon.from_json(lexicon_path)
    if w_ex is None:
        w_ex = WordMorphoInfoExtracter(roVerbGrammar, roMorphoDict, bad_tag_dict)
    if w_gen is None:
        w_gen = WordFormGenerator(lex, roMorphoDict, roVerbGrammar, roFilterFnDict)


class Number(Enum):
    SG = 'Sing'
    PL = 'Plur'

class Person(Enum):
    P1 = '1'
    P2 = '2'
    P3 = '3'

class Gender(Enum):
    MASC = 'Masc'
    FEM = 'Fem'

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


def get_noun_form(  lemma : str,
                    number : Number,
                    definite : bool,
                    case_dir : bool = True, **kwargs) -> str|None:
    if isinstance(number, str):
        number = Number(number)
    with_tag = bool(kwargs.get('with_tag'))
    tag = dict(category='N', Type='Common',
                lemma=lemma, Number = number.value,
                Definiteness='Yes' if definite else 'No',
                Case='Dir' if case_dir else 'Obl')
    forms = w_gen.generate_form(tag)
    if not with_tag:
        return forms[0] if forms else None
    return (forms[0], tag) if forms else (None, None)

def get_noun_info(form : str) -> list[dict]:
    if form not in lex.form_dict:
        return []
    tag_entries = [(e.lemma, e.xpos) for e in lex.form_dict[form] if e.xpos.startswith('N')]
    if not tag_entries:
        return []
    feat_entries = [{'lemma':e[0]}|roMorphoDict.features_from_tag(e[1]) for e in tag_entries]
    for d in feat_entries:
        if 'Gender' in d:
            d['Gender'] = Gender(d['Gender'])
        if 'Number' in d:
            d['Number'] = Number(d['Number'])
        if 'Definiteness' in d:
            d['Definiteness'] = (d['Definiteness'] == 'Yes')
        d['Case_Dir'] = d.get('Case') != 'Obl'
    return feat_entries

def get_adj_form( lemma : str,
                  gender : Gender,
                    number : Number,
                    definite : bool = False,
                    case_dir : bool = True) -> str|None:
    if isinstance(number, str):
        number = Number(number)
    if isinstance(gender, str):
        gender = Gender(gender)
    tag = dict(category='A',
                lemma=lemma, Number = number.value,
                Gender=gender.value,
                Definiteness='Yes' if definite else 'No',
                Case='Dir' if case_dir else 'Obl')
    forms = w_gen.generate_form(tag)
    return forms[0] if forms else None
