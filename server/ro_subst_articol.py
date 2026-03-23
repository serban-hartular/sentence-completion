import dataclasses
import itertools
import json
import random
from typing import Any, Callable

from sequences import QuestionSequenceFactory, QuestionData
import ro_form_gen
from ro_form_gen import Number

random.seed()
ro_form_gen.initialize()

LEMMAS = list({'om', 'elev', 'greiere', 'urs', 'urmaș', 'ceată', 'carte', 'bancă', 'stradă', 'sare', 'tunet', 'furtună', 'ploaie', 'soare', 'alergare', 'muncă', 'bucurie', 'hărnicie', 'nedumerire', 'generozitate', 'frumusețe', 'zbor', 'fericire', 'tristețe', 'intrare', 'lăcomie',
        'copil', 'școală', 'carte', 'caiet', 'creion', 'profesor', 'elev', 'bancă', 'tablă', 'lecție', 'prieten', 'familie', 'mamă', 'tată', 'frate', 'soră', 'bunic', 'bunică', 'casă', 'cameră', 'masă', 'scaun', 'fereastră', 'ușă', 'pat', 'mâncare', 'apă', 'pâine', 'fruct', 'legumă', 'măr', 'banană', 'lapte', 'animal', 'câine', 'pisică', 'pasăre', 'pește', 'cal', 'vacă', 'natură', 'copac', 'floare', 'iarbă', 'munte', 'râu', 'mare', 'cer', 'soare', 'lună', 'stea', 'ploaie', 'vânt', 'zăpadă', 'anotimp', 'primăvară', 'vară', 'toamnă', 'iarnă', 'oraș', 'sat', 'stradă', 'parc', 'magazin', 'piață', 'autobuz', 'tren', 'mașină', 'bicicletă', 'drum', 'timp', 'noapte', 'dimineață', 'seară', 'joc', 'jucărie', 'minge', 'desen', 'poveste', 'film', 'muzică', 'cântec', 'instrument', 'calculator', 'telefon', 'ceas', 'calendar', 'număr', 'literă', 'cuvânt', 'propoziție', 'întrebare', 'răspuns', 'problemă', 'soluție', 'regulă', 'lege', 'dreptate', 'adevăr'}
) # 'zi',

class RoNounIntruder(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantive articulate: elimină intrusul'
    SCREEN_KIND = 'mark_words'
    COLOR = '#11aa11'

    lemmas = LEMMAS

    def __init__(self, **kwargs):
        kwargs = {'num_q' : 5, 'num_choices' : 4, 'singular' : True} | kwargs
        try:
            self.num_q = int(kwargs.get('num_q'))
            self.num_choices, self.singular = int(kwargs.get('num_choices')), bool(kwargs.get('singular'))
        except Exception as e:
            raise e
        self.count = -1
        self.lemmas = list(RoNounIntruder.lemmas)
        self.lemma_index = 0
        random.shuffle(self.lemmas)
        self.exception = [False] * self.num_q + [True] * self.num_q
        random.shuffle(self.exception)
        self.exception = self.exception[:self.num_q]


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

        exception = self.exception[self.count]
        rule = not exception
        exception_index = random.randint(0, self.num_choices-1)
        choices = [f_dict[exception if i == exception_index else rule]
                    for i, f_dict in enumerate(forms)]
        expected_answer = forms[exception_index][exception]
        return dict(prompt='Taie intrusul din următoarele cuvinte:',
                    words=choices,
                    correctMarked=[expected_answer],
                    markStyle='cross', allowMultiple=False, layout='row',
        )


class RoSortNouns(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantive articulate: sortează în coloane'
    SCREEN_KIND = 'categorize'
    COLOR = '#11aa11'

    lemmas = LEMMAS

    def __init__(self, num_q : int = 3, words_per_col = 4, singular = True):
        self.num_q = num_q
        self.count = -1
        self.words_per_col, self.singular = words_per_col, singular
        self.lemmas = list(RoNounIntruder.lemmas)
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
        forms = []
        while len(forms) < self.words_per_col*2:
            lemma = self.lemmas[self.lemma_index]
            f_dict = {definite : ro_form_gen.get_noun_form(lemma,
                                            Number.SG if self.singular else Number.PL,
                                                definite) for definite in (False, True)}
            if all(f_dict.values()):
                forms.append(f_dict)
            self.lemma_index = (self.lemma_index+1) % len(self.lemmas)

        if not forms:
            return None
        col1 = [f[False] for f in forms[:self.words_per_col]]
        col2 = [f[True] for f in forms[self.words_per_col:]]
        self.previous_data = dict(prompt='Sortează substantivele în două coloane:', headers=['Articulate', 'Nearticulate'],
                    slotsPerColumn=[self.words_per_col, self.words_per_col],
                    words=col1 + col2,
                    correctColumn = [1]*len(col1) + [0]*len(col2)
        )
        return self.previous_data


def split_list_by(l : list, criterion : Any|Callable[[Any], bool], append_split_value : bool = True) -> list[list]:
    if not isinstance(criterion, Callable):
        value = criterion
        criterion = lambda _n : _n == value
        
    split_l = [[]]
    for n in l:
        if not criterion(n):
            split_l[-1].append(n)
        else:
            if append_split_value:
                split_l[-1].append(n)
            split_l.append([])
    return [subl for subl in split_l if subl]

@dataclasses.dataclass
class TextToSortRecord:
    neart: list[str]
    nehot: list[str]
    hot: list[str]
    word_list: list[str]
    ok: bool = True
    message : str = ''
    misc: str = ''
    
    @staticmethod
    def from_dict(d) -> 'TextToSortRecord':
        rec = TextToSortRecord(**d)
        return rec

    def to_jsonable(self) -> dict:
        return dataclasses.asdict(self)
    
    def chop_by(self, num : int, criterion : str = 'sentences') -> 'TextToSortRecord':
        new_rec = TextToSortRecord([], [], [], [])
        sentences = split_list_by(self.word_list, lambda s: s.strip() == '.')
        target_lists = [new_rec.neart, new_rec.nehot, new_rec.hot]
        orig_lists = [self.neart, self.nehot, self.hot]
        for i, sentence in enumerate(sentences):
            if criterion == 'individual' and max([len(tl) for tl in target_lists]) > num:
                break
            elif criterion == 'total' and sum([len(tl) for tl in target_lists]) > num:
                break
            elif criterion == 'sentences' and i >= num:
                break
            elif criterion not in {'individual', 'total', 'sentences'}:
                raise Exception('Unknown criterion ' + criterion)
            new_rec.word_list.extend(sentence)
            word_set = {w.strip() for w in new_rec.word_list}
            for orig, target in zip(orig_lists, target_lists):
                target.clear()
                target.extend([w for w in orig if w in word_set])

        return new_rec
    
    


from pathlib import Path
HERE = Path(__file__).resolve().parent
TEXT_PATH = HERE / 'vocab_ro' / 'noun_art_sel.v1.0.json'

class RoSortFromText(QuestionSequenceFactory):
    CLASS_NAME = 'RO: Substantive articulate: găsește în text'
    SCREEN_KIND = "sort-from-text"
    COLOR = '#11aa11'

    def __init__(self, **kwargs):
        self.count = -1
        self.num_q : int = kwargs.get('num_q') if kwargs.get('num_q') is not None else 5
        self.max_slots_per_row = kwargs.get('max_slots_per_row') if kwargs.get('max_slots_per_row') is not None else 4
        data_path = kwargs.get('data_path') if kwargs.get('data_path') is not None else TEXT_PATH
        text_list = json.load(open(data_path, 'r'))
        self.headers = {"neart" : 'Nearticulate:',
                        "nehot": "Articulate nehotărât",
                        "hot": "Articulate hotărât"}
        text_list = [d for d in text_list if max([len(d[k]) for k in self.headers])<=self.max_slots_per_row]
        text_list = random.choices(text_list, k=self.num_q)
        self.num_q = min([self.num_q, len(text_list)])
        self.queue = [dict(
                        sourceText=[{'text':w.strip(), 'spaceAfter':w[-1]==' '} for w in d['word_list']],
                        headers=[v for _, v in self.headers.items()],
                        slotsPerColumn=[self.max_slots_per_row] * len(self.headers),
                        correctColumnContents = [d[k] for k in self.headers],
          ) for d in text_list if d['ok']
        ]
        #self.num_q = len(self.queue)


    def get_next_question(self, previous_was_good = True):
        if previous_was_good:
            self.count += 1
        if self.count >= self.num_q:
            return None
        return self.queue[self.count] | dict(prompt=f"{self.count+1}/{self.num_q} Extrage substantivele din textul următor și sortează-le după modul în care sunt articulate:",)

if __name__ == "__main__":
    factory = RoNounIntruder()
    while True:
        a = factory.get_next_question()
        if a is None:
            break
        print(a)

