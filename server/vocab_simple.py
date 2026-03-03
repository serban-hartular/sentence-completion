
from question import QuestionData, QuestionSequenceFactory
import random

class VocabSimpleEN(QuestionSequenceFactory):
    CLASS_NAME = 'EN: Jobs Vocabulary'
    SCREEN_KIND = 'vocab'
    COLOR = '#aa1111'

    def __init__(self) -> None:
        self.vocab = ['lorry driver', 'plumber', 'builder', 'office worker', 'mechanic', 'electrician', 'police officer', 'journalist', 'doctor', 'pilot', 'shop assistant', 'teacher', 'hairdresser', 'chef', 'nurse', 'taxi driver', 'cleaner', 'dentist']
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
            w : f'/pron/en/{w.replace(' ', '_')}.m4a' for w in self.vocab
        }
    def get_images(self) -> dict:
        return {
                w : f'/images/en/{w.replace(' ', '_')}.png' for w in self.vocab
        }

class VocabSimple(QuestionSequenceFactory):
    CLASS_NAME = 'FR: Vocabulaire Simple'
    SCREEN_KIND = 'vocab'
    COLOR = '#1111aa'

    def __init__(self) -> None:
        self.vocab = ['fleur', 'soleil', 'stylo', 'élèves',
                      'crayon', 'étoile', 'rose', 'métro',]
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
                'fleur':'/pron/fr/fleur.m4a',
                'soleil':'/pron/fr/soleil.m4a',
                'crayon':'/pron/fr/crayon.m4a',
                'stylo':'/pron/fr/stylo.m4a',
                'étoile':'/pron/fr/etoile.m4a',
                'élèves':'/pron/fr/eleve.m4a',
                'rose':'/pron/fr/rose.m4a',
        }
    def get_images(self) -> dict:
        return {
                'fleur':'/images/fleur.png',
                'soleil':'/images/soleil.png',
                'crayon':'/images/crayon.png',
                'stylo':'/images/stylo.png',
                'étoile':'/images/etoile.png',
                'élèves':'/images/eleves.png',
                'rose':'/images/rose.png',
                'métro': '/images/metro.png',
        }
