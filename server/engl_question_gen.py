from typing import TypedDict, Unpack
import pandas as pd
import random
from question import QuestionData, QuestionSequenceFactory

TO_BE = {1:{1:'am', 2:'are', 3:'is'},
         2:{1:'are', 2:'are', 3:'are'}}

TO_BE_NEG = {1:{1:"'m not", 2:"aren't", 3:"isn't"},
             2:{1:"aren't", 2:"aren't", 3:"aren't"}}

SUBJ_PRONS = {1:{1:['I'], 2:['you'], 3:['he','she','it']},
              2:{1:['we'], 2:['you'], 3:['they']}}



SUBJECTS = pd.read_csv('./subjects.tsv', sep='\t', encoding='utf-8').fillna('').to_dict(orient='records')

NPREDS = pd.read_csv('./npreds.tsv', sep='\t', encoding='utf-8').fillna('').to_dict(orient='records')

def get_subj_pron(subj : dict) -> str:
    subj_form, pers, nr, pron = (subj[k] for k in ('Subj', 'Pers', 'Num', 'Pronoun'))
    if not pron:
        return SUBJ_PRONS[nr][pers][0]
    elif ',' not in pron:
        return pron
    else:
        return random.choice(pron.split(','))


class SentenceOptions(TypedDict, total=False):
    affirm: bool
    short_answer: bool
    question: bool
    split_words : bool

SENTENCE_OPTIONS_DEFAULTS : SentenceOptions = {
    'affirm': True,
    'short_answer':False,
    'question':False,
    'split_words' : True,
}

def generate_copulative_sentence(subj : dict, npred : dict, **kwargs : Unpack[SentenceOptions]) -> list[str]:
    kwargs = SENTENCE_OPTIONS_DEFAULTS | kwargs
    subj_form, pers, nr, pron = (subj[k] for k in ('Subj', 'Pers', 'Num', 'Pronoun'))
    verb = TO_BE[nr][pers] if kwargs.get('affirm') else TO_BE_NEG[nr][pers]
    npred_form = npred['NPred']
    if kwargs.get('short_answer'):
        subj_form = get_subj_pron(subj)

    if kwargs.get('split_words'):
        pre = ["yes" if kwargs.get('affirm') else 'no', ","] if kwargs.get('short_answer') else []
        subj_form = subj_form.split()
        verb = verb.split()
        npred_form = npred_form.split()
    else:
        pre = ["yes," if kwargs.get('affirm') else 'no,'] if kwargs.get('short_answer') else []
        subj_form = [subj_form]
        verb = [verb]
        npred_form = [npred_form]
    post = ["?" if kwargs.get('question') else "."]
    if kwargs.get('short_answer'):
        npred_form = []
    if kwargs.get('question'):
        return pre + verb + subj_form + npred_form + post
    return pre + subj_form + verb + npred_form + post

def generate_random_subj_npred() -> tuple[dict, dict]:
    subj = random.choice(SUBJECTS)
    subj_form, pers, nr = (subj[k] for k in ('Subj', 'Pers', 'Num'))
    npred = random.choice([n for n in NPREDS if (not n['Num'] or n['Num']==nr) and (
            n['Semantics'] != 'family' or subj['Semantics'] != n['Semantics']) and (
            not n['Pronoun'] or n['Pronoun'] == get_subj_pron(subj)
        )])
    return subj, npred

def generate_random_copulative_sentence(**kwargs : Unpack[SentenceOptions]) -> list[str]:
    subj, npred = generate_random_subj_npred()
    return generate_copulative_sentence(subj, npred, **kwargs)

def _cap(s: str) -> str:
    return s[0].upper() + s[1:]



class MakeQuestionSequence(QuestionSequenceFactory):
    CLASS_NAME = 'Statement to Question'
    def __init__(self, num_q : int = 5) -> None:
        self.num_q = num_q
        self.count = 0
    def get_next_question(self, previous_was_good : bool = True) -> QuestionData|None:
        if previous_was_good:
            self.count += 1
        if self.count > self.num_q:
            return None
        subj, npred = generate_random_subj_npred()
        statement = generate_copulative_sentence(subj, npred, affirm=True, split_words=False, short_answer=False, question=False)
        question = generate_copulative_sentence(subj, npred, affirm=True, split_words=False, short_answer=False, question=True)
        short_answer = generate_copulative_sentence(subj, npred, affirm=False, split_words=False, short_answer=True, question=False)
        short_answer[0] = _cap(short_answer[0])

        return QuestionData(prompt=f'{self.count}/{self.num_q} Form a question and a short negative answer from:\n "' + 
                _cap(' '.join(statement)) + '"',
                bankWords=[w for w in question + short_answer if not set(w).intersection(',?.!\n') ],
                slots= [w if set(w).intersection(',?.!\n') else "" for w in question + ["\n"] + short_answer],
                correct=question + short_answer)
    
def statement_to_question(sent : dict[str, str], **kwargs) -> QuestionData:
    split_words = kwargs.get('split_words')
    if not (prompt_intro := kwargs.get('prompt_intro')):
        prompt_intro = 'Form a question from the following statement:\n'
    sent_in_lists = {k:[v] if not split_words else v.split() for k,v in sent.items()}
    subj, cop, npred = (sent_in_lists[k] for k in ('Subject', 'Copula', 'NPred'))
    statement = _cap(' '.join(subj + cop + npred)) + '.'
    return QuestionData(prompt=prompt_intro+statement,
                        slots = [""] * len(cop) + [""] * len(subj) + [""] * len(npred) + ["?"],
                        bankWords=subj + cop + npred,
                        correct=cop + subj + npred + ["?"])


