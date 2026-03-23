import random

import pandas as pd
from sequences import SequenceFactoryRecord, QuestionSequenceFactory

df = pd.read_csv('./lang_tables/have_got.tsv', sep='\t', encoding='utf-8')

data = df.to_dict(orient='records')
for d in data:
    d['Objects'] = d['Objects'].split(', ')

class EnHaveGot(QuestionSequenceFactory):
    CLASS_NAME = 'EN: Have got sentences'
    SCREEN_KIND = 'sentence'
    COLOR = '#aa1111'
    RANDOM_TRY_LIMIT = 100

    def __init__(self, num_q : int = 5, split_words = True) -> None:
        self.num_q = num_q
        self.count = 0
        self.queue = []
        self.split_words = split_words
        self.prev_question : dict|None = None
    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        if previous_was_good:
            self.count += 1
        else:
            return self.prev_question if self.prev_question else None
        if self.count > self.num_q:
            return None
        # get random inputs, make sure you haven't used them before
        subj, obj, have = None, None, None
        for _ in range(EnHaveGot.RANDOM_TRY_LIMIT):
            row = random.choice(data)
            subj = row['Subject']
            obj = random.choice(row['Objects'])
            have = row['Verb']
            correct = subj.split() + [have, 'got'] + obj.split() + ["."]
            if (subj, obj) not in self.queue and len(correct)<= 7: # otherwise too long for screen
                self.queue.append((subj, obj))
                break
        else:
            print('Cannot generate random!')
            return None
        
        correct = subj.split() + [have, 'got'] + obj.split()

        self.prev_question = dict(
            prompt=f'{self.count}/{self.num_q} Form a sentence from the following prompt, using the long form of the "have got":\n "' + 
                f'"{subj} / {obj}"' + '"',
            bankWords = subj.split() + obj.split() + ['has', 'have', 'got'],
            slots = [""] * len(correct) + ["."],
            correct = correct + ["."],
        )
        return self.prev_question
