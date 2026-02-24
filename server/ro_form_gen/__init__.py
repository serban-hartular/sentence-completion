from ro_form_gen.generate_form_script import get_verb_form_indicative
from ro_form_gen.generate_form_script import VerbTense, Number, Person

TENSE_NAMES = {
    VerbTense.PLUPERFECT:'mai mult ca perfect',
    VerbTense.PAST_PERF:'perfect compus',
    VerbTense.PAST_SIMPLE:'perfect simplu',
    VerbTense.IMPERFECT:'imperfect',
    VerbTense.PRESENT:'prezent',
    VerbTense.FUTURE:'viitor',
}