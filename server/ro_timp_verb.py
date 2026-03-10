import itertools
import random

from sequences import QuestionSequenceFactory, QuestionData
import ro_form_gen

class RoVerbTenseQuestions(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Timpurile verbului'
    SCREEN_KIND = 'sentence'
    COLOR = '#11aa11'

    lemmas = ['veni', 'pleca', 'cânta', 'vedea', 'porni', 'hotărî', 'merge', 'face']

    def __init__(self, num_q : int = 5, num_tenses : int = 5):
        self.num_q = num_q
        self.count = -1
        self.num_tenses = num_tenses

    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        if self.count == self.num_q:
            return None
        t0, choices, t1 = None, None, None
        while True: # generate random problem
            lemma = random.choice(RoVerbTenseQuestions.lemmas)
            tenses = random.sample(list(ro_form_gen.VerbTense), self.num_tenses)
            num, pers = (random.choice(list(T)) for T in (ro_form_gen.Number, ro_form_gen.Person))
            verb_forms = {t:ro_form_gen.get_verb_form_indicative(lemma, t, pers, num) for t in tenses}
            if not all(verb_forms.values()):
                continue
            verb_forms = {t:' '.join(v) for t, v in verb_forms.items()}
            if len(set(verb_forms.values())) != len(list(verb_forms.values())): # forms must be distinct
                continue
            t0, t1 = random.sample(tenses, 2)
            choices = [t for t in tenses if t != t0]
            break
        prompt=f'{self.count+1}/{self.num_q} Treceți verbul "{verb_forms[t0]}" la timpul {ro_form_gen.TENSE_NAMES[t1]}:'
        choices = [verb_forms[c] for c in choices]
        choices = list(itertools.chain.from_iterable([c.split() for c in choices]))
        slots = ["", ""]
        correct = verb_forms[t1].split()
        correct += [""]*(len(slots)-len(correct))
        return QuestionData(
            prompt=prompt, slots=slots, bankWords=choices, correct=correct,
        ).to_dict()



