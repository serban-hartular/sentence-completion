import ro_form_gen.generate_form_script
from ro_form_gen.generate_form_script import \
    get_verb_form_indicative, get_noun_form, get_noun_info, get_adj_form
from ro_form_gen.generate_form_script import VerbTense, Number, Person, Gender

from pathlib import Path

def initialize(lexicon_path : Path|str|None = None, force_reload : bool = False):
    ro_form_gen.generate_form_script.initialize(lexicon_path, force_reload)


TENSE_NAMES = {
    VerbTense.PLUPERFECT:'mai mult ca perfect',
    VerbTense.PAST_PERF:'perfect compus',
    VerbTense.PAST_SIMPLE:'perfect simplu',
    VerbTense.IMPERFECT:'imperfect',
    VerbTense.PRESENT:'prezent',
    VerbTense.FUTURE:'viitor',
}