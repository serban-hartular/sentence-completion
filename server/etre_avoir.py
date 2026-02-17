from question import QuestionData, QuestionSequenceFactory

class EtreAvoir(QuestionSequenceFactory):
    CLASS_NAME = 'Les verbes "être" et "avoir"'

    questions = [QuestionData(
            prompt="Conjungă verbul 'être':",
            slots=["je", "", " ", "nous", "", "\n",
                   "tu", "", " ", "vous", "", "\n",
                   "il", "", " ", "ils", "",],
            bankWords=["suis", "es", "est", "sommes", "êtes", "sont"],
            correct=["je", "suis", " ", "nous", "sommes",
                   "tu", "es", " ", "vous", "êtes",
                   "il", "est", " ", "ils", "sont",],
        ),
        QuestionData(
            prompt="Conjungă verbul 'avoir':",
            slots=["j'", "", " ", "nous", "", "\n",
                   "tu", "", " ", "vous", "", "\n",
                   "il", "", " ", "ils", "",],
            bankWords=["ai", "as", "a", "avons", "avez", "ont"],
            correct=["j'", "ai", " ", "nous", "avons",
                   "tu", "as", " ", "vous", "avez",
                   "il", "a", " ", "ils", "ont",],
        )]

    def __init__(self) -> None:
        self.count = -1

    def get_next_question(self, previous_was_good: bool = True) -> QuestionData | None:
        if previous_was_good:
            self.count += 1
        if self.count >= len(EtreAvoir.questions):
            return None
        return EtreAvoir.questions[self.count] 
    
    def get_pronounciations(self) -> dict:
        return {
            'je' : '/assets/pron/fr/je.m4a',
            "j'" : '/assets/pron/fr/j.m4a',
            'tu' : '/assets/pron/fr/tu.m4a',
            'il' : '/assets/pron/fr/il.m4a',
            'nous' : '/assets/pron/fr/nous.m4a',
            'vous' : '/assets/pron/fr/vous.m4a',
            'ils' : '/assets/pron/fr/il.m4a',
            'suis' : '/assets/pron/fr/suis.m4a',
            'es' : '/assets/pron/fr/e.m4a',
            'est' : '/assets/pron/fr/e.m4a',
            'sommes' : '/assets/pron/fr/sommes.m4a',
            'êtes' : '/assets/pron/fr/etes.m4a',
            'sont' : '/assets/pron/fr/sont.m4a',
            'ai' : '/assets/pron/fr/ai.m4a',
            'as' : '/assets/pron/fr/a.m4a',
            'a' : '/assets/pron/fr/a.m4a',
            'avons' : '/assets/pron/fr/avons.m4a',
            'avez' : '/assets/pron/fr/avez.m4a',
            'ont' : '/assets/pron/fr/ont.m4a',   
        }