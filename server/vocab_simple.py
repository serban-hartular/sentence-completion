
from question import QuestionData, QuestionSequenceFactory
import random

class VocabSimple(QuestionSequenceFactory):
    CLASS_NAME = 'Vocabulaire Simple'
    SCREEN_KIND = 'vocab'

    def __init__(self) -> None:
        self.vocab = ['fleur', 'soleil', 'stylo', 'élèves', 'crayon', 'étoile', 'rose']
        self.fit = 3
        self.index = -self.fit
        random.shuffle(self.vocab)

    def get_next_question(self, previous_was_good: bool = True) -> dict | None:
        if previous_was_good:
            self.index += self.fit
        if self.index >= len(self.vocab):
            return None
        vocab = self.vocab[self.index:self.index+self.fit]
        return dict(prompt='Potriviți cuvintele:',
                    slotCount=len(vocab),
                    targets=[{'imageId':w, 'slotIndex':i} for i, w in enumerate(vocab)],
                    bankWords=vocab,
                    correct=vocab,
                )
    
    def get_pronounciations(self) -> dict:
        return {
                'fleur':'/assets/pron/fr/fleur.m4a',
                'soleil':'/assets/pron/fr/soleil.m4a',
                'crayon':'/assets/pron/fr/crayon.m4a',
                'stylo':'/assets/pron/fr/stylo.m4a',
                'étoile':'/assets/pron/fr/etoile.m4a',
                'élèves':'/assets/pron/fr/eleve.m4a',
                'rose':'/assets/pron/fr/rose.m4a',
        }
    def get_images(self) -> dict:
        return {
                'fleur':'/assets/images/fleur.png',
                'soleil':'/assets/images/soleil.png',
                'crayon':'/assets/images/crayon.png',
                'stylo':'/assets/images/stylo.png',
                'étoile':'/assets/images/etoile.png',
                'élèves':'/assets/images/eleves.png',
                'rose':'/assets/images/rose.png',
        }
