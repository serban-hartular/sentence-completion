import itertools
import random

from sequences import SequenceFactoryRecord, QuestionSequenceFactory

class RoSortByGender(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantivul: sortează după gen'
    SCREEN_KIND = "sorted-lists"
    COLOR = '#11aa11'

    LEMMAS = {0: ['om', 'urs', 'copac'],
              1: ['femeie', 'cafea', 'haină'],
              2: ['caiet', 'vas', 'zar']}

    def __init__(self, num_q : int = 1, max_words_total = 8, max_words_per_row = 5):
        self.num_q = num_q
        self.count = -1
        self.max_words_per_row = max_words_per_row
        self.max_words_total = max_words_total
        self.lemmas = list(itertools.chain.from_iterable(
            [[(k, w) for w in v] for k,v in RoSortByGender.LEMMAS.items()]))
        self.lemma_index = 0
        random.shuffle(self.lemmas)
        self.previous_data = None

    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        else:
            return self.previous_data
        if self.count == self.num_q:
            return None
        rows = {k:list() for k in RoSortByGender.LEMMAS}
        while (max([len(v) for v in rows.values()]) < self.max_words_per_row and
            sum([len(v) for v in rows.values()]) < self.max_words_total):
            row, lemma = self.lemmas[self.lemma_index]
            self.lemma_index += 1
            if self.lemma_index >= len(self.lemmas):
                break
            rows[row].append(lemma)

        word_list = list(itertools.chain.from_iterable(
            [[(k, w) for w in v] for k,v in rows.items()]))

        self.previous_data = dict(
            prompt='Sortează substantivele după gen:',
            headers=['Masc.', 'Fem.', 'Neutre'],
            slotsPerColumn=[max([len(v) for v in rows.values()])] * len(rows),
            words=[lemma for row, lemma in word_list],
            correctColumn=[row for row, lemma in word_list],
        )
        return self.previous_data
