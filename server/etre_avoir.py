from sequences import QuestionData, QuestionSequenceFactory

class EtreAvoir(QuestionSequenceFactory):
    CLASS_NAME = 'FR: Les verbes "être" et "avoir"'
    COLOR = '#1111aa'

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

    def get_next_question(self, previous_was_good: bool = True) -> dict | None:
        if previous_was_good:
            self.count += 1
        if self.count >= len(EtreAvoir.questions):
            return None
        return EtreAvoir.questions[self.count].to_dict()
    
    def get_pronounciations(self) -> dict:
        return {
            'je' : '/pron/fr/je.m4a',
            "j'" : '/pron/fr/j.m4a',
            'tu' : '/pron/fr/tu.m4a',
            'il' : '/pron/fr/il.m4a',
            'nous' : '/pron/fr/nous.m4a',
            'vous' : '/pron/fr/vous.m4a',
            'ils' : '/pron/fr/il.m4a',
            'suis' : '/pron/fr/suis.m4a',
            'es' : '/pron/fr/e.m4a',
            'est' : '/pron/fr/e.m4a',
            'sommes' : '/pron/fr/sommes.m4a',
            'êtes' : '/pron/fr/etes.m4a',
            'sont' : '/pron/fr/sont.m4a',
            'ai' : '/pron/fr/e.m4a',
            'as' : '/pron/fr/a.m4a',
            'a' : '/pron/fr/a.m4a',
            'avons' : '/pron/fr/avons.m4a',
            'avez' : '/pron/fr/avez.m4a',
            'ont' : '/pron/fr/ont.m4a',   
        }
    
class Numeros(QuestionSequenceFactory):
    CLASS_NAME = 'FR: Les nombres de 1 à 12'
    NOMBRES = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
             'dix', 'onze', 'douze']
    COLOR = '#1111aa'

    questions = [
        QuestionData(
            prompt="Numerele de la 1 la 6 în franceză:",
            slots=[str(i) for i in range(1,7)] + ["\n"] + [""]*6,
            bankWords=NOMBRES[:6],
            correct=[str(i) for i in range(1,7)] + NOMBRES[:6],
        ),
        QuestionData(
            prompt="Numerele de la 7 la 12 în franceză:",
            slots=[str(i) for i in range(7,13)] + ["\n"] + [""]*6,
            bankWords=NOMBRES[6:12],
            correct=[str(i) for i in range(7,13)] + NOMBRES[6:12],
        ),]
    def get_pronounciations(self) -> dict:
        return {
            k : f'/pron/fr/{k}.m4a' for k in Numeros.NOMBRES
        }
    def __init__(self) -> None:
        self.count = -1

    def get_next_question(self, previous_was_good: bool = True) -> dict | None:
        if previous_was_good:
            self.count += 1
        if self.count >= len(Numeros.questions):
            return None
        return Numeros.questions[self.count].to_dict()
