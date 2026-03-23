import dataclasses
import itertools
import random
import pickle

from sequences import SequenceFactoryRecord, QuestionSequenceFactory

form_dict = pickle.load(open('./noun_form_dict.5th.v1.0.p', 'rb'))['form_dict']
        

gender_dict = {'Masc':0, 'Fem':1, 'NEUTR':2}

class RoSortByGender(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantivul: sortează după gen'
    SCREEN_KIND = "sorted-lists"
    COLOR = '#11aa11'

    def __init__(self, num_q : int = 4, max_words_total = 8, max_words_per_row = 4):
        self.num_q = num_q
        self.count = -1
        self.max_words_per_row = max_words_per_row
        self.max_words_total = max_words_total
        self.lemmas = self._generate_lemmas()
        #list(itertools.chain.from_iterable(
            #[[(k, w) for w in v] for k,v in RoSortByGender.LEMMAS.items()]))
        self.lemma_index = 0
        random.shuffle(self.lemmas)
        self.previous_data = None

    def _generate_lemmas(self) -> list[tuple[int, str]]:
        lemmas_by_gender = {gender_dict[gen]:[lemma for lemma, d in form_dict.items() if d['Gender']==gen] for gen in gender_dict}
        return [(gen, lemma) for gen, llist in lemmas_by_gender.items() for lemma in llist]


    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        else:
            return self.previous_data
        if self.count == self.num_q:
            return None
        rows = {k:list() for k in gender_dict.values()}
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

class RoSortBy(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantivul: sortează după gen'
    SCREEN_KIND = "sorted-lists"
    COLOR = '#11aa11'

    def __init__(self, category : str, **kwargs):
        self.category = category
        self.num_q = 4
        self.max_words_per_row = 8
        self.max_words_total = 4
        self.__dict__ = {k:kwargs[k] if k in kwargs else v for k,v in self.__dict__.items()}

        self.count = -1
        self.lemmas = self._generate_lemmas()
        #list(itertools.chain.from_iterable(
            #[[(k, w) for w in v] for k,v in RoSortByGender.LEMMAS.items()]))
        self.lemma_index = 0
        random.shuffle(self.lemmas)
        self.previous_data = None

    def _generate_lemmas(self) -> list[tuple[int, str]]:
        lemmas_by_gender = {gender_dict[gen]:[lemma for lemma, d in form_dict.items() if d['Gender']==gen] for gen in gender_dict}
        return [(gen, lemma) for gen, llist in lemmas_by_gender.items() for lemma in llist]


    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        else:
            return self.previous_data
        if self.count == self.num_q:
            return None
        rows = {k:list() for k in gender_dict.values()}
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




if __name__ == "__main__":
    g = RoSortByGender()
    # g.get_next_question()
