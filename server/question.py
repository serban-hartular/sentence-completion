import dataclasses

@dataclasses.dataclass
class QuestionData:
    prompt: str
    slots: list[str]
    bankWords: list[str]
    correct: list[str]
    initialMovable: bool = False

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)
    

class QuestionSequenceFactory:
    CLASS_NAME = ''
    SCREEN_KIND = 'sentence'
    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        pass
    def get_pronounciations(self) -> dict:
        return {}
    def get_images(self) -> dict:
        return {}
