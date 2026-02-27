import itertools
import random

from question import QuestionSequenceFactory, QuestionData
import ro_form_gen
from ro_form_gen import Number

random.seed()

class RoNounIntruder(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantive articulate: elimină intrusul'
    SCREEN_KIND = 'mark_words'
    COLOR = '#11aa11'

    lemmas = ['om', 'elev', 'greiere', 'urs', 'urmaș', 'ceată', 'carte', 'bancă', 'stradă', 'sare', 'tunet', 'furtună', 'ploaie', 'soare', 'alergare', 'muncă', 'bucurie', 'hărnicie', 'nedumerire', 'generozitate', 'frumusețe', 'zbor', 'fericire', 'tristețe', 'intrare', 'lăcomie']

    def __init__(self, num_q : int = 5, num_choices = 4, singular = True):
        self.num_q = num_q
        self.count = -1
        self.num_choices, self.singular = num_choices, singular
        self.lemmas = list(RoNounIntruder.lemmas)
        self.lemma_index = 0
        random.shuffle(self.lemmas)

    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        if self.count == self.num_q:
            return None
        forms = []
        while len(forms) < self.num_choices:
            lemma = self.lemmas[self.lemma_index]
            f_dict = {definite : ro_form_gen.get_noun_form(lemma,
                                            Number.SG if self.singular else Number.PL,
                                                definite) for definite in (False, True)}
            if all(f_dict.values()):
                forms.append(f_dict)
            self.lemma_index = (self.lemma_index+1) % len(self.lemmas)

        rule = bool(random.randint(0, 1))
        exception = not rule
        exception_index = random.randint(0, self.num_choices-1)
        choices = [f_dict[exception if i == exception_index else rule]
                    for i, f_dict in enumerate(forms)]
        expected_answer = forms[exception_index][exception]
        return dict(prompt='Taie intrusul din următoarele cuvinte:',
                    words=choices,
                    correctMarked=[expected_answer],
                    markStyle='cross', allowMultiple=False, layout='row',
        )



if __name__ == "__main__":
    factory = RoNounIntruder()
    while True:
        a = factory.get_next_question()
        if a is None:
            break
        print(a)

