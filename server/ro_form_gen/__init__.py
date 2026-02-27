import ro_form_gen.generate_form_script
from ro_form_gen.generate_form_script import get_verb_form_indicative, get_noun_form
from ro_form_gen.generate_form_script import VerbTense, Number, Person

ro_form_gen.generate_form_script.initialize()

TENSE_NAMES = {
    VerbTense.PLUPERFECT:'mai mult ca perfect',
    VerbTense.PAST_PERF:'perfect compus',
    VerbTense.PAST_SIMPLE:'perfect simplu',
    VerbTense.IMPERFECT:'imperfect',
    VerbTense.PRESENT:'prezent',
    VerbTense.FUTURE:'viitor',
}